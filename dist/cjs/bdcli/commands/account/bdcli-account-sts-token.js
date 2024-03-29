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
const account_js_1 = require("../../../integration/boilingdata/account.js");
const fs = __importStar(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const yaml_utils_js_1 = require("../../utils/yaml_utils.js");
const output_util_js_1 = require("../../utils/output_util.js");
const config_util_js_1 = require("../../utils/config_util.js");
const logger = (0, logger_util_js_1.getLogger)("bdcli-account-token");
const macroHeader = "-- BoilingData DuckDB Table Macro START";
const macroFooter = "-- BoilingData DuckDB Table Macro END";
const rcFilePath = path_1.default.join(process.env["HOME"] ?? "~", ".duckdbrc");
function getMacro(token, encodings = true) {
    const aliases = ["boilingdata", "boiling", "bd"];
    const encodingMap = [
        [">", "%3E"],
        ["<", "%3C"],
        ["\\|", "%7C"],
    ];
    const getEncoded = () => encodingMap.reduce((prev, curr) => `regexp_replace(${prev}, '${curr[0]}', '${curr[1]}', 'g')`, "sql");
    const sqlParam = encodings ? getEncoded() : `sql`;
    return (`\n${macroHeader}\n` +
        aliases
            .map((alias) => {
            return (`CREATE OR REPLACE TEMP MACRO ${alias}(sql) AS TABLE ` +
                `SELECT * FROM parquet_scan('https://httpfs.api.test.boilingdata.com/httpfs?bdStsToken=` +
                token +
                `&sql=' || ${sqlParam});`);
        })
            .join("\n") +
        `\n${macroFooter}\n`);
}
async function show(options, _command) {
    try {
        options = await (0, config_util_js_1.combineOptsWithSettings)(options, logger);
        const encodings = options.duckdbrcDisableEncode != true;
        if (options.lifetime)
            await (0, auth_util_js_1.validateTokenLifetime)(options.lifetime);
        if (!(0, auth_util_js_1.authSpinnerWithConfigCheck)())
            return;
        const { idToken: token, cached: idCached, region } = await (0, auth_util_js_1.getIdToken)(logger);
        (0, spinner_util_js_1.updateSpinnerText)(`Authenticating: ${idCached ? "cached" : "success"}`);
        (0, spinner_util_js_1.spinnerSuccess)();
        (0, spinner_util_js_1.updateSpinnerText)(`Getting BoilingData STS token`);
        if (!region)
            throw new Error("Pass --region parameter or set AWS_REGION env");
        const bdAccount = new account_js_1.BDAccount({ logger, authToken: token });
        const { bdStsToken, cached: stsCached, ...rest } = await bdAccount.getStsToken(options.lifetime ?? "1h");
        (0, spinner_util_js_1.updateSpinnerText)(`Getting BoilingData STS token: ${stsCached ? "cached" : "success"}`);
        (0, spinner_util_js_1.spinnerSuccess)();
        if (options.dbtprofiles) {
            (0, spinner_util_js_1.updateSpinnerText)(`Storing Boiling token into DBT profiles file: ${options.dbtprofiles}`);
            await (0, yaml_utils_js_1.updateBoilingToken)(options.dbtprofiles, { token: bdStsToken });
            (0, spinner_util_js_1.spinnerSuccess)();
        }
        if (options.duckdbMacro) {
            await (0, output_util_js_1.outputResults)({ bdStsToken, duckDbMacro: getMacro(bdStsToken, encodings), ...rest }, options.disableSpinner);
        }
        if (options.duckdbrc) {
            (0, spinner_util_js_1.updateSpinnerText)("Storing DuckDB BoilingData TABLE MACRO");
            let rcContents = "";
            try {
                rcContents = (await fs.readFile(rcFilePath)).toString("utf8");
            }
            catch (err) {
                if (err.code !== "ENOENT")
                    throw err;
            }
            const hasMacro = rcContents.includes(macroHeader);
            // eslint-disable-next-line no-useless-escape
            //const regex = new RegExp("([\s\S]*)" + macroFooter, "gm");
            const newContents = hasMacro
                ? rcContents.replace(/\n-- BoilingData DuckDB Table Macro START([\s\S]*)-- BoilingData DuckDB Table Macro END[\n]*/gm, getMacro(bdStsToken, encodings))
                : rcContents + "\n" + getMacro(bdStsToken, encodings);
            logger.debug({ rcContents, hasMacro, newContents });
            await fs.writeFile(rcFilePath, newContents, { mode: 0o600 });
            (0, spinner_util_js_1.spinnerSuccess)();
        }
        if (options.dbtprofiles) {
            (0, spinner_util_js_1.updateSpinnerText)(`Storing Boiling token into DBT profiles file: ${options.dbtprofiles}`);
            await (0, yaml_utils_js_1.updateBoilingToken)(options.dbtprofiles, { token: bdStsToken });
            (0, spinner_util_js_1.spinnerSuccess)();
        }
        if (!options.duckdbrc && !options.dbtprofiles && !options.duckdbMacro) {
            await (0, output_util_js_1.outputResults)({ bdStsToken, cached: stsCached, ...rest }, options.disableSpinner);
        }
    }
    catch (err) {
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
const program = new cmd.Command("bdcli account sts-token")
    .addOption(new cmd.Option("--duckdb-macro", "Output copy-pasteable DuckDB boilingdata() temporary TABLE MACRO " +
    "with the auth token in place.\n\tMacro usage example for full query pushdown to Boiling cloud:\n" +
    "\t\"SELECT * FROM boilingdata('SELECT * FROM " +
    "parquet_scan(''s3://boilingdata-demo/demo.parquet'') LIMIT 10');\""))
    .addOption(new cmd.Option("--dbtprofiles <profilesFilePath>", "Upsert Boiling credentials into DBT profiles YAML configuration file. " +
    "\n\tExpects 'module: boilingdata' entry and upserts its config.token value"))
    .addOption(new cmd.Option("--duckdbrc", "Upsert DuckDB boilingdata() temporary TABLE MACRO " + "with the auth token in place into ~/.duckdbrc file"))
    .addOption(new cmd.Option("--duckdbrc-disable-encode", "Disable SQL URL encoding with regexp_replace on the MACRO"))
    .addOption(new cmd.Option("--lifetime <lifetime>", "Expiration lifetime for the token, in string format, like '1h' (see https://github.com/vercel/ms)"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
