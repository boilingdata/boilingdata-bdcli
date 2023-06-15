export enum EDataSetType {
  S3 = "s3",
}

export type USessionType = "sts" | "assumeRole";
export type UGrant = "read" | "write";
export type ULayout = "hive" | "folder" | "file";
export type UFileType = "parquet" | "json" | "csv";

export interface IStatement {
  id: string;
  bucket: string;
  prefix?: string;
  permissions?: UGrant[];
}

export interface IDataSet {
  name: string;
  url: string;
  folder?: boolean;
  layout?: ULayout;
  filetype?: UFileType;
}

export interface IDataSource {
  name: string;
  type: EDataSetType;
  accessPolicy: Array<IStatement>;
  dataSets: Array<IDataSet>;
  sessionType?: USessionType;
}

export interface IDataSources {
  dataSources: Array<IDataSource>;
}
