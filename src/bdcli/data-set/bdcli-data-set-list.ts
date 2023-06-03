/// <reference lib="dom" />
import * as util from "util";
import { Command } from "commander";
import { getApiKey, getIdToken } from "../../utils/auth_utils";
import { dataSetsUrl, getReqHeaders } from "../../utils/http_utils";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util";
// import { channel } from "node:diagnostics_channel";

async function list(): Promise<void> {
  updateSpinnerText("Processing ");
  try {
    const token = await getIdToken();
    const apikey = await getApiKey();
    const headers = await getReqHeaders(token, apikey);
    const url = dataSetsUrl + "test";
    // channel("undici:request:create").subscribe(console.log);
    const res = await fetch(url, { method: "GET", headers });
    console.log(util.inspect({ status: res.status, statusText: res.statusText }, false, 20, true));
    spinnerSuccess();
  } catch (err: any) {
    spinnerError(err);
  }
}

const program = new Command("bdcli data-set list").option("-a, --all", "list all data sets", true).action(list);

(async () => await program.parseAsync(process.argv))();
