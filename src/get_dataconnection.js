const fs = require('fs-extra');
const config = require('config');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const QrsInteract = require('qrs-interact');

// Load our own code
const { logger } = require('./logger');

// -------------
// Exports
// -------------
module.exports.getDataConnections = async function getDataConnections() {
    try {
        // Create CSV write for storing current app's lineage to disk
        const dataconnectionsWriter = createCsvWriter({
            path: path.resolve(path.normalize(`${config.get('ButlerSpyglass.dataConnectionExtract.exportDir')}/dataconnections.csv`)),
            header: [
                {
                    id: 'id',
                    title: 'Id',
                },
                {
                    id: 'name',
                    title: 'Name',
                },
                {
                    id: 'connectionstring',
                    title: 'Connection string',
                },
                {
                    id: 'type',
                    title: 'Type',
                },
            ],
            append: false,
        });

        const qrsInstance = new QrsInteract({
            hostname: config.get('ButlerSpyglass.configQRS.host'),
            portNumber: config.get('ButlerSpyglass.configQRS.port'),
            headers: config.get('ButlerSpyglass.configQRS.headers'),
            certificates: {
                certFile: config.get('ButlerSpyglass.cert.clientCert'),
                keyFile: config.get('ButlerSpyglass.cert.clientCertKey'),
            },
        });

        // Get info about all data connections
        try {
            const dataconnections = await qrsInstance.Get('dataconnection');
            logger.debug(`DATA CONNECTION: Got response: ${dataconnections.statusCode}`);

            // Save CSV to disk
            dataconnectionsWriter
                .writeRecords(dataconnections.body)
                .then(() => {
                    logger.verbose(`Done writing ${dataconnections.length} data connection records to CSV disk file`);
                })
                .catch((error) => {
                    logger.error(`Failed to write data connections to CSV file on disk (make sure the output directory exists!): ${error}`);
                    process.exit(1);
                });

            // Save JSON to disk
            try {
                fs.writeFileSync(
                    path.resolve(path.normalize(`${config.get('ButlerSpyglass.dataConnectionExtract.exportDir')}/dataconnections.json`)),
                    JSON.stringify(dataconnections.body, 0, 2)
                );
                logger.verbose(`Done writing data connections to JSON file on disk.`);
            } catch (err) {
                logger.error(`Failed to write data connection file to JSON file on disk (make sure the output directory exists!): ${err}`);
                process.exit(3);
            }

            logger.info('Done writing data connection metadata to disk');
        } catch (err) {
            logger.error(`DATA CONNECTION: Error while getting data connections: ${JSON.stringify(err, null, 2)}`);
            const newLocal = 'Error while getting data connections';
            throw newLocal;
        }
    } catch (err) {
        logger.error(`DATA CONNECTION: Error while conecting to QRS: ${JSON.stringify(err, null, 2)}`);
    }
};
