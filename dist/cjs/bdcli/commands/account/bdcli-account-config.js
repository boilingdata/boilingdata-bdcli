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
const auth_util_js_1 = require("../../utils/auth_util.js");
const logger = (0, logger_util_js_1.getLogger)("bdcli-account-config");
async function show(options, _command) {
    try {
        options = await (0, config_util_js_1.combineOptsWithSettings)(options, logger);
        if (options.list) {
            (0, spinner_util_js_1.updateSpinnerText)(`Listing profiles in ${config_util_js_1.BDCONF}`);
            const list = await (0, config_util_js_1.listConfigProfiles)(logger);
            (0, spinner_util_js_1.spinnerSuccess)();
            console.log(JSON.stringify(list));
            return;
        }
        if (options.clear) {
            (0, spinner_util_js_1.updateSpinnerText)(`Deleting session tokens from ${config_util_js_1.BDCONF}`);
            await (0, config_util_js_1.updateConfig)({
                credentials: {
                    bdStsToken: undefined,
                    idToken: undefined,
                    accessToken: undefined,
                    refreshToken: undefined,
                    sharedTokens: undefined,
                },
            });
            (0, spinner_util_js_1.spinnerSuccess)();
            return;
        }
        if (await (0, config_util_js_1.hasValidConfig)()) {
            if (options.password && !options.validate) {
                await (0, config_util_js_1.updateConfig)({ credentials: { password: options.password } });
                return (0, spinner_util_js_1.spinnerSuccess)("Password added to the config");
            }
            return (0, spinner_util_js_1.spinnerSuccess)(`Valid configuration already exists for "${config_util_js_1.profile}" profile`);
        }
        else {
            if (options.validate) {
                return (0, spinner_util_js_1.spinnerError)(`No valid configuration found for "${config_util_js_1.profile}" profile`);
            }
        }
        if (!options.email && !options.validate) {
            options.email = await (0, auth_util_js_1.getEmail)();
        }
        // FIXME: If the PW is invalid, don't write the .bdcli.yaml file!
        if (!options.password && !options.nopw && !options.validate) {
            const inp = await (0, prompts_1.default)({
                type: "password",
                name: "pw",
                message: "Please enter your password",
                validate: (pw) => (pw.length < 12 ? `Need at least 12 characters, including special` : true),
            });
            options.password = inp["pw"];
        }
        logger.debug({ options: { ...options, password: options.password ? "**" : undefined } });
        (0, spinner_util_js_1.updateSpinnerText)(`Creating ${config_util_js_1.BDCONF}`);
        const { email, password, region } = options;
        if (!email) {
            return (0, spinner_util_js_1.spinnerError)("No email found, did you forget to set profile with BD_PROFILE env or --profile option?");
        }
        await (0, config_util_js_1.updateConfig)({ credentials: { email, password, region } });
        (0, spinner_util_js_1.spinnerSuccess)();
    }
    catch (err) {
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
const program = new cmd.Command("bdcli account config")
    .addOption(new cmd.Option("--validate", "validate current config").conflicts("--clear").conflicts("--list"))
    .addOption(new cmd.Option("--email <email>", "email address that works").conflicts("--validate"))
    .addOption(new cmd.Option("--password <password>", "suitably complex password to be set into config"))
    .addOption(new cmd.Option("--nopw", "do not store password into config").conflicts("--password"))
    .addOption(new cmd.Option("--clear", "delete all session tokens (for opt. selected profile)"))
    .addOption(new cmd.Option("--region <awsRegion>", "Sign-in AWS region").default("eu-west-1"))
    .addOption(new cmd.Option("--list", `List all config profiles (see ${config_util_js_1.BDCONF})`))
    .action(async (options, command) => await show(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
