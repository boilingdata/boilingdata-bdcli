export declare enum EDataSetType {
    S3 = "s3"
}
export declare const G_WRITE = "write";
export declare const G_READ = "read";
export type USessionType = "sts" | "assumeRole";
export type UGrant = "read" | "write";
export type ULayout = "hive" | "folder" | "file";
export type UFileType = "parquet" | "json" | "csv";
export interface IStatement {
    id: string;
    urlPrefix: string;
    permissions?: UGrant[];
}
export interface IStatementExt extends IStatement {
    bucket: string;
    prefix: string;
}
export interface IDataSet {
    name: string;
    urlPrefix: string;
    layout?: ULayout;
    filetype?: UFileType;
}
export interface IDataSource {
    name: string;
    type: EDataSetType;
    accessPolicy: Array<IStatement>;
    dataSets?: Array<IDataSet>;
    sessionType?: USessionType;
}
export interface IDataSources {
    version?: string | number;
    uniqNamePart?: string;
    dataSources: Array<IDataSource>;
}
