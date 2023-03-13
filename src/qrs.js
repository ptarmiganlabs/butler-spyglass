const https = require('https');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const readCert = (filename) => fs.readFileSync(filename);

const generateXrfKey = () => {
    let xrfString = '';
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < 16; i++) {
        if (Math.floor(Math.random() * 2) === 0) {
            xrfString += Math.floor(Math.random() * 10).toString();
        } else {
            const charNumber = Math.floor(Math.random() * 26);
            if (Math.floor(Math.random() * 2) === 0) {
                // lowercase letter
                xrfString += String.fromCharCode(charNumber + 97);
            } else {
                xrfString += String.fromCharCode(charNumber + 65);
            }
        }
    }
    return xrfString;
};

const setupQRSConnection = (logger, config, param) => {
    // eslint-disable-next-line no-unused-vars
    // Ensure valid http method
    if (!param.method || param.method.toLowerCase() !== 'get') {
        logger.error(`Setting up connection to QRS. Invalid http method '${param.method}'. Exiting.`);
        process.exit(1);
    }

    const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
        cert: readCert(param.fileCert),
        key: readCert(param.fileCertKey),
    });

    // Set up Sense repository service configuration
    const xrfKey = generateXrfKey();

    const axiosConfig = {
        url: `${param.path}?xrfkey=${xrfKey}`,
        method: param.method.toLowerCase(),
        baseURL: `https://${config.get('ButlerSpyglass.configQRS.host')}:${config.get('ButlerSpyglass.configQRS.port')}`,
        headers: {
            'x-qlik-xrfkey': xrfKey,
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_api',
            // 'Content-Type': 'application/json; charset=utf-8',
        },
        responseType: 'application/json',
        httpsAgent,
        timeout: 60000,
        //   passphrase: "YYY"
    };

    // Add message body (if any)
    if (param.body) {
        axiosConfig.data = param.body;
    }

    // Add extra headers (if any)
    if (param.headers?.length > 0) {
        // eslint-disable-next-line no-restricted-syntax
        for (const item of param.headers) {
            axiosConfig.headers[item.name] = item.value;
        }
    }

    // Add parameters (if any)
    if (param.queryParameters?.length > 0) {
        // eslint-disable-next-line no-restricted-syntax
        for (const queryParam of param.queryParameters) {
            axiosConfig.url += `&${queryParam.name}=${queryParam.value}`;
        }
    }

    return axiosConfig;
};

