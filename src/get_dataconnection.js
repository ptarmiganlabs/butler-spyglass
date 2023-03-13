const fs = require('fs-extra');
const config = require('config');
const path = require('path');
const axios = require('axios');
const { promises: Fs } = require('fs');
const { stringify } = require('csv-stringify');

const { setupQRSConnection } = require('./qrs');

// Load our own code
const { logger } = require('./logger');

// -------------
// Exports
// -------------
module.exports.getDataConnections = async function getDataConnections(execPath) {
    try {
        // Get certificates
        const fileCert = path.resolve(execPath, config.get('ButlerSpyglass.cert.clientCert'));
        const fileCertKey = path.resolve(execPath, config.get('ButlerSpyglass.cert.clientCertKey'));

        // Build Axios config
        const axiosConfig = await setupQRSConnection(logger, config, {
            method: 'get',
            fileCert,
            fileCertKey,
            path: '/qrs/dataconnection',
        });

        const result = await axios.request(axiosConfig);
        if (result.status === 200 && result.data.length > 0) {
            // At least one data connection found. Add it/them to the list of apps to extract lineage/script for
            logger.debug(`DATA CONNECTION: Got response: ${result.status}`);
            logger.info(`Got ${result.data.length} data connections from QRS`);

            // Remove username and password
            const dataConnections = result.data.map(({ password, username, ...keepAttrs }) => keepAttrs);

            // Create CSV string
            const buffer = stringify(dataConnections, { header: true });

            // Save CSV to disk
            await Fs.writeFile(
                path.resolve(path.normalize(`${config.get('ButlerSpyglass.dataConnectionExtract.exportDir')}/dataconnections.csv`)),
                buffer
            );
            logger.info(`Done writing ${dataConnections.length} data connection records to CSV disk file`);

            // Save JSON to disk
            fs.writeFileSync(
                path.resolve(path.normalize(`${config.get('ButlerSpyglass.dataConnectionExtract.exportDir')}/dataconnections.json`)),
                JSON.stringify(dataConnections, 0, 2)
            );
            logger.info(`Done writing ${dataConnections.length} data connection records to JSON disk file`);
        } else {
            // No apps. That's odd... but maybe there are no apps in the server, for the user used?
            logger.info('No apps found in Sense server');
        }
    } catch (err) {
        logger.error(`DATA CONNECTION: Error while getting data connections: ${JSON.stringify(err, null, 2)}`);
        const newLocal = 'Error while getting data connections';
        throw newLocal;
    }
};
