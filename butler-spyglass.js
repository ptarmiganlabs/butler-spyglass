const config = require('config');
const fs = require('fs-extra');
const Queue = require('better-queue');
const upath = require('upath');

// Load our own code
const { appExtractMetadata, resetExtractedAppCount } = require('./src/extract_app');
const { getDataConnections } = require('./src/get_dataconnection');
const { logger, getLoggingLevel } = require('./src/logger');
const { getAppsToProcess } = require('./src/qrs');

// Get app version from package.json file
const appVersion = require('./package.json').version;
const appName = require('./package.json').name;

// Are we running as standalone app or not?
const isPkg = typeof process.pkg !== 'undefined';
const execPath = isPkg ? upath.dirname(process.execPath) : __dirname;

logger.info(`--------------------------------------`);
logger.info(`| ${appName}`);
logger.info(`|  `);
logger.info(`| Version    : ${appVersion}`);
logger.info(`| Log level  : ${getLoggingLevel()}`);
logger.info(`|  `);
logger.info(`--------------------------------------`);
logger.info(``);
logger.info(`Extracting metadata from server: ${config.get('ButlerSpyglass.configEngine.host')}`);
if (config.get('ButlerSpyglass.lineageExtract.enable') === true) {
    logger.info(`Data linage files will be stored in                : ${config.get('ButlerSpyglass.lineageExtract.exportDir')}`);
}
if (config.get('ButlerSpyglass.scriptExtract.enable')) {
    logger.info(`Load script files will be stored in                : ${config.get('ButlerSpyglass.scriptExtract.exportDir')}`);
}
if (config.get('ButlerSpyglass.dataConnectionExtract.enable')) {
    logger.info(`Data connection definitions files will be stored in: ${config.get('ButlerSpyglass.dataConnectionExtract.exportDir')}`);
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
        const newLocal = appExtractMetadata(_self, q, taskItem, cb);

        // cb();
    },
    {
        concurrent: config.get('ButlerSpyglass.extract.concurrentTasks'), // Number of tasks to process in parallel
        maxTimeout: config.get('ButlerSpyglass.extract.itemTimeout'), // Max time allowed for each app extract, before timeout error is thrown
        afterProcessDelay: config.get('ButlerSpyglass.extract.itemInterval'), // Delay between each task
        filo: true,
    }
);

// var qRetry = new Queue(async function (taskItemRetry, cbRetry) {
//     logger.debug(`Retrying app ${taskItemRetry.qDocId} <<>> ${taskItemRetry.qTitle}`);

//     let _selfRetry = this;
//     const newLocalRetry =
// })

// Define function to be scheduled
const scheduledExtract = async function scheduledExtract() {
    // Write separator to separate this run from the previous one
    logger.info(`--------------------------------------`);
    logger.info(`Extraction run started`);

    // Empty output folders
    fs.emptyDirSync(upath.resolve(upath.normalize(`${config.get('ButlerSpyglass.lineageExtract.exportDir')}/`)));
    fs.emptyDirSync(upath.resolve(upath.normalize(`${config.get('ButlerSpyglass.scriptExtract.exportDir')}/`)));
    fs.emptyDirSync(upath.resolve(upath.normalize(`${config.get('ButlerSpyglass.dataConnectionExtract.exportDir')}/`)));

    // Get data connections
    if (config.get('ButlerSpyglass.dataConnectionExtract.enable') === true) {
        await getDataConnections(execPath);
    }

    // Create list of apps for which lineage and/or load scripts should be extracted.
    // If at least one filter is specified in the config file that filter will be used.
    // If no filters are specified all apps that the user has access to will be processed.

    const appsToProcess = await getAppsToProcess(logger, config, execPath);

    logger.info(`Number of apps that will be processed: ${appsToProcess.length}`);
    logger.silly(`Apps on this server that will be processed: ${JSON.stringify(appsToProcess, null, 2)}`);

    // Reset # processed apps to zero
    resetExtractedAppCount();

    // eslint-disable-next-line no-restricted-syntax
    // Send tasks to queue
    appsToProcess.forEach((element) => {
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
    if (config.get('ButlerSpyglass.extract.enableScheduledExecution')) {
        logger.info(`Waiting ${config.get('ButlerSpyglass.extract.frequency') / 1000} seconds until next extraction run`);
        setTimeout(scheduledExtract, config.get('ButlerSpyglass.extract.frequency'));
    } else {
        logger.info(`All done - exiting.`);
        process.exit(0);
    }
});

// Kick off first extract. Following extracts will be triggered from within the scheduledExtract() function
scheduledExtract();