const getAppsToProcess = async (logger, config, execPath) => {
    // Get certificates
    const fileCert = path.resolve(execPath, config.get('ButlerSpyglass.cert.clientCert'));
    const fileCertKey = path.resolve(execPath, config.get('ButlerSpyglass.cert.clientCertKey'));

    const appIdsToProcess = [];
    let queryParameters = [];

    // Are there any app filters specified?
    if (
        config.get('ButlerSpyglass.appFilter.appNameExact')?.length === undefined &&
        config.get('ButlerSpyglass.appFilter.appId')?.length === undefined &&
        config.get('ButlerSpyglass.appFilter.appTag')?.length === undefined
    ) {
        try {
            // No app filters specified. Get all apps
            logger.info('No app filters specified, getting all apps');
            // Build Axios config
            const axiosConfig = await setupQRSConnection(logger, config, {
                method: 'get',
                fileCert,
                fileCertKey,
                path: '/qrs/app',
            });

            const result = await axios.request(axiosConfig);
            if (result.status === 200 && result.data.length > 0) {
                // At least oneapp found. Add it/them to the list of apps to extract lineage/script for
                logger.info(`${result.data.length} apps found`);

                // Add app IDs and names to array containing apps to process
                // eslint-disable-next-line no-restricted-syntax
                for (const app of result.data) {
                    appIdsToProcess.push({ id: app.id, name: app.name });
                }
            } else {
                // No apps. That's odd... but maybe there are no apps in the server, for the user used?
                logger.info('No apps found in Sense server');
            }
        } catch (err) {
            logger.error(`Error while retrieving all apps from QRS: ${err}`);
        }
    } else {
        // ------------
        // Get apps matching the app filters
        try {
            let appNameExactFilter = '';

            if (config.get('ButlerSpyglass.appFilter.appNameExact')) {
                // eslint-disable-next-line no-restricted-syntax
                for (const appNameExact of config.get('ButlerSpyglass.appFilter.appNameExact')) {
                    if (appNameExactFilter === '') {
                        // First app name
                        appNameExactFilter += `name eq '${appNameExact}'`;
                    } else {
                        appNameExactFilter += ` or name eq '${appNameExact}'`;
                    }
                }

                if (appNameExactFilter.length > 0) {
                    queryParameters.push({ name: 'filter', value: encodeURI(appNameExactFilter) });
                }

                // Build Axios config
                const axiosConfig = await setupQRSConnection(logger, config, {
                    method: 'get',
                    fileCert,
                    fileCertKey,
                    path: '/qrs/app',
                    queryParameters,
                });

                const result = await axios.request(axiosConfig);
                if (result.status === 200 && result.data.length > 0) {
                    // At least one matching app based on exact app name filter. Add it/them to the list of apps to extract lineage/script for
                    logger.info(`${result.data.length} matches for the exact app name filter`);

                    // Add app IDs to array containing apps to process
                    // eslint-disable-next-line no-restricted-syntax
                    for (const app of result.data) {
                        appIdsToProcess.push({ id: app.id, name: app.name });
                    }
                } else {
                    // No exact matches for app name filter
                    logger.info('No matches for the exact app name filter');
                }
            }

            // ------------
            // Get apps matching the appId filters
            // Build app query string for app id matching
            let appIdFilter = '';
            queryParameters = [];

            if (config.get('ButlerSpyglass.appFilter.appId')) {
                // eslint-disable-next-line no-restricted-syntax
                for (const appId of config.get('ButlerSpyglass.appFilter.appId')) {
                    if (appIdFilter === '') {
                        // First app id
                        appIdFilter += `id eq ${appId}`;
                    } else {
                        appIdFilter += ` or id eq ${appId}`;
                    }
                }

                if (appIdFilter.length > 0) {
                    queryParameters.push({ name: 'filter', value: encodeURI(appIdFilter) });
                }

                // Build Axios config
                const axiosConfig = await setupQRSConnection(logger, config, {
                    method: 'get',
                    fileCert,
                    fileCertKey,
                    path: '/qrs/app',
                    queryParameters,
                });

                const result = await axios.request(axiosConfig);
                if (result.status === 200 && result.data.length > 0) {
                    // At least one matching app based on app id filter. Add it/them to the list of apps to extract lineage/script for
                    logger.info(`${result.data.length} matches for the app id filter`);

                    // Add app IDs to array containing apps to process
                    // eslint-disable-next-line no-restricted-syntax
                    for (const app of result.data) {
                        appIdsToProcess.push({ id: app.id, name: app.name });
                    }
                } else {
                    // No exact matches for app id filter
                    logger.info('No matches for the app id filter');
                }
            }

            // ------------
            // Get apps matching the appTag filters
            // Build app query string for exact app name matching
            let appTagFilter = '';
            queryParameters = [];

            if (config.get('ButlerSpyglass.appFilter.appTag')) {
                // eslint-disable-next-line no-restricted-syntax
                for (const appTag of config.get('ButlerSpyglass.appFilter.appTag')) {
                    if (appTagFilter === '') {
                        // First app name
                        appTagFilter += `tags.name eq '${appTag}'`;
                    } else {
                        appTagFilter += ` or tags.name eq '${appTag}'`;
                    }
                }

                if (appTagFilter.length > 0) {
                    queryParameters.push({ name: 'filter', value: encodeURI(appTagFilter) });
                }

                // Build Axios config
                const axiosConfig = await setupQRSConnection(logger, config, {
                    method: 'get',
                    fileCert,
                    fileCertKey,
                    path: '/qrs/app/full',
                    queryParameters,
                });

                const result = await axios.request(axiosConfig);
                if (result.status === 200 && result.data.length > 0) {
                    // At least one matching app based on app tag filter. Add it/them to the list of apps to extract lineage/script for
                    logger.info(`${result.data.length} matches for the app tag filter`);

                    // Add app IDs to array containing apps to process
                    // eslint-disable-next-line no-restricted-syntax
                    for (const app of result.data) {
                        appIdsToProcess.push({ id: app.id, name: app.name });
                    }
                } else {
                    // No exact matches for app name filter
                    logger.info('No matches for the app tag filter');
                }
            }
        } catch (err) {
            logger.error(`Error while resolving app filters: ${err}`);
        }
    }

    return appIdsToProcess;
};

module.exports = {
    setupQRSConnection,
    getAppsToProcess,
};
