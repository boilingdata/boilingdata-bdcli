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
const auth_util_js_1 = require("../../utils/auth_util.js");
const account_js_1 = require("../../../integration/boilingdata/account.js");
const config_util_js_1 = require("../../utils/config_util.js");
const output_util_js_1 = require("../../utils/output_util.js");
const logger = (0, logger_util_js_1.getLogger)("bdcli-account-tap-client-token");
async function show(options, _command) {
    try {
        options = await (0, config_util_js_1.combineOptsWithSettings)(options, logger);
        if (options.lifetime)
            await (0, auth_util_js_1.validateTokenLifetime)(options.lifetime);
        if (!(0, auth_util_js_1.authSpinnerWithConfigCheck)())
            return;
        const { idToken: token, cached: idCached, region } = await (0, auth_util_js_1.getIdToken)(logger);
        (0, spinner_util_js_1.updateSpinnerText)(`Authenticating: ${idCached ? "cached" : "success"}`);
        (0, spinner_util_js_1.spinnerSuccess)();
        (0, spinner_util_js_1.updateSpinnerText)(`Getting BoilingData Client TAP token`);
        if (!region)
            throw new Error("Pass --region parameter or set AWS_REGION env");
        const bdAccount = new account_js_1.BDAccount({ logger, authToken: token });
        const { bdTapToken, cached: tapCached, ...rest } = await bdAccount.getTapToken(options.lifetime ?? "24h", options.sharingUser);
        (0, spinner_util_js_1.updateSpinnerText)(`Getting BoilingData Client TAP token: ${tapCached ? "cached" : "success"}`);
        (0, spinner_util_js_1.spinnerSuccess)();
        await (0, output_util_js_1.outputResults)({ bdTapToken, cached: tapCached, ...rest }, options.disableSpinner);
    }
    catch (err) {
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
const program = new cmd.Command("bdcli account tap-client-token")
    .addOption(new cmd.Option("--lifetime <lifetime>", "Expiration lifetime for the token, in string format, like '24h' (see https://github.com/vercel/ms)"))
    .addOption(new cmd.Option("--sharing-user <emailOfTapSharingUser>", "A user has shared Tap for you so that you can write to it."))
    .action(async (options, command) => await show(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
