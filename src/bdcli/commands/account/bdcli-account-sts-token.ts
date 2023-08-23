import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";

const logger = getLogger("bdcli-account-sts-token");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    logger.debug({ options });

    updateSpinnerText("Authenticating");
    const { idToken: token, cached: idCached, region } = await getIdToken(logger);
    updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
    spinnerSuccess();

    updateSpinnerText("Getting BoilingData STS token");
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    const bdAccount = new BDAccount({ logger, authToken: token });
    const { bdStsToken, cached: stsCached } = await bdAccount.getStsToken();
    updateSpinnerText(`Getting BoilingData STS token: ${stsCached ? "cached" : "success"}`);
    spinnerSuccess();
    if (options.duckDbMacro || options.duckdbMacro) {
      console.log(
        JSON.stringify({
          stsToken: bdStsToken,
          duckDbMacro:
            `CREATE OR REPLACE TEMP MACRO boilingdata(sql) AS TABLE ` +
            `SELECT * FROM parquet_scan('https://httpfs.api.test.boilingdata.com/httpfs?bdStsToken=` +
            bdStsToken +
            `&sql=' || sql);`,
        }),
      );
    } else {
      console.log(JSON.stringify({ bdStsToken }));
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
        "with the auth token in place.\n\tMacro usage example:\n" +
        "\t\"SELECT * FROM boilingdata('SELECT * FROM " +
        "parquet_scan(''s3://boilingdata-demo/demo.parquet'') LIMIT 10');\"",
    ),
  )
  .addOption(new cmd.Option("--clear", "Clear cached tokens"))
  .action(async (options, command) => await show(options, command));

addGlobalOptions(program, logger);

(async () => await program.parseAsync(process.argv))();
