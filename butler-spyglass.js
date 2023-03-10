const config = require('config');
const fs = require('fs-extra');
const Queue = require('better-queue');
const enigma = require('enigma.js');
const WebSocket = require('ws');
const upath = require('upath');

// Load our own code
const extractApp = require('./src/extract_app');
const { getDataConnections } = require('./src/get_dataconnection');
const { logger, getLoggingLevel } = require('./src/logger');

// Get app version from package.json file
const appVersion = require('./package.json').version;
const appName = require('./package.json').name;

// Are we running as standalone app or not?
const isPkg = typeof process.pkg !== 'undefined';
const execPath = isPkg ? upath.dirname(process.execPath) : __dirname;

// Helper function to read the contents of the certificate files:
const readCert = (filename) => fs.readFileSync(filename);

//  Engine config
const configEngine = {
    engineVersion: config.get('ButlerSpyglass.configEngine.engineVersion'),
    host: config.get('ButlerSpyglass.configEngine.server'),
    port: config.get('ButlerSpyglass.configEngine.serverPort'),
    isSecure: config.get('ButlerSpyglass.configEngine.useSSL'),
    headers: config.get('ButlerSpyglass.configEngine.headers'),
    ca: readCert(config.get('ButlerSpyglass.cert.clientCertCA')),
    cert: readCert(config.get('ButlerSpyglass.cert.clientCert')),
    key: readCert(config.get('ButlerSpyglass.cert.clientCertKey')),
    rejectUnauthorized: config.get('ButlerSpyglass.configEngine.rejectUnauthorized'),
};

// Set up enigma.js configuration
// eslint-disable-next-line import/no-dynamic-require
const qixSchema = require(`enigma.js/schemas/${configEngine.engineVersion}`);

logger.info(`--------------------------------------`);
logger.info(`| ${appName}`);
logger.info(`|  `);
logger.info(`| Version    : ${appVersion}`);
logger.info(`| Log level  : ${getLoggingLevel()}`);
logger.info(`|  `);
logger.info(`--------------------------------------`);
logger.info(``);
logger.info(`Extracting metadata from server: ${config.get('ButlerSpyglass.configEngine.server')}`);
if (config.get('ButlerSpyglass.lineage.enableLineageExtract') === true) {
    logger.info(`Data linage files will be stored in                : ${config.get('ButlerSpyglass.lineage.exportDir')}`);
}
if (config.get('ButlerSpyglass.script.enableScriptExtract')) {
    logger.info(`Load script files will be stored in                : ${config.get('ButlerSpyglass.script.exportDir')}`);
}
if (config.get('ButlerSpyglass.dataconnection.enableDataConnectionExtract')) {
    logger.info(`Data connection definitions files will be stored in: ${config.get('ButlerSpyglass.dataconnection.exportDir')}`);
}
logger.verbose(``);
logger.verbose(`Butler Spyglass was started from ${execPath}`);
logger.verbose(`Butler Spyglass was started as a stand-alone binary: ${isPkg}`);
logger.verbose(``);
logger.debug(`Options: ${JSON.stringify(config, null, 2)}`);
logger.debug(``);

// Log info about what Qlik Sense certificates are being used
logger.debug(`Engine client cert: ${config.get('ButlerSpyglass.cert.clientCert')}`);
logger.debug(`Engine client cert key: ${config.get('ButlerSpyglass.cert.clientCertKey')}`);
logger.debug(`Engine CA cert: ${config.get('ButlerSpyglass.cert.clientCertCA')}`);

// Set up task queue
const q = new Queue(
    async function dumpApp(taskItem, cb) {
        logger.debug(`Dumping app: ${taskItem.qDocId} <<>> ${taskItem.qTitle}`);

        // eslint-disable-next-line no-underscore-dangle
        const _self = this;
        const newLocal = extractApp.appExtractMetadata(_self, q, taskItem, cb);

        // cb();
    },
    {
        concurrent: config.get('ButlerSpyglass.concurrentTasks'), // Number of tasks to process in parallel
        maxTimeout: config.get('ButlerSpyglass.extractItemTimeout'), // Max time allowed for each app extract, before timeout error is thrown
        afterProcessDelay: config.get('ButlerSpyglass.extractItemInterval'), // Delay between each task
        filo: true,
    }
);

