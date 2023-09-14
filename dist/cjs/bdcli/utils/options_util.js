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
exports.addGlobalOptions = void 0;
const cmd = __importStar(require("commander"));
const logger_util_js_1 = require("./logger_util.js");
const spinner_util_js_1 = require("./spinner_util.js");
function addGlobalOptions(program, logger) {
    program
        .addOption(new cmd.Option("-d, --debug", "set debug logging level"))
        .addOption(new cmd.Option("--log-level <level>", "log level").choices(["debug", "info", "warn", "error"]))
        .addOption(new cmd.Option("-V, --version", "show version"))
        .addOption(new cmd.Option("--disable-spinner", "disable in-progress spinner status messages"))
        .on("option:log-level", (level) => logger.setLogLevel(level))
        .on("option:debug", () => logger.setLogLevel(logger_util_js_1.ELogLevel.DEBUG))
        .on("option:disable-spinner", () => (0, spinner_util_js_1.disableSpinner)());
}
exports.addGlobalOptions = addGlobalOptions;
