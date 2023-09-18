import * as util from "node:util";

export async function outputResults(results: any, flat: boolean): Promise<void> {
  console.log(flat ? JSON.stringify(results) : util.inspect(results, false, 20, true));
}
