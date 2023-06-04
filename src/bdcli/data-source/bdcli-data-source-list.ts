/// <reference lib="dom" />
import { getLogger } from "../../utils/logger_util.js";
import { Command } from "commander";
import { spinnerError, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";

const logger = getLogger("bdcli-data-source");

async function list(_options: any, cmd: Command): Promise<void> {
  try {
    logger.debug(cmd.optsWithGlobals());
    updateSpinnerText("Not supported yet ");
    spinnerWarn("Not supported yet ");
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new Command("bdcli data-set list")
  .option("-a, --all", "list all data sets", true)
  .option("-s, --data-source", "List data sets from this data source", "default")
  .action(list);

addGlobalOptions(program, logger);

(async () => await program.parseAsync(process.argv))();
