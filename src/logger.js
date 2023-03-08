const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('config');
const path = require('path');

// Set up logger with timestamps and colors
const logTransports = [];

// Add notification when logs are rotated
// logTransports.fileLogError.on('rotate', function (oldFilename, newFilename) {
//     logger.logger.info(`Rotating error log... (from ${oldFilename} to ${newFilename}`);
// });

logTransports.push(
    new winston.transports.Console({
        name: 'console',
        level: config.get('ButlerSpyglass.logLevel'),
        format: winston.format.combine(
            winston.format.errors({ stack: true }),
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
        ),
    })
);

if (config.get('ButlerSpyglass.fileLogging')) {
    logTransports.push(
        new winston.transports.DailyRotateFile({
            dirname: path.join(__dirname, config.get('ButlerSpyglass.logDirectory')),
            filename: 'butler-spyglass.%DATE%.log',
            level: config.get('ButlerSpyglass.logLevel'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
        })
    );
}

// -------------
// Exports
// -------------

module.exports.logger = winston.createLogger({
    transports: logTransports,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
});

module.exports.getLoggingLevel = () =>
    logTransports.find((transport) => transport.name === 'console').level;
