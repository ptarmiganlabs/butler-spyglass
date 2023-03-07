var config = require('config');
var fs = require('fs-extra');
var Queue = require('better-queue');
const enigma = require('enigma.js');
const WebSocket = require('ws');
const path = require('path');


// Load our own code
const extractApp = require('./src/extract_app.js');
const logger = require('./src/logger.js');

// Get app version from package.json file
var appVersion = require('./package.json').version;
var appName = require('./package.json').name;


// Helper function to read the contents of the certificate files:
// const readCert = filename => fs.readFileSync(path.resolve(__dirname, certificatesPath, filename));
const readCert = filename => fs.readFileSync(filename);


//  Engine config
var configEngine = {
    engineVersion: config.get('ButlerSpyglass.configEngine.engineVersion'),
    host: config.get('ButlerSpyglass.configEngine.server'),
    port: config.get('ButlerSpyglass.configEngine.serverPort'),
    isSecure: config.get('ButlerSpyglass.configEngine.isSecure'),
    headers: config.get('ButlerSpyglass.configEngine.headers'),
    ca: readCert(config.get('ButlerSpyglass.configEngine.ca')),
    cert: readCert(config.get('ButlerSpyglass.configEngine.cert')),
    key: readCert(config.get('ButlerSpyglass.configEngine.key')),
    rejectUnauthorized: config.get('ButlerSpyglass.configEngine.rejectUnauthorized')
};

// Set up enigma.js configuration
const qixSchema = require('enigma.js/schemas/' + configEngine.engineVersion);

logger.logger.info(`--------------------------------------`);
logger.logger.info(`Starting ${appName}`);
logger.logger.info(`App version is: ${appVersion}`);
logger.logger.info(`Log level is: ${logger.getLoggingLevel()}`);
logger.logger.info(`Extracting metadata from server: ${config.get('ButlerSpyglass.configEngine.server')}`);
logger.logger.info(`--------------------------------------`);

// Log info about what Qlik Sense certificates are being used
logger.logger.debug(`Engine client cert: ${config.get('ButlerSpyglass.configEngine.cert')}`);
logger.logger.debug(`Engine client cert key: ${config.get('ButlerSpyglass.configEngine.key')}`);
logger.logger.debug(`Engine CA cert: ${config.get('ButlerSpyglass.configEngine.ca')}`);



// Set up task queue
var q = new Queue(async function (taskItem, cb) {
    logger.logger.debug(`Dumping app: ${taskItem.qDocId} <<>> ${taskItem.qTitle}`);

    let _self = this;
    const newLocal = extractApp.appExtractMetadata(_self, q, taskItem, cb);

    // cb();
}, {
    concurrent: config.get('ButlerSpyglass.concurrentTasks'), // Number of tasks to process in parallel
    maxTimeout: config.get('ButlerSpyglass.extractItemTimeout'), // Max time allowed for each app extract, before timeout error is thrown
    afterProcessDelay: config.get('ButlerSpyglass.extractItemInterval'), // Delay between each task
    filo: true 
});

// var qRetry = new Queue(async function (taskItemRetry, cbRetry) {
//     logger.logger.debug(`Retrying app ${taskItemRetry.qDocId} <<>> ${taskItemRetry.qTitle}`);

//     let _selfRetry = this;
//     const newLocalRetry = 
// })

q.on('task_finish', function (taskId, result) {
    // Handle finished result
    logger.logger.debug(`Task finished: ${taskId} with result ${result}`);
});

q.on('task_failed', function (taskId, errorMessage, stats) {
    // Handle error
    logger.logger.error(`Task failed: ${taskId} with error ${errorMessage}, stats=${JSON.stringify(stats, null, 2)}`);
});

// q.on('task_progress', function (taskId, completed, total) {
//     // Handle task progress
//     logger.logger.debug(`========== Task progress: ${taskId}, ${completed}/${total} done`);
// });

// Fires when queue is empty and all tasks have finished. 
// I.e. when all data in an extraction run is available and can be written to disk.
q.on('drain', () => {
    logger.logger.info(`Done writing lineage data and script files to disk`);

    // Schedule next extraction run after configured time period
    // Only do this if enable in the config file though!
    if (config.get('ButlerSpyglass.enableScheduledExecution')) {
        logger.logger.info(`Waiting ${config.get('ButlerSpyglass.extractFrequency')/1000} seconds until next extraction run`);
        setTimeout(scheduledExtract, config.get('ButlerSpyglass.extractFrequency'));
    } else {
        logger.logger.info(`All done - exiting.`);
        process.exit(0);
    }
});


// Define function to be scheduled
var scheduledExtract = function () {
    // Write separator to separate this run from the previous one
    logger.logger.info(`--------------------------------------`);
    logger.logger.info(`Script extraction run started`);

    // Empty output folders
    fs.emptyDirSync(path.resolve(path.normalize(config.get('ButlerSpyglass.lineage.lineageFolder') + '/')));
    fs.emptyDirSync(path.resolve(path.normalize(config.get('ButlerSpyglass.script.scriptFolder') + '/')));


    // create a new session
    const configEnigma = {
        schema: qixSchema,
        url: `wss://${configEngine.host}:${configEngine.port}`,
        createSocket: url => new WebSocket(url, {
            ca: [configEngine.ca],
            key: configEngine.key,
            cert: configEngine.cert,
            headers: {
                'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository'
            },
            rejectUnauthorized: false
        }),
    };

    const sessionAppList = enigma.create(configEnigma);

    sessionAppList
        .open()
        .then(global => {

            // We can now interact with the global object, for example get the document list.
            global.getDocList()
                .then(list => {
                    logger.logger.silly(`Apps on this Engine that the configured user can open: ${JSON.stringify(list, null, 2)}`);
                    logger.logger.info(`Number of apps on server: ${list.length}`);

                    // Reset # processed apps to zero
                    extractApp.resetExtractedAppCount();

                    // Send tasks to queue
                    list.forEach(element => {
                        q.push(element)
                            .on('failed', function (err) {
                                logger.logger.error('Task FAILED =====' + err);
                                // Task failed!
                            });
                    });

                    q.on('progress', function (progress) {
                        // logger.logger.verbose(`========== Task progress: ${taskId}, ${completed}/${total} done`);
                        logger.logger.verbose(`========== Task progress: ${progress}`);
                        // progress.eta - human readable string estimating time remaining
                        // progress.pct - % complete (out of 100)
                        // progress.complete - # completed so far
                        // progress.total - # for completion
                        // progress.message - status message
                    });

                })

                .then(() => {
                    try {
                        sessionAppList.close();
                    } catch (ex) {
                        logger.logger.error(`Error when closing sessionAppList: ${ex}`);
                    }
                });
        }).catch((error) => {
            logger.logger.error('Failed to open session and/or retrieve the app list:', error);
            process.exit(1);
        });

};

// Kick off first extract. Following extracts will be triggered from within the scheduledExtract() function
scheduledExtract();