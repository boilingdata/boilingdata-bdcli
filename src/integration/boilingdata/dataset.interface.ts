export enum EDataSetType {
  S3 = "s3",
}

export enum GRANT_PERMISSION {
  G_WRITE = "write",
  G_READ = "read",
}

export enum SESSION_TYPE {
  STS = "sts",
  ASSUME_ROLE = "assumeRole",
}

export enum LAYOUT {
  HIVE = "hive",
  FOLDER = "folder",
  FILE = "file",
}

export enum FILE_TYPE {
  PARQUET = "parquet",
  JSON = "json",
  CSV = "csv",
}

export type USessionType = SESSION_TYPE.STS | SESSION_TYPE.ASSUME_ROLE;
export type UGrant = GRANT_PERMISSION.G_READ | GRANT_PERMISSION.G_WRITE;
export type ULayout = LAYOUT.HIVE | LAYOUT.FOLDER | LAYOUT.FILE;
export type UFileType = FILE_TYPE.PARQUET | FILE_TYPE.JSON | FILE_TYPE.CSV;

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
  layout?: ULayout;
  filetype?: UFileType;
}

export interface IDataSource {
  name: string;
  permissions: Array<IStatement>;
}

export interface IDataSources {
  version?: string | number;
  uniqNamePart?: string;
  dataSources: IDataSource;
}
