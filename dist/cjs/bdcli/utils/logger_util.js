"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = exports.ELogLevel = void 0;
const util = __importStar(require("node:util"));
const winston = __importStar(require("winston"));
var ELogLevel;
(function (ELogLevel) {
    ELogLevel["ERROR"] = "error";
    ELogLevel["WARN"] = "warn";
    ELogLevel["INFO"] = "info";
    ELogLevel["DEBUG"] = "debug";
})(ELogLevel || (exports.ELogLevel = ELogLevel = {}));
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
function getLogger(service) {
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
exports.getLogger = getLogger;
