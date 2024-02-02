/**
 * This module was automatically generated by `ts-interface-builder`
 */
import * as t from "ts-interface-checker";
// tslint:disable:object-literal-key-quotes
export const GRANT_PERMISSION = t.enumtype({
    "G_WRITE": "write",
    "G_READ": "read",
});
export const FILE_TYPE = t.enumtype({
    "PARQUET": "parquet",
    "JSON": "json",
    "CSV": "csv",
});
export const UGrant = t.union(t.enumlit("GRANT_PERMISSION", "G_READ"), t.enumlit("GRANT_PERMISSION", "G_WRITE"));
export const IStatement = t.iface([], {
    "urlPrefix": "string",
    "accessRights": t.opt(t.array("UGrant")),
});
export const IStatementExt = t.iface(["IStatement"], {
    "bucket": "string",
    "prefix": "string",
});
export const IDataSet = t.iface([], {
    "name": "string",
    "urlPrefix": "string",
});
export const IDataSource = t.iface([], {
    "name": "string",
    "permissions": t.array("IStatement"),
});
export const IDataSources = t.iface([], {
    "version": t.opt(t.union("string", "number")),
    "uniqNamePart": t.opt("string"),
    "dataSources": t.array("IDataSource"),
});
const exportedTypeSuite = {
    GRANT_PERMISSION,
    FILE_TYPE,
    UGrant,
    IStatement,
    IStatementExt,
    IDataSet,
    IDataSource,
    IDataSources,
};
export default exportedTypeSuite;
