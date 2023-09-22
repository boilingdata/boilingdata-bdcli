import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken, validateTokenLifetime } from "../../utils/auth_util.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";
import * as fs from "fs/promises";
import path from "path";
import { updateBoilingToken } from "../../utils/yaml_utils.js";
import { outputResults } from "../../utils/output_util.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";
const logger = getLogger("bdcli-account-token");
const macroHeader = "\n-- BoilingData DuckDB Table Macro START\n";
const macroFooter = "\n-- BoilingData DuckDB Table Macro END";
const rcFilePath = path.join(process.env["HOME"] ?? "~", ".duckdbrc");
function getMacro(token) {
    const aliases = ["boilingdata", "boiling", "bd"];
    return (`${macroHeader}` +
        aliases
            .map((alias) => {
            return (`CREATE OR REPLACE TEMP MACRO ${alias}(sql) AS TABLE ` +
                `SELECT * FROM parquet_scan('https://httpfs.api.test.boilingdata.com/httpfs?bdStsToken=` +
                token +
                `&sql=' || regexp_replace(regexp_replace(sql, '>', '%3E', 'g'), '<', '%3C', 'g'));`);
        })
            .join("\n") +
        `${macroFooter}`);
}
async function show(options, _command) {
    try {
        options = await combineOptsWithSettings(options, logger);
        if (options.lifetime)
            await validateTokenLifetime(options.lifetime);
        updateSpinnerText("Authenticating");
        const { idToken: token, cached: idCached, region } = await getIdToken(logger);
        updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
        spinnerSuccess();
        updateSpinnerText(`Getting BoilingData STS token`);
        if (!region)
            throw new Error("Pass --region parameter or set AWS_REGION env");
        const bdAccount = new BDAccount({ logger, authToken: token });
        const { bdStsToken, cached: stsCached, ...rest } = await bdAccount.getToken(options.lifetime ?? "1h");
        updateSpinnerText(`Getting BoilingData STS token: ${stsCached ? "cached" : "success"}`);
        spinnerSuccess();
        if (options.dbtprofiles) {
            updateSpinnerText(`Storing Boiling token into DBT profiles file: ${options.dbtprofiles}`);
            await updateBoilingToken(options.dbtprofiles, { token: bdStsToken });
            spinnerSuccess();
        }
        if (options.duckdbMacro) {
            await outputResults({ bdStsToken, duckDbMacro: getMacro(bdStsToken), ...rest }, options.disableSpinner);
        }
        if (options.duckdbrc) {
            updateSpinnerText("Storing DuckDB BoilingData TABLE MACRO");
            const rcContents = (await fs.readFile(rcFilePath)).toString("utf8");
            const hasMacro = rcContents.includes(macroHeader);
            const regex = new RegExp(`${macroHeader}.*${macroFooter}`, "g");
            const newContents = hasMacro
                ? rcContents.replace(regex, getMacro(bdStsToken))
                : rcContents + "\n" + getMacro(bdStsToken);
            logger.debug({ rcContents, hasMacro, newContents, regex });
            await fs.writeFile(rcFilePath, newContents);
            spinnerSuccess();
        }
        if (options.dbtprofiles) {
            updateSpinnerText(`Storing Boiling token into DBT profiles file: ${options.dbtprofiles}`);
            await updateBoilingToken(options.dbtprofiles, { token: bdStsToken });
            spinnerSuccess();
        }
        if (!options.duckdbrc && !options.dbtprofiles && !options.duckdbMacro) {
            await outputResults({ bdStsToken, cached: stsCached, ...rest }, options.disableSpinner);
        }
    }
    catch (err) {
        spinnerError(err?.message);
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
    .addOption(new cmd.Option("--lifetime <lifetime>", "Expiration lifetime for the token, in string format, like '1h' (see https://github.com/vercel/ms)"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
