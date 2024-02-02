import * as util from "node:util";
export async function outputResults(results, flat = false) {
    if (!results)
        return;
    console.log(flat ? JSON.stringify(results) : util.inspect(results, false, 20, true));
}
