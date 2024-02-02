export declare enum GRANT_PERMISSION {
    G_WRITE = "write",
    G_READ = "read"
}
export declare enum FILE_TYPE {
    PARQUET = "parquet",
    JSON = "json",
    CSV = "csv"
}
export type UGrant = GRANT_PERMISSION.G_READ | GRANT_PERMISSION.G_WRITE;
export interface IStatement {
    urlPrefix: string;
    accessRights?: UGrant[];
}
export interface IStatementExt extends IStatement {
    bucket: string;
    prefix: string;
}
export interface IDataSet {
    name: string;
    urlPrefix: string;
}
export interface IDataSource {
    name: string;
    permissions: Array<IStatement>;
}
export interface IDataSources {
    version?: string | number;
    uniqNamePart?: string;
    dataSources: IDataSource[];
}
