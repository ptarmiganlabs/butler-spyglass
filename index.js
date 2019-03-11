var config = require('config');
var winston = require('winston');
var fs = require('fs-extra');
var Queue = require('better-queue');
const enigma = require('enigma.js');
const WebSocket = require('ws');
const path = require('path');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

var lineageFileWriter;

// Get app version from package.json file
var appVersion = require('./package.json').version;
var appName = require('./package.json').name;



// Set up logger with timestamps and colors
const logTransports = {
    console: new winston.transports.Console({
        name: 'console_log',
        level: config.get('ButlerSpyglass.logLevel'),
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
        )
    })
};


const logger = winston.createLogger({
    transports: [
        logTransports.console
    ],
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    )
});


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


// Set up variable holding lineage data
var lineageExtracted = [];

// Set up variable holding scripts
var scriptExtracted = [];

// Keep track of how many apps have been processed in current extraction run
var processedApps = 0;

logger.info(`--------------------------------------`);
logger.info(`Starting ${appName}`);
logger.info(`App version is: ${appVersion}`);
logger.info(`Log level is: ${logTransports.console.level}`);
logger.info(`--------------------------------------`);

// Log info about what Qlik Sense certificates are being used
logger.debug(`Engine client cert: ${config.get('ButlerSpyglass.configEngine.cert')}`);
logger.debug(`Engine client cert key: ${config.get('ButlerSpyglass.configEngine.key')}`);
logger.debug(`Engine CA cert: ${config.get('ButlerSpyglass.configEngine.ca')}`);



// Set up task queue
var q = new Queue(async function (taskItem, cb) {
    logger.debug(`Dumping app: ${taskItem.qDocId} <<>> ${taskItem.qTitle}`);


    lineageFileWriter = createCsvWriter({
        path: path.resolve(path.normalize(config.get('ButlerSpyglass.lineage.lineageFolder') + '/lineage.csv')),
        header: [{
                id: 'appId',
                title: 'AppId'
            },
            {
                id: 'discriminator',
                title: 'Discriminator'
            },
            {
                id: 'statement',
                title: 'Statement'
            }
        ],
        append: false
    });

    // Increase counter of # processed apps in this extraction run
    processedApps++;

    // Get queue stats
    var queueStats = q.getStats();
    logger.verbose(`Extracting metadata (#${processedApps}, overall success rate ${100*queueStats.successRate}%): ${taskItem.qDocId} <<>> ${taskItem.qTitle}`);

    // create a new session
    const configEnigma = {
        schema: qixSchema,
        url: `wss://${configEngine.host}:${configEngine.port}`,
        createSocket: url => new WebSocket(url, {
            ca: [configEngine.ca],
            key: configEngine.key,
            cert: configEngine.cert,
            headers: {
                'X-Qlik-User': config.get('ButlerSpyglass.configEngine.headers.X-Qlik-User')
            },
            rejectUnauthorized: false
        }),
    };

    const session = enigma.create(configEnigma);

    try {
        global = await session.open();
    } catch (err) {
        logger.error('enigmaOpen error: ' + JSON.stringify(err));
        return;
    }

    // We can now interact with the global object
    // Please refer to the Engine API documentation for available methods.

    const g = global;

    let app;


    try {
        app = await g.openDoc(taskItem.qDocId, '', '', '', true);
        logger.debug('openDoc success for appId: ' + taskItem.qDocId);
    } catch (err) {
        // if (err.code == 1002) {
        //     // Already open

        // }
        logger.error('openDoc error: ' + JSON.stringify(err));
        cb();
        return;
    };

    if (config.get('ButlerSpyglass.lineage.enableLineageExtract') == true) {

        try {
            lineage = await app.getLineage();
            logger.debug('getLineage success for appId: ' + taskItem.qDocId);
            logger.debug(JSON.stringify(lineage, null, 2));

            // Store lineage in array for later writing to disk
            lineageExtracted.push(lineage);

            lineage.forEach(element => {
                lineageExtracted.push({
                    appId: taskItem.qDocId,
                    discriminator: element.qDiscriminator,
                    statement: element.qStatement
                })
            });

        } catch (err) {
            logger.error('getLineage error: ' + JSON.stringify(err));
            cb();
            return;
        };
    }

    if (config.get('ButlerSpyglass.script.enableScriptExtract') == true) {
        try {
            script = await app.getScript()
            logger.debug('getScript success for appId: ' + taskItem.qDocId);
            logger.silly(script);

            // Store script in array for later writing to disk
            scriptExtracted.push({
                appId: taskItem.qDocId,
                script: script
            });

        } catch (err) {
            logger.error('getScript error: ' + JSON.stringify(err));
            cb();
            return;
        }
    }

    try {
        session.close();
    } catch (ex) {
        logger.error(`Error when closing session: ${ex}`);
    }

    cb();
}, {
    concurrent: 1, // Process one task at a time
    maxTimeout: config.get('ButlerSpyglass.extractItemTimeout'), // Max time allowed for each app extract, before timeout error is thrown
    afterProcessDelay: config.get('ButlerSpyglass.extractItemInterval') // Delay between each task
});



