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
const sandbox_js_1 = require("../../../integration/boilingdata/sandbox.js");
const fs = __importStar(require("fs/promises"));
const logger = (0, logger_util_js_1.getLogger)("bdcli-sandbox-validate");
async function show(options, _command) {
    try {
        options = await (0, config_util_js_1.combineOptsWithSettings)(options, logger);
        const filename = options.name + ".yaml";
        let fileAlreadyExists = false;
        try {
            if (!options.stdout && (await fs.lstat(filename))) {
                fileAlreadyExists = true;
            }
        }
        catch (err) {
            logger.debug({ err });
        }
        if (fileAlreadyExists) {
            (0, spinner_util_js_1.spinnerError)(`Local file ${filename} already exists`);
        }
        if (!(0, auth_util_js_1.authSpinnerWithConfigCheck)())
            return;
        const { idToken: token, cached: idCached } = await (0, auth_util_js_1.getIdToken)(logger);
        (0, spinner_util_js_1.updateSpinnerText)(`Authenticating: ${idCached ? "cached" : "success"}`);
        (0, spinner_util_js_1.spinnerSuccess)();
        (0, spinner_util_js_1.updateSpinnerText)(`Downloading sandbox IaC template of ${options.name}`);
        const bdSandbox = new sandbox_js_1.BDSandbox({ logger, authToken: token });
        const template = await bdSandbox.downloadTemplate(options.name, options.version, options?.status ?? "uploaded");
        if (options.stdout)
            console.log(template);
        else
            await fs.writeFile(filename, template);
        (0, spinner_util_js_1.spinnerSuccess)();
    }
    catch (err) {
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
const program = new cmd.Command("bdcli sandbox download")
    .addOption(new cmd.Option("--name <templateName>", "template name from listing").makeOptionMandatory())
    .addOption(new cmd.Option("--status <status>", "Download 'uploaded' (default) or 'deployed' template"))
    .addOption(new cmd.Option("--version <version>", "Download specific version from listing"))
    .addOption(new cmd.Option("--stdout", "Spill out the template to stdout instead of writing to file"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
