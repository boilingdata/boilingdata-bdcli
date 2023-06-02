/// <reference lib="dom" />
import * as util from "util";
import * as cmd from "commander";
import { getApiKey, getIdToken } from "./utils/auth_utils";
import { getReqHeaders } from "./utils/http_utils";

// import diagnosticsChannel from "diagnostics_channel";
// diagnosticsChannel.channel("undici:request:create").subscribe((request) => {
//   console.log(request); // e.g. 'bar: bar\r\nhello: world\r\n'
// });

const apiUrl = "https://ijdz5e8kp9.execute-api.eu-west-1.amazonaws.com/dev/data-sets/test";

const program = new cmd.Command();
program
  .option("-v, --verbose", "more logging", false)
  .option("-c, --catalog <catalog>", "catalog name", "default")
  .option("-d, --dataset <dataset>", "dataset name")
  .version("0.0.1")
  .parse(process.argv);

const options = program.opts();
if (options.verbose) console.log({ options });

async function main(): Promise<void> {
  const token = await getIdToken();
  const apikey = await getApiKey();
  const headers = await getReqHeaders(token, apikey);
  const body = JSON.stringify({ testing: true });
  let res = await fetch(apiUrl, { method: "PUT", headers, body });
  console.log(util.inspect({ status: res.status, statusText: res.statusText }, false, 20, true));
  res = await fetch(apiUrl, { method: "GET", headers });
  console.log(util.inspect({ status: res.status, statusText: res.statusText }, false, 20, true));
}

main();