q.on('task_finish', function (taskId, result) {
    // Handle finished result
    logger.debug(`Task finished: ${taskId} with result ${result}`);
});

q.on('task_failed', function (taskId, errorMessage) {
    // Handle error
    logger.error(`Task error: ${taskId} with error ${errorMessage}`);
})

// q.on('task_progress', function (taskId, completed, total) {
//     // Handle task progress
//     logger.debug(`========== Task progress: ${taskId}, ${completed}/${total} done`);
// });

// Fires when queue is empty and all tasks have finished. 
// I.e. when all data in an extraction run is available and can be written to disk.
q.on('drain', () => {

    if (config.get('ButlerSpyglass.lineage.enableLineageExtract') == true) {
        // Save lineage info to disk file
        lineageFileWriter
            .writeRecords(lineageExtracted)
            .then(() => {
                logger.info(`Done writing ${lineageExtracted.length} lineage records to disk file`);
            })
            .catch((error) => {
                logger.error('Failed to write lineage info to disk (make sure the output directory exists!): ', error);
                process.exit(1);
            });
    }

    if (config.get('ButlerSpyglass.script.enableScriptExtract') == true) {
        // Save scripts to disk files (one file per app). Sync writing to keep things simple.
        try {
            scriptExtracted.forEach(element => {
                fs.writeFileSync(
                    path.resolve(path.normalize(config.get('ButlerSpyglass.script.scriptFolder') + '/' + element.appId + '.qvs')),
                    element.script
                );
            });
            logger.info(`Done writing ${scriptExtracted.length} script files to disk`);
        } catch (ex) {
            logger.error(`Error when writing scripts to disk (app id=${element.appId}): ${ex}`);
        }
    }
});


// Define function to be scheduled
var scheduledExtract = function () {
    // Write separator to separate this run from the previous one
    logger.info(`--------------------------------------`);
    logger.info(`Script extraction run started`);


    lineageExtracted = [];

    // Set up variable holding scripts
    scriptExtracted = [];


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
                    logger.silly(`Apps on this Engine that the configured user can open: ${JSON.stringify(list, null, 2)}`);
                    logger.info(`Number of apps on server: ${list.length}`);

                    // Reset variable keeping track of # processed apps
                    processedApps = 0;

                    // Send tasks to queue
                    list.forEach(element => {
                        q.push(element)
                    });

                    q.on('progress', function (progress) {
                        // logger.verbose(`========== Task progress: ${taskId}, ${completed}/${total} done`);
                        logger.verbose(`========== Task progress: ${progress}`);
                        // progress.eta - human readable string estimating time remaining
                        // progress.pct - % complete (out of 100)
                        // progress.complete - # completed so far
                        // progress.total - # for completion
                        // progress.message - status message
                      })

                })

                .then(() => {
                    try {
                        sessionAppList.close();
                    } catch (ex) {
                        logger.error(`Error when closing sessionAppList: ${ex}`);
                    }
                })
        }).catch((error) => {
            logger.error('Failed to open session and/or retrieve the app list:', error);
            process.exit(1);
        });


    // Start next extract after configured time period
    setTimeout(scheduledExtract, config.get('ButlerSpyglass.extractFrequency'));
};

// Kick off first extract. Following extracts will be triggered from within the scheduledExtract() function
scheduledExtract();
