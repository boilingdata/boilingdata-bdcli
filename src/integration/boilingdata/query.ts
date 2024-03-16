import { BoilingData } from "@boilingdata/node-boilingdata";
import { ILogger } from "../../bdcli/utils/logger_util.js";
import { BDAWSRegion } from "@boilingdata/node-boilingdata/dist/cjs/boilingdata/boilingdata.js";

export async function runBoilingQuery(sql: string, idToken: string, region: string, logger: ILogger): Promise<any[]> {
  try {
    logger.debug({ sql, idToken, region });
    const bdInstance = new BoilingData({
      logLevel: "error",
      region: <BDAWSRegion>region,
      authcontext: { idToken: { jwtToken: idToken } },
    });
    await bdInstance.connect();
    const start = Date.now();
    //const sql = `SELECT COUNT(*) FROM parquet_scan('s3://boilingdata-demo/demo.parquet');`;
    const rows = await bdInstance.execQueryPromise({ sql });
    const stop = Date.now();
    const parsedRows = JSON.parse(JSON.stringify(rows));
    logger.debug(JSON.parse(JSON.stringify(rows)));
    logger.debug("Query time measured e2e (ms):", stop - start);
    await bdInstance.close();
    return parsedRows;
  } catch (err) {
    logger.error(err);
  }
  return [];
}
