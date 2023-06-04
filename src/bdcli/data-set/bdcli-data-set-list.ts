/// <reference lib="dom" />
import { getLogger } from "../../utils/logger_util.js";
import { Command } from "commander";
import { dataSetsUrl, getReqHeaders } from "../../utils/http_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
// import { channel } from "node:diagnostics_channel";

const logger = getLogger("bdcli-data-set");

async function list(_options: any, cmd: Command): Promise<void> {
  try {
    logger.debug(cmd.optsWithGlobals());
    // channel("undici:request:create").subscribe(console.log);
    updateSpinnerText("Authenticating ");
    const token = await getIdToken();
    spinnerSuccess();
    updateSpinnerText("Listing data-sets ");
    const res = await fetch(dataSetsUrl + "test", { method: "GET", headers: await getReqHeaders(token) });
    spinnerSuccess();
    logger.info({ status: res.status, statusText: res.statusText });
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
