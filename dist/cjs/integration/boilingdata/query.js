"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBoilingQuery = void 0;
const node_boilingdata_1 = require("@boilingdata/node-boilingdata");
async function runBoilingQuery(sql, idToken, region, logger) {
    try {
        logger.debug({ sql, idToken, region });
        const bdInstance = new node_boilingdata_1.BoilingData({
            logLevel: "error",
            region: region,
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
    }
    catch (err) {
        logger.error(err);
    }
    return [];
}
exports.runBoilingQuery = runBoilingQuery;
