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
const logger = (0, logger_util_js_1.getLogger)("bdcli-account-password");
async function show(options, _command) {
    try {
        logger.debug({ options });
        if (!options.recover) {
            // by default we update the password
            try {
                (0, spinner_util_js_1.updateSpinnerText)("Authenticating");
                const { cached: idCached, region } = await (0, auth_util_js_1.getIdToken)(logger);
                if (!region)
                    throw new Error("Pass --region parameter or set AWS_REGION env");
                (0, spinner_util_js_1.updateSpinnerText)(`Authenticating: ${idCached ? "cached" : "success"}`);
                (0, spinner_util_js_1.spinnerSuccess)();
                (0, spinner_util_js_1.updateSpinnerText)("Updating password");
                await (0, auth_util_js_1.updatePassword)(logger);
                (0, spinner_util_js_1.spinnerWarn)("Not yet implemented");
                (0, spinner_util_js_1.spinnerSuccess)();
                return;
            }
            catch (err) {
                logger.debug({ err });
                (0, spinner_util_js_1.spinnerError)(err?.message);
            }
        }
        if (options.recover) {
            try {
                (0, spinner_util_js_1.updateSpinnerText)("Password recovery");
                const resp = await (0, auth_util_js_1.recoverPassword)(logger);
                (0, spinner_util_js_1.spinnerInfo)(resp);
                (0, spinner_util_js_1.spinnerSuccess)();
                return;
            }
            catch (err) {
                logger.debug({ err });
                (0, spinner_util_js_1.spinnerError)(err?.message);
            }
        }
    }
    catch (err) {
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
const program = new cmd.Command("bdcli account password")
    .addOption(new cmd.Option("--recover", "Start password recovery process instead"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
