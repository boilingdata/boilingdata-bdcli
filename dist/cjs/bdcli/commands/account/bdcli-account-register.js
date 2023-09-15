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
const cmd = __importStar(require("commander"));
const logger_util_js_1 = require("../../utils/logger_util.js");
const spinner_util_js_1 = require("../../utils/spinner_util.js");
const options_util_js_1 = require("../../utils/options_util.js");
const config_util_js_1 = require("../../utils/config_util.js");
const auth_util_js_1 = require("../../utils/auth_util.js");
const logger = (0, logger_util_js_1.getLogger)("bdcli-account-register");
async function show(options, _command) {
    try {
        logger.debug({ options: { ...options, password: options.password ? "**" : undefined } });
        if (options.environment != "preview" || options.region != "eu-west-1") {
            return (0, spinner_util_js_1.spinnerError)("Currently only preview environment is supported, and userpool registration on eu-west-1 AWS region. " +
                "Migration to other regions and production environment(s) will be supported in the future.");
        }
        (0, spinner_util_js_1.updateSpinnerText)("Registering to BoilingData");
        const { region, environment, password, email } = options;
        await (0, auth_util_js_1.registerToBoilingData)(region, environment, email, password, logger);
        if (!(await (0, config_util_js_1.hasValidConfig)()))
            return (0, spinner_util_js_1.spinnerError)("No valid config, was registration successful?");
        (0, spinner_util_js_1.spinnerSuccess)();
    }
    catch (err) {
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
const program = new cmd.Command("bdcli account register")
    .addOption(new cmd.Option("--email <email>", "email address that works"))
    .addOption(new cmd.Option("--password <password>", "suitably complex password, at least 12 characters"))
    .addOption(new cmd.Option("--region <region>", "AWS region (by default eu-west-1").default("eu-west-1"))
    .addOption(new cmd.Option("--environment <environment>", "'production' or 'preview' (default)").default("preview"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
