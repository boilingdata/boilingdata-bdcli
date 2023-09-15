import * as util from "node:util";
import * as winston from "winston";
export var ELogLevel;
(function (ELogLevel) {
    ELogLevel["ERROR"] = "error";
    ELogLevel["WARN"] = "warn";
    ELogLevel["INFO"] = "info";
    ELogLevel["DEBUG"] = "debug";
})(ELogLevel || (ELogLevel = {}));
// closure
const addAppNameFormat = (service) => winston.format((info) => {
    info.service = service;
    return info;
});
const logFormat = winston.format.printf((info) => {
    if (typeof info.message === "object") {
        info.message = util.inspect(info.message, { showHidden: false, depth: 20, colors: true, compact: false });
    }
    return info.message;
});
export function getLogger(service) {
    const logger = winston.createLogger({
        level: "info",
        format: winston.format.combine(addAppNameFormat(service)(), winston.format.json()),
        transports: [
            new winston.transports.File({ filename: "error.log", level: "error" }),
            new winston.transports.File({ filename: "combined.log" }),
        ],
    });
    logger.add(new winston.transports.Console({
        format: winston.format.combine(addAppNameFormat(service)(), winston.format.colorize(), logFormat),
    }));
    return {
        error: logger.error.bind(logger),
        warn: logger.warn.bind(logger),
        info: logger.info.bind(logger),
        debug: logger.debug.bind(logger),
        setLogLevel: (level) => (logger.level = level),
    };
}
