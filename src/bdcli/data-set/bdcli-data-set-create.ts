/// <reference lib="dom" />
import * as util from "util";
import { Command } from "commander";
import { getApiKey, getIdToken } from "../../utils/auth_utils";
import { dataSetsUrl, getReqHeaders } from "../../utils/http_utils";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util";
//import { channel } from "node:diagnostics_channel";

async function create(): Promise<void> {
  updateSpinnerText("Processing ");
  try {
    const token = await getIdToken();
    const apikey = await getApiKey();
    const headers = await getReqHeaders(token, apikey);
    const body = JSON.stringify({ testing: true });
    //channel("undici:request:create").subscribe(console.log);
    const res = await fetch(dataSetsUrl + "test", { method: "PUT", headers, body });
    console.log(util.inspect({ status: res.status, statusText: res.statusText }, false, 20, true));
    spinnerSuccess();
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new Command("bdcli data-set create").action(async () => await create());

(async () => await program.parseAsync())();
