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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cmd = __importStar(require("commander"));
const logger_util_js_1 = require("../../utils/logger_util.js");
const spinner_util_js_1 = require("../../utils/spinner_util.js");
const options_util_js_1 = require("../../utils/options_util.js");
const config_util_js_1 = require("../../utils/config_util.js");
const prompts_1 = __importDefault(require("prompts"));
const EmailValidator = __importStar(require("email-validator"));
const logger = (0, logger_util_js_1.getLogger)("bdcli-account-create-config");
async function show(options, _command) {
    try {
        logger.debug({ options: { ...options, password: options.password ? "**" : undefined } });
        if (options.clear) {
            (0, spinner_util_js_1.updateSpinnerText)("Deleting session tokens from ~/.bdclirc");
            await (0, config_util_js_1.updateConfig)({
                credentials: { bdStsToken: undefined, idToken: undefined, accessToken: undefined, refreshToken: undefined },
            });
            (0, spinner_util_js_1.spinnerSuccess)();
            return;
        }
        if (await (0, config_util_js_1.hasValidConfig)())
            return (0, spinner_util_js_1.spinnerSuccess)("Valid config file already exists");
        if (!options.email) {
            const inp = await (0, prompts_1.default)({
                type: "text",
                name: "email",
                message: "Please enter your email",
                validate: (email) => (EmailValidator.validate(email) ? true : "Invalid email address"),
            });
            options.email = inp["email"];
        }
        if (!options.password) {
            const inp = await (0, prompts_1.default)({
                type: "password",
                name: "pw",
                message: "Please enter your password",
                validate: (pw) => (pw.length < 12 ? `Need at least 12 characters, including special` : true),
            });
            options.password = inp["pw"];
        }
        logger.debug({ options: { ...options, password: options.password ? "**" : undefined } });
        (0, spinner_util_js_1.updateSpinnerText)("Creating ~/.bdclirc");
        const { email, password, region } = options;
        if (!email || !password)
            return (0, spinner_util_js_1.spinnerError)("No email or password found");
        await (0, config_util_js_1.updateConfig)({ credentials: { email, password, region } });
        (0, spinner_util_js_1.spinnerSuccess)();
    }
    catch (err) {
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
const program = new cmd.Command("bdcli account create-config")
    .addOption(new cmd.Option("--email <email>", "email address that works"))
    .addOption(new cmd.Option("--password <password>", "suitably complex password"))
    .addOption(new cmd.Option("--clear", "delete all session tokens"))
    .addOption(new cmd.Option("--region <awsRegion>", "Sign-in AWS region").default("eu-west-1"))
    .action(async (options, command) => await show(options, command));
(0, options_util_js_1.addGlobalOptions)(program, logger);
(async () => await program.parseAsync(process.argv))();