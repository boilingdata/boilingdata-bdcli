/// <reference lib="dom" />
import { getLogger } from "../../utils/logger_util.js";
import { Command } from "commander";
import { spinnerError, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";

const logger = getLogger("bdcli-data-source");

async function create(...args: any): Promise<void> {
  try {
    logger.debug({ args: args[0] });
    updateSpinnerText("Not supported yet ");
    spinnerWarn("Not supported yet ");
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new Command("bdcli data-set create").action(async () => await create());

addGlobalOptions(program, logger);

(async () => await program.parseAsync())();
