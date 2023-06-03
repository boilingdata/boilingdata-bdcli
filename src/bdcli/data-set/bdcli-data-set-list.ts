/// <reference lib="dom" />
import * as util from "util";
import { Command } from "commander";
import { dataSetsUrl, getReqHeaders } from "../../utils/http_utils";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util";
// import { channel } from "node:diagnostics_channel";

async function list(): Promise<void> {
  updateSpinnerText("Listing data-sets ");
  try {
    const headers = await getReqHeaders();
    const url = dataSetsUrl + "test";
    // channel("undici:request:create").subscribe(console.log);
    const res = await fetch(url, { method: "GET", headers });
    spinnerSuccess();
    console.log(util.inspect({ status: res.status, statusText: res.statusText }, false, 20, true));
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new Command("bdcli data-set list").option("-a, --all", "list all data sets", true).action(list);

(async () => await program.parseAsync(process.argv))();
