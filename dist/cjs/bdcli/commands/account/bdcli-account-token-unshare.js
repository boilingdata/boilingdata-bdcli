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
const auth_util_js_1 = require("../../utils/auth_util.js");
const ms_1 = __importDefault(require("ms"));
const cron_validate_1 = __importDefault(require("cron-validate"));
const cron_schedule_1 = require("cron-schedule");
const account_js_1 = require("../../../integration/boilingdata/account.js");
const logger = (0, logger_util_js_1.getLogger)("bdcli-account-token-unshare");
async function show(options, _command) {
    try {
        logger.debug({ options });
        if (options.expires) {
            const lifetimeInMs = (0, ms_1.default)(`${options.expires}`);
            logger.debug({ lifetimeInMs });
            if (!lifetimeInMs || lifetimeInMs < 60000) {
                throw new Error("Invalid token expiration time span, please see https://github.com/vercel/ms for the format of the period");
            }
        }
        if (options.vendingWindow) {
            const cronResult = cron_validate_1.default(options.vendingWindow, {
                preset: "npm-cron-schedule",
            });
            const isValid = cronResult.isValid();
            logger.debug({ isValid, cronResult });
            if (!isValid) {
                throw new Error(`Invalid token vending window cron expression: ${JSON.stringify(cronResult)}`);
            }
            logger.debug({ cronResultValue: cronResult.getValue() });
            const parsed = (0, cron_schedule_1.parseCronExpression)(options.vendingWindow);
            logger.debug({ nextDate: parsed.getNextDate(new Date()) });
        }
        const users = options.users.split(",");
        (0, spinner_util_js_1.updateSpinnerText)("Authenticating");
        const { idToken: token, cached: idCached, region } = await (0, auth_util_js_1.getIdToken)(logger);
        (0, spinner_util_js_1.updateSpinnerText)(`Authenticating: ${idCached ? "cached" : "success"}`);
        (0, spinner_util_js_1.spinnerSuccess)();
        (0, spinner_util_js_1.updateSpinnerText)("Unsharing token");
        if (!region)
            throw new Error("Pass --region parameter or set AWS_REGION env");
        const bdAccount = new account_js_1.BDAccount({ logger, authToken: token });
        await bdAccount.unshareToken(users);
        (0, spinner_util_js_1.spinnerSuccess)();
    }
    catch (err) {
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
const program = new cmd.Command("bdcli account token-unshare")
    .addOption(new cmd.Option("--users <boilingUsers>", "Comma separated list of Boiling users").makeOptionMandatory())
    .action(async (options, command) => await show(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
