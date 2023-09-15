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
const cron_validate_1 = __importDefault(require("cron-validate"));
const cron_schedule_1 = require("cron-schedule");
const account_js_1 = require("../../../integration/boilingdata/account.js");
const logger = (0, logger_util_js_1.getLogger)("bdcli-account-token-share");
async function show(options, _command) {
    try {
        logger.debug({ options });
        if (options.lifetime)
            await (0, auth_util_js_1.validateTokenLifetime)(options.lifetime);
        if (options.vendingSchedule) {
            const cronResult = cron_validate_1.default(options.vendingSchedule, {
                preset: "npm-cron-schedule",
            });
            const isValid = cronResult.isValid();
            logger.debug({ isValid, cronResult });
            if (!isValid) {
                throw new Error(`Invalid token vending window cron expression: ${JSON.stringify(cronResult)}`);
            }
            logger.debug({ cronResultValue: cronResult.getValue() });
            const parsed = (0, cron_schedule_1.parseCronExpression)(options.vendingSchedule);
            logger.debug({ nextDate: parsed.getNextDate(new Date()) });
        }
        const users = options.users.split(",");
        (0, spinner_util_js_1.updateSpinnerText)("Authenticating");
        const { idToken: token, cached: idCached, region } = await (0, auth_util_js_1.getIdToken)(logger);
        (0, spinner_util_js_1.updateSpinnerText)(`Authenticating: ${idCached ? "cached" : "success"}`);
        (0, spinner_util_js_1.spinnerSuccess)();
        (0, spinner_util_js_1.updateSpinnerText)("Sharing token");
        if (!region)
            throw new Error("Pass --region parameter or set AWS_REGION env");
        const bdAccount = new account_js_1.BDAccount({ logger, authToken: token });
        await bdAccount.shareToken(`${options.lifetime}` ?? "1h", options.vendingSchedule, users, options.name, options.sql);
        (0, spinner_util_js_1.spinnerSuccess)();
    }
    catch (err) {
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
const program = new cmd.Command("bdcli account sts-token-share")
    .addOption(new cmd.Option("--users <boilingUsers>", "Comma separated list of Boiling users").makeOptionMandatory())
    .addOption(new cmd.Option("--name <shareName>", "Friendly name for the share").makeOptionMandatory())
    .addOption(new cmd.Option("--sql <sql>", "Target user will have access to a named view of the results of this SQL.").makeOptionMandatory())
    .addOption(new cmd.Option("--lifetime <lifetime>", "Token expiration lifetime, in string format. Defaults to '1h' (see https://github.com/vercel/ms)"))
    .addOption(new cmd.Option("--vending-schedule <cronExpression>", "Cron start times, when the shared token can be vended. Defaults to '* * * * * *' (at any time)\n" +
    "\tPleases see https://www.npmjs.com/package/cron-schedule as format for the cron expression.\n" +
    "\tGiven as a cron expression with the accuracy of the <lifetime> parameter.\n" +
    "\tIf at any time the next cron runtime is in the range of current time + lifetime time range (default 1h),\n" +
    "\tthen token vending is allowed, otherwise not. This is checked at runtime when the token is requested\n" +
    "\tby the user to whom the token was shared to."))
    .action(async (options, command) => await show(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
