const fs = require('fs-extra');
const enigma = require('enigma.js');
const WebSocket = require('ws');
const config = require('config');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Load our own code
const logger = require('./logger');

let processedApps = 0;

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

// -------------
// Exports
// -------------
module.exports.resetExtractedAppCount = () => {
    processedApps = 0;
};

module.exports.appExtractMetadata = async function appExtractMetadata(worker, queue, appToExtract, cb) {
    // const lineageFileWriter = createCsvWriter({
    //     path: path.resolve(
    //         path.normalize(`${config.get('ButlerSpyglass.lineage.exportDir')}/lineage.csv`)
    //     ),
    //     header: [
    //         {
    //             id: 'appId',
    //             title: 'AppId',
    //         },
    //         {
    //             id: 'discriminator',
    //             title: 'Discriminator',
    //         },
    //         {
    //             id: 'statement',
    //             title: 'Statement',
    //         },
    //     ],
    //     append: false,
    // });

    // Increase counter of # processed apps in this extraction run
    processedApps += 1;

    // Get queue stats
    const queueStats = queue.getStats();
    logger.logger.info(
        `Extracting metadata (#${processedApps}, overall success rate ${100 * queueStats.successRate}%): ${appToExtract.qDocId} <<>> ${
            appToExtract.qTitle
        }`
    );

    // Create a new session
    const configEnigma = {
        schema: qixSchema,
        url: `wss://${configEngine.host}:${configEngine.port}/app/${appToExtract.qDocId}`,
        createSocket: (url) =>
            new WebSocket(url, {
                ca: [configEngine.ca],
                key: configEngine.key,
                cert: configEngine.cert,
                headers: configEngine.headers,
                rejectUnauthorized: configEngine.rejectUnauthorized,
            }),
        protocol: {
            delta: false,
        },
    };

    const session = enigma.create(configEnigma);
    let global;

    try {
        global = await session.open();
    } catch (err) {
        logger.logger.error(`enigmaOpen error (app ID=${appToExtract.qDocId}): ${JSON.stringify(err)}`);

        cb(err);
        return;
    }

    // We can now interact with the global object
    // Please refer to the Engine API documentation for available methods.
    let app;

    try {
        app = await global.openDoc(appToExtract.qDocId, '', '', '', true);
        logger.logger.debug(`openDoc success for appId: ${appToExtract.qDocId}`);
    } catch (err) {
        logger.logger.error(`openDoc error (app ID=${appToExtract.qDocId}): ${JSON.stringify(err)}`);

        session.close();
        cb(err);
        return;
    }

    if (config.get('ButlerSpyglass.lineage.enableLineageExtract') === true) {
        try {
            const lineageCurrentApp = [];

            const lineage = await app.getLineage();
            logger.logger.debug(`getLineage success for appId: ${appToExtract.qDocId}`);
            logger.logger.debug(JSON.stringify(lineage, null, 2));

            // Create CSV write for storing current app's lineage to disk
            const lineageCurrentAppWriter = createCsvWriter({
                path: path.resolve(path.normalize(`${config.get('ButlerSpyglass.lineage.exportDir')}/${appToExtract.qDocId}.csv`)),
                header: [
                    {
                        id: 'appId',
                        title: 'AppId',
                    },
                    {
                        id: 'appName',
                        title: 'AppName',
                    },
                    {
                        id: 'discriminator',
                        title: 'Discriminator',
                    },
                    {
                        id: 'statement',
                        title: 'Statement',
                    },
                ],
                append: false,
            });

            // If there is no lineage info for an app, we should still write appId and appName to the CSV/JSON file
            if (lineage.length === 0) {
                lineageCurrentApp.push({
                    appId: appToExtract.qDocId,
                    appName: appToExtract.qDocName,
                });
            } else {
                lineage.forEach((element) => {
                    const el = element;
                    if (el.qStatement === undefined) el.qStatement = '';
                    if (el.qDiscriminator === undefined) el.qDiscriminator = '';

                    // Push lineage for current app into its own array, for immediate storage on disk
                    // Only extract first x characters of the discriminator and statement data, as specified in the config file.
                    lineageCurrentApp.push({
                        appId: appToExtract.qDocId,
                        appName: appToExtract.qDocName,
                        discriminator: el.qDiscriminator.substring(0, config.get('ButlerSpyglass.lineage.maxLengthDiscriminator')),
                        statement: el.qStatement.substring(0, config.get('ButlerSpyglass.lineage.maxLengthStatement')),
                    });
                });
            }

            // Save lineage info to disk files
            // First CSV
            lineageCurrentAppWriter
                .writeRecords(lineageCurrentApp)
                .then(() => {
                    logger.logger.verbose(
                        `Done writing ${lineageCurrentApp.length} lineage records for app ID ${appToExtract.qDocId} to CSV disk file`
                    );
                })
                .catch((error) => {
                    logger.logger.error(
                        `Failed to write lineage info to CSV file on disk for app ID ${appToExtract.qDocId} (make sure the output directory exists!): ${error}`
                    );
                    process.exit(1);
                });

            // Then as JSON
            try {
                fs.writeFileSync(
                    path.resolve(path.normalize(`${config.get('ButlerSpyglass.lineage.exportDir')}/${appToExtract.qDocId}.json`)),
                    JSON.stringify(lineageCurrentApp, 0, 2)
                );
                logger.logger.verbose(`Done writing script for app ID ${appToExtract.qDocId} to disk`);
            } catch (err) {
                logger.logger.error(
                    `Failed to write lineage info to JSON file on disk for app ID ${appToExtract.qDocId} (make sure the output directory exists!): ${err}`
                );
                process.exit(2);
            }
        } catch (err) {
            logger.logger.error(`getLineage error (app ID=${appToExtract.qDocId}): ${JSON.stringify(err)}`);

            session.close();
            cb(err);
            return;
        }
    }

    if (config.get('ButlerSpyglass.script.enableScriptExtract') === true) {
        try {
            const script = await app.getScript();
            logger.logger.debug(`getScript success for appId: ${appToExtract.qDocId}`);
            logger.logger.silly(script);

            // Save current app's script to disk file. Sync writing to keep things simple.
            try {
                fs.writeFileSync(
                    path.resolve(path.normalize(`${config.get('ButlerSpyglass.script.exportDir')}/${appToExtract.qDocId}.qvs`)),
                    script
                );
                logger.logger.verbose(`Done writing script for app ID ${appToExtract.qDocId} to disk`);
            } catch (err) {
                logger.logger.error(`Error when writing script for app ID ${appToExtract.qDocId} to disk: ${err}`);
                session.close();
                cb(err);
                return;
            }
        } catch (err) {
            session.close();
            logger.logger.error(`getScript error (app ID=${appToExtract.qDocId}): ${JSON.stringify(err)}`);
            session.close();

            cb(err);
            return;
        }
    }

    try {
        session.close();

        cb();
    } catch (err) {
        logger.logger.error(`Error when closing session (app ID=${appToExtract.qDocId}): ${err}`);

        cb(err);
    }
};
