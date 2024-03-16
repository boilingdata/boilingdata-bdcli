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
const config_util_js_1 = require("../../utils/config_util.js");
const output_util_js_1 = require("../../utils/output_util.js");
const query_js_1 = require("../../../integration/boilingdata/query.js");
const logger = (0, logger_util_js_1.getLogger)("bdcli-api");
logger.setLogLevel(logger_util_js_1.ELogLevel.WARN);
async function query(options, _command) {
    try {
        options = await (0, config_util_js_1.combineOptsWithSettings)(options, logger);
        (0, spinner_util_js_1.updateSpinnerText)("Authenticating");
        const { idToken: token, cached, region } = await (0, auth_util_js_1.getIdToken)(logger);
        (0, spinner_util_js_1.updateSpinnerText)(cached ? "Authenticating: cached" : "Authenticating: success");
        (0, spinner_util_js_1.spinnerSuccess)();
        (0, spinner_util_js_1.updateSpinnerText)("Sending Query to Boiling API");
        const results = await (0, query_js_1.runBoilingQuery)(options.sql, token, region, logger);
        (0, spinner_util_js_1.spinnerSuccess)();
        await (0, output_util_js_1.outputResults)(results, options.disableSpinner);
    }
    catch (err) {
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
const program = new cmd.Command("bdcli api query")
    .addOption(new cmd.Option("-s, --sql <sqlQuery>", "SQL clause").makeOptionMandatory())
    .action(async (options, command) => await query(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