// var qRetry = new Queue(async function (taskItemRetry, cbRetry) {
//     logger.debug(`Retrying app ${taskItemRetry.qDocId} <<>> ${taskItemRetry.qTitle}`);

//     let _selfRetry = this;
//     const newLocalRetry =
// })

// Define function to be scheduled
const scheduledExtract = function scheduledExtract() {
    // Write separator to separate this run from the previous one
    logger.info(`--------------------------------------`);
    logger.info(`Extraction run started`);

    // Get data connections
    if (config.get('ButlerSpyglass.dataconnection.enableDataConnectionExtract') === true) {
        getDataConnections();
    }

    // Empty output folders
    fs.emptyDirSync(upath.resolve(upath.normalize(`${config.get('ButlerSpyglass.lineage.exportDir')}/`)));
    fs.emptyDirSync(upath.resolve(upath.normalize(`${config.get('ButlerSpyglass.script.exportDir')}/`)));
    fs.emptyDirSync(upath.resolve(upath.normalize(`${config.get('ButlerSpyglass.dataconnection.exportDir')}/`)));

    // create a new session
    const configEnigma = {
        schema: qixSchema,
        url: `wss://${configEngine.host}:${configEngine.port}`,
        createSocket: (url) =>
            new WebSocket(url, {
                ca: [configEngine.ca],
                key: configEngine.key,
                cert: configEngine.cert,
                headers: {
                    'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository',
                },
                rejectUnauthorized: false,
            }),
    };

    const sessionAppList = enigma.create(configEnigma);

    sessionAppList
        .open()
        .then((global) => {
            // We can now interact with the global object, for example get the document list.
            global
                .getDocList()
                .then((list) => {
                    logger.silly(`Apps on this Engine that the configured user can open: ${JSON.stringify(list, null, 2)}`);
                    logger.info(`Number of apps on server: ${list.length}`);

                    // Reset # processed apps to zero
                    extractApp.resetExtractedAppCount();

                    // Send tasks to queue
                    list.forEach((element) => {
                        q.push(element).on('failed', (err) => {
                            // Task failed!
                            logger.error(`Task FAILED: ${err}`);
                        });
                    });

                    q.on('progress', (progress) => {
                        // logger.verbose(`========== Task progress: ${taskId}, ${completed}/${total} done`);
                        logger.verbose(`========== Task progress: ${progress}`);
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
                        logger.error(`Error when closing sessionAppList: ${ex}`);
                    }
                });
        })
        .catch((error) => {
            logger.error('Failed to open session and/or retrieve the app list:', error);
            process.exit(1);
        });
};

q.on('task_finish', (taskId, result) => {
    // Handle finished result
    logger.debug(`Task finished: ${taskId} with result ${result}`);
});

q.on('task_failed', (taskId, errorMessage, stats) => {
    // Handle error
    logger.error(`Task failed: ${taskId} with error ${errorMessage}, stats=${JSON.stringify(stats, null, 2)}`);
});

// q.on('task_progress', function (taskId, completed, total) {
//     // Handle task progress
//     logger.debug(`========== Task progress: ${taskId}, ${completed}/${total} done`);
// });

// Fires when queue is empty and all tasks have finished.
// I.e. when all data in an extraction run is available and can be written to disk.
q.on('drain', () => {
    logger.info(`Done writing lineage data, script files and data connections to disk`);

    // Schedule next extraction run after configured time period
    // Only do this if enable in the config file though!
    if (config.get('ButlerSpyglass.enableScheduledExecution')) {
        logger.info(`Waiting ${config.get('ButlerSpyglass.extractFrequency') / 1000} seconds until next extraction run`);
        setTimeout(scheduledExtract, config.get('ButlerSpyglass.extractFrequency'));
    } else {
        logger.info(`All done - exiting.`);
        process.exit(0);
    }
});

// Kick off first extract. Following extracts will be triggered from within the scheduledExtract() function
scheduledExtract();
