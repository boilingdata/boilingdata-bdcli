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
const macroHeader = "-- BoilingData DuckDB Table Macro START";
const macroFooter = "-- BoilingData DuckDB Table Macro END";
const rcFilePath = path.join(process.env["HOME"] ?? "~", ".duckdbrc");

function getMacro(token: string, encodings = true): string {
  const aliases = ["boilingdata", "boiling", "bd"];
  const encodingMap = [
    [">", "%3E"],
    ["<", "%3C"],
    ["\\|", "%7C"],
  ];
  const getEncoded = (): string =>
    encodingMap.reduce((prev, curr) => `regexp_replace(${prev}, '${curr[0]}', '${curr[1]}', 'g')`, "sql");
  const sqlParam = encodings ? getEncoded() : `sql`;
  return (
    `\n${macroHeader}\n` +
    aliases
      .map((alias: string) => {
        return (
          `CREATE OR REPLACE TEMP MACRO ${alias}(sql) AS TABLE ` +
          `SELECT * FROM parquet_scan('https://httpfs.api.test.boilingdata.com/httpfs?bdStsToken=` +
          token +
          `&sql=' || ${sqlParam});`
        );
      })
      .join("\n") +
    `\n${macroFooter}\n`
  );
}

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);
    const encodings = options.duckdbrcDisableEncode != true;

    if (options.lifetime) await validateTokenLifetime(options.lifetime);

    updateSpinnerText("Authenticating");
    const { idToken: token, cached: idCached, region } = await getIdToken(logger);
    updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
    spinnerSuccess();

    updateSpinnerText(`Getting BoilingData STS token`);
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
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
      await outputResults(
        { bdStsToken, duckDbMacro: getMacro(bdStsToken, encodings), ...rest },
        options.disableSpinner,
      );
    }

    if (options.duckdbrc) {
      updateSpinnerText("Storing DuckDB BoilingData TABLE MACRO");
      let rcContents = "";
      try {
        rcContents = (await fs.readFile(rcFilePath)).toString("utf8");
      } catch (err: any) {
        if (err.code !== "ENOENT") throw err;
      }
      const hasMacro = rcContents.includes(macroHeader);
      // eslint-disable-next-line no-useless-escape
      //const regex = new RegExp("([\s\S]*)" + macroFooter, "gm");
      const newContents = hasMacro
        ? rcContents.replace(
            /\n-- BoilingData DuckDB Table Macro START([\s\S]*)-- BoilingData DuckDB Table Macro END[\n]*/gm,
            getMacro(bdStsToken, encodings),
          )
        : rcContents + "\n" + getMacro(bdStsToken, encodings);
      logger.debug({ rcContents, hasMacro, newContents });
      await fs.writeFile(rcFilePath, newContents, { mode: 0o600 });
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
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli account sts-token")
  .addOption(
    new cmd.Option(
      "--duckdb-macro",
      "Output copy-pasteable DuckDB boilingdata() temporary TABLE MACRO " +
        "with the auth token in place.\n\tMacro usage example for full query pushdown to Boiling cloud:\n" +
        "\t\"SELECT * FROM boilingdata('SELECT * FROM " +
        "parquet_scan(''s3://boilingdata-demo/demo.parquet'') LIMIT 10');\"",
    ),
  )
  .addOption(
    new cmd.Option(
      "--dbtprofiles <profilesFilePath>",
      "Upsert Boiling credentials into DBT profiles YAML configuration file. " +
        "\n\tExpects 'module: boilingdata' entry and upserts its config.token value",
    ),
  )
  .addOption(
    new cmd.Option(
      "--duckdbrc",
      "Upsert DuckDB boilingdata() temporary TABLE MACRO " + "with the auth token in place into ~/.duckdbrc file",
    ),
  )
  .addOption(new cmd.Option("--duckdbrc-disable-encode", "Disable SQL URL encoding with regexp_replace on the MACRO"))
  .addOption(
    new cmd.Option(
      "--lifetime <lifetime>",
      "Expiration lifetime for the token, in string format, like '1h' (see https://github.com/vercel/ms)",
    ),
  )
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
