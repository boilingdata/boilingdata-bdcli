import * as util from "node:util";
export async function outputResults(results, flat) {
    console.log(flat ? JSON.stringify(results) : util.inspect(results, false, 20, true));
}
