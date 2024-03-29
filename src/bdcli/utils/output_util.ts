import * as util from "node:util";

export async function outputResults(results: any, flat = false): Promise<void> {
  if (!results) return;
  console.log(flat ? JSON.stringify(results) : util.inspect(results, false, 20, true));
}
