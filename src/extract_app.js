var fs = require('fs-extra');
const enigma = require('enigma.js');
const WebSocket = require('ws');
var Queue = require('better-queue');


// Load our own code
const logger = require('./logger.js');


const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
var config = require('config');

let processedApps = 0;


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



// -------------
// Exports
// -------------

module.exports.resetExtractedAppCount = () => {
    processedApps = 0;
}

module.exports.appExtractMetadata = async function (worker, queue, appToExtract, cb) {
    
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
    var queueStats = queue.getStats();
    logger.logger.info(`Extracting metadata (#${processedApps}, overall success rate ${100*queueStats.successRate}%): ${appToExtract.qDocId} <<>> ${appToExtract.qTitle}`);

    // Create a new session
    let configEnigma = {
        schema: qixSchema,
        url: `wss://${configEngine.host}:${configEngine.port}/app/${appToExtract.qDocId}`,
        createSocket: url => new WebSocket(url, {
            ca: [configEngine.ca],
            key: configEngine.key,
            cert: configEngine.cert,
            headers: {
                'X-Qlik-User': config.get('ButlerSpyglass.configEngine.headers.X-Qlik-User')
            },
            rejectUnauthorized: config.get('ButlerSpyglass.configEngine.rejectUnauthorized')
        }),
        protocol: {
            delta: false
        }
    };

    let session = enigma.create(configEnigma);
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
        logger.logger.debug('openDoc success for appId: ' + appToExtract.qDocId);
    } catch (err) {
        logger.logger.error(`openDoc error (app ID=${appToExtract.qDocId}): ${JSON.stringify(err)}`);

        session.close();
        cb(err);
        return;
    }


    if (config.get('ButlerSpyglass.lineage.enableLineageExtract') == true) {

        try {
            let lineageCurrentApp = [];

            lineage = await app.getLineage();
            logger.logger.debug('getLineage success for appId: ' + appToExtract.qDocId);
            logger.logger.debug(JSON.stringify(lineage, null, 2));

            // Create CSV write for storing current app's lineage to disk
            lineageCurrentAppWriter = createCsvWriter({
                path: path.resolve(path.normalize(config.get('ButlerSpyglass.lineage.lineageFolder') + '/' + appToExtract.qDocId + '.csv')),
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

            lineage.forEach(element => {
                if (element.qStatement == undefined) element.qStatement = '';

                // Push lineage for current app into its own array, for immediate storage on disk
                // Only extract first 1000 characters of the discriminator and statement data, respectively.
                lineageCurrentApp.push({
                    appId: appToExtract.qDocId,
                    discriminator: element.qDiscriminator.substring(0, config.get('ButlerSpyglass.lineage.maxLengthDiscriminator')),
                    statement: element.qStatement.substring(0, config.get('ButlerSpyglass.lineage.maxLengthStatement'))
                });
            });

            // Save lineage info to disk file
            lineageCurrentAppWriter
                .writeRecords(lineageCurrentApp)
                .then(() => {
                    logger.logger.verbose(`Done writing ${lineageCurrentApp.length} lineage records for app ID ${appToExtract.qDocId} to disk file`);
                })
                .catch((error) => {
                    logger.logger.error(`Failed to write lineage info to disk for app ID ${appToExtract.qDocId} (make sure the output directory exists!): ${error}`);
                    process.exit(1);
                });

        } catch (err) {
            logger.logger.error(`getLineage error (app ID=${appToExtract.qDocId}): ${JSON.stringify(err)}`);

            session.close();
            cb(err);
            return;
        }
    }

    if (config.get('ButlerSpyglass.script.enableScriptExtract') == true) {
        try {
            script = await app.getScript();
            logger.logger.debug('getScript success for appId: ' + appToExtract.qDocId);
            logger.logger.silly(script);

            // Save current app's script to disk file. Sync writing to keep things simple.
            try {
                fs.writeFileSync(
                    path.resolve(path.normalize(config.get('ButlerSpyglass.script.scriptFolder') + '/' + appToExtract.qDocId + '.qvs')),
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

    } catch (err) {
        logger.logger.error(`Error when closing session (app ID=${appToExtract.qDocId}): ${err}`);

        cb(err);
        return;
    }
}