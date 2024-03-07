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
const sandbox_js_1 = require("../../../integration/boilingdata/sandbox.js");
const auth_util_js_1 = require("../../utils/auth_util.js");
const output_util_js_1 = require("../../utils/output_util.js");
const logger = (0, logger_util_js_1.getLogger)("bdcli-sandbox-plan");
async function show(options, _command) {
    try {
        options = await (0, config_util_js_1.combineOptsWithSettings)(options, logger);
        if (!(0, auth_util_js_1.authSpinnerWithConfigCheck)())
            return;
        const { idToken: token, cached: idCached } = await (0, auth_util_js_1.getIdToken)(logger);
        (0, spinner_util_js_1.updateSpinnerText)(`Authenticating: ${idCached ? "cached" : "success"}`);
        (0, spinner_util_js_1.spinnerSuccess)();
        (0, spinner_util_js_1.updateSpinnerText)(`Planning deployment for sandbox ${options.name}`);
        const bdSandbox = new sandbox_js_1.BDSandbox({ logger, authToken: token });
        const results = await bdSandbox.planSandbox(options.name);
        (0, spinner_util_js_1.spinnerSuccess)();
        await (0, output_util_js_1.outputResults)(results?.planResults, options.disableSpinner);
    }
    catch (err) {
        if (err?.message.includes("Busy to"))
            return (0, spinner_util_js_1.spinnerWarn)("Deployment busy, try again");
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
// TODO:
//  - If the template is updated, like changing the name of a resource, it needs to be replaced?
//    Like if the Tap name is changed the Lambda needs to be deleted and created again and then
//    also the ingest URL changes.
const program = new cmd.Command("bdcli sandbox plan")
    .addOption(new cmd.Option("--name <sandboxName>", "sandbox name").makeOptionMandatory())
    .addOption(new cmd.Option("--region <region>", "AWS region (by default eu-west-1").default("eu-west-1"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
