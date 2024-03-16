import * as cmd from "commander";
import { ELogLevel, getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";
import { outputResults } from "../../utils/output_util.js";
import { runBoilingQuery } from "../../../integration/boilingdata/query.js";

const logger = getLogger("bdcli-api");
logger.setLogLevel(ELogLevel.WARN);

async function query(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    updateSpinnerText("Authenticating");
    const { idToken: token, cached, region } = await getIdToken(logger);
    updateSpinnerText(cached ? "Authenticating: cached" : "Authenticating: success");
    spinnerSuccess();

    updateSpinnerText("Sending Query to Boiling API");
    const results = await runBoilingQuery(options.sql, token, region, logger);
    spinnerSuccess();
    await outputResults(results, options.disableSpinner);
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli api query")
  .addOption(new cmd.Option("-s, --sql <sqlQuery>", "SQL clause").makeOptionMandatory())
  .action(async (options, command) => await query(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
