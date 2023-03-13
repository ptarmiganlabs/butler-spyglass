const fs = require('fs-extra');
const enigma = require('enigma.js');
const WebSocket = require('ws');
const config = require('config');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Load our own code
const { logger } = require('./logger');

let processedApps = 0;

// Helper function to read the contents of the certificate files:
const readCert = (filename) => fs.readFileSync(filename);

//  Engine config
const configEngine = {
    engineVersion: config.get('ButlerSpyglass.configEngine.engineVersion'),
    host: config.get('ButlerSpyglass.configEngine.host'),
    port: config.get('ButlerSpyglass.configEngine.port'),
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
    // Increase counter of # processed apps in this extraction run
    processedApps += 1;

    // Get queue stats
    const queueStats = queue.getStats();
    logger.info(
        `Extracting metadata (#${processedApps}, overall success rate ${100 * queueStats.successRate}%): ${appToExtract.id} <<>> ${
            appToExtract.name
        }`
    );

    // Create a new session
    const configEnigma = {
        schema: qixSchema,
        url: `wss://${configEngine.host}:${configEngine.port}/app/${appToExtract.id}`,
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
        logger.error(`enigmaOpen error (app ID=${appToExtract.id}): ${JSON.stringify(err)}`);

        cb(err);
        return;
    }

    // We can now interact with the global object
    // Please refer to the Engine API documentation for available methods.
    let app;

    try {
        app = await global.openDoc(appToExtract.id, '', '', '', true);
        logger.debug(`openDoc success for appId: ${appToExtract.id}`);
    } catch (err) {
        logger.error(`openDoc error (app ID=${appToExtract.id}): ${JSON.stringify(err)}`);

        session.close();
        cb(err);
        return;
    }

    if (config.get('ButlerSpyglass.lineageExtract.enable') === true) {
        try {
            const lineageCurrentApp = [];

            const lineage = await app.getLineage();
            logger.debug(`getLineage success for appId: ${appToExtract.id}`);
            logger.debug(JSON.stringify(lineage, null, 2));

            // Create CSV write for storing current app's lineage to disk
            const lineageCurrentAppWriter = createCsvWriter({
                path: path.resolve(path.normalize(`${config.get('ButlerSpyglass.lineageExtract.exportDir')}/${appToExtract.id}.csv`)),
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
                    appId: appToExtract.id,
                    appName: appToExtract.name,
                });
            } else {
                lineage.forEach((element) => {
                    const el = element;
                    if (el.qStatement === undefined) el.qStatement = '';
                    if (el.qDiscriminator === undefined) el.qDiscriminator = '';

                    // Push lineage for current app into its own array, for immediate storage on disk
                    // Only extract first x characters of the discriminator and statement data, as specified in the config file.
                    lineageCurrentApp.push({
                        appId: appToExtract.id,
                        appName: appToExtract.name,
                        discriminator: el.qDiscriminator.substring(0, config.get('ButlerSpyglass.lineageExtract.maxLengthDiscriminator')),
                        statement: el.qStatement.substring(0, config.get('ButlerSpyglass.lineageExtract.maxLengthStatement')),
                    });
                });
            }

            // Save lineage info to disk files
            // First CSV
            lineageCurrentAppWriter
                .writeRecords(lineageCurrentApp)
                .then(() => {
                    logger.verbose(
                        `Done writing ${lineageCurrentApp.length} lineage records for app ID ${appToExtract.id} to CSV disk file`
                    );
                })
                .catch((error) => {
                    logger.error(
                        `Failed to write lineage info to CSV file on disk for app ID ${appToExtract.id} (make sure the output directory exists!): ${error}`
                    );
                    process.exit(1);
                });

            // Then as JSON
            try {
                fs.writeFileSync(
                    path.resolve(path.normalize(`${config.get('ButlerSpyglass.lineageExtract.exportDir')}/${appToExtract.id}.json`)),
                    JSON.stringify(lineageCurrentApp, 0, 2)
                );
                logger.verbose(`Done writing script for app ID ${appToExtract.id} to disk`);
            } catch (err) {
                logger.error(
                    `Failed to write lineage info to JSON file on disk for app ID ${appToExtract.id} (make sure the output directory exists!): ${err}`
                );
                process.exit(2);
            }
        } catch (err) {
            logger.error(`getLineage error (app ID=${appToExtract.id}): ${JSON.stringify(err)}`);

            session.close();
            cb(err);
            return;
        }
    }

    if (config.get('ButlerSpyglass.scriptExtract.enable') === true) {
        try {
            const script = await app.getScript();
            logger.debug(`getScript success for appId: ${appToExtract.id}`);
            logger.silly(script);

            // Save current app's script to disk file. Sync writing to keep things simple.
            try {
                fs.writeFileSync(
                    path.resolve(path.normalize(`${config.get('ButlerSpyglass.scriptExtract.exportDir')}/${appToExtract.id}.qvs`)),
                    script
                );
                logger.verbose(`Done writing script for app ID ${appToExtract.id} to disk`);
            } catch (err) {
                logger.error(`Error when writing script for app ID ${appToExtract.id} to disk: ${err}`);
                session.close();
                cb(err);
                return;
            }
        } catch (err) {
            session.close();
            logger.error(`getScript error (app ID=${appToExtract.id}): ${JSON.stringify(err)}`);
            session.close();

            cb(err);
            return;
        }
    }

    try {
        session.close();

        cb();
    } catch (err) {
        logger.error(`Error when closing session (app ID=${appToExtract.id}): ${err}`);

        cb(err);
    }
};
