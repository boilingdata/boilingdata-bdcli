export enum EDataSetType {
  S3 = "s3",
}

export enum ESessionType {
  STS = "sts",
  ASSUME_ROLE = "assume_role",
}

export enum EPermission {
  READ = "read",
  WRITE = "write",
}

export interface IDataSet {
  name: string;
  bucket: string;
  sessionStype?: ESessionType;
  type?: EDataSetType;
  prefix?: string;
  permissions?: EPermission[];
}

export interface IDataSets {
  datasets: Array<IDataSet>;
}
