/// <reference lib="dom" />
import { getLogger } from "../../utils/logger_util.js";
import { Command } from "commander";
import { dataSetsUrl, getReqHeaders } from "../../utils/http_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
// import { channel } from "node:diagnostics_channel";

const logger = getLogger("bdcli-data-set");

async function create(...args: any): Promise<void> {
  try {
    logger.debug({ args: args[0] });
    //channel("undici:request:create").subscribe(console.log);
    updateSpinnerText("Authenticating ");
    const token = await getIdToken();
    spinnerSuccess();
    updateSpinnerText("Creating data-set ");
    const body = JSON.stringify({ testing: true });
    const res = await fetch(dataSetsUrl + "test", { method: "PUT", headers: await getReqHeaders(token), body });
    spinnerSuccess();
    logger.info({ status: res.status, statusText: res.statusText });
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new Command("bdcli data-set create").action(async () => await create());

addGlobalOptions(program, logger);

(async () => await program.parseAsync())();
