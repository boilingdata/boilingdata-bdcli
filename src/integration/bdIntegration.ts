import { ILogger } from "../bdcli/utils/logger_util.js";
import { BDIamRole } from "./aws/iam_roles.js";
import { BDAccount } from "./boilingdata/account.js";
import { EGrant, IDataSet } from "./boilingdata/dataset.interface.js";
import { BDDataSetConfig } from "./boilingdata/dataset.js";

const RO_ACTIONS = ["s3:GetObject"];
const WO_ACTIONS = ["s3:PutObject"];
const RW_ACTIONS = ["s3:PutObject", "s3:GetObject"];
const BUCKET_ACTIONS = ["s3:ListBucket", "s3:GetBucketLocation", "s3:GetBucketRequestPayment"];

export interface IBDIntegration {
  logger: ILogger;
  bdAccount: BDAccount;
  bdRole: BDIamRole;
  bdDataSets: BDDataSetConfig;
}

interface IGroupedDataSets {
  readOnly: IDataSet[];
  readWrite: IDataSet[];
  writeOnly: IDataSet[];
}

export class BDIntegration {
  private logger: ILogger;
  // private bdAccount: BDAccount;
  // private bdRole: BDIamRole;
  private bdDatasets: BDDataSetConfig;

  constructor(private params: IBDIntegration) {
    this.logger = this.params.logger;
    // this.bdAccount = this.params.bdAccount;
    // this.bdRole = this.params.bdRole;
    this.bdDatasets = this.params.bdDataSets;
    // this.logger.debug({ account: this.bdAccount, role: this.bdRole, datasets: this.bdDatasets });
  }

  private async mapDatasetsToUniqBuckets(datasets: IDataSet[]): Promise<string[]> {
    const uniqBuckets = [...new Set(datasets.map(dataset => dataset.bucket))];
    return uniqBuckets.map(bucket => [`arn:aws:s3:::${bucket}`]).flat();
  }

  private async mapDatasetsToS3Resource(datasets: IDataSet[]): Promise<string[]> {
    return datasets
      .map(dataset => [
        `arn:aws:s3:::${dataset.bucket}`,
        dataset.prefix ? `arn:aws:s3:::${dataset.bucket}/${dataset.prefix}*` : "",
      ])
      .flat()
      .filter(d => d != "");
  }

  private async getStatement(
    datasets: IDataSet[],
    actions: string[],
    func: (datasets: IDataSet[]) => Promise<string[]>,
  ): Promise<any> {
    return {
      Effect: "Allow",
      Action: actions,
      Resource: await func(datasets),
    };
  }

  private getGroupedBuckets(): IGroupedDataSets {
    const dataSetConfig = this.bdDatasets.dataSetConfig;
    const readOnly = dataSetConfig.datasets.filter(
      dataset => !dataset.permissions?.includes(EGrant.WRITE) && dataset.permissions?.includes(EGrant.READ),
    );
    const readWrite = dataSetConfig.datasets.filter(
      dataset => dataset.permissions?.includes(EGrant.WRITE) && dataset.permissions?.includes(EGrant.READ),
    );
    const writeOnly = dataSetConfig.datasets.filter(
      dataset => dataset.permissions?.includes(EGrant.WRITE) && !dataset.permissions?.includes(EGrant.READ),
    );
    return { readOnly, readWrite, writeOnly };
  }

  public async getPolicyDocument(): Promise<any> {
    const grouped = this.getGroupedBuckets();
    const allDatasets = [...grouped.readOnly, ...grouped.readWrite, ...grouped.writeOnly];
    const Statement = [];
    Statement.push(await this.getStatement(grouped.readOnly, RO_ACTIONS, this.mapDatasetsToS3Resource.bind(this)));
    Statement.push(await this.getStatement(grouped.readWrite, RW_ACTIONS, this.mapDatasetsToS3Resource.bind(this)));
    Statement.push(await this.getStatement(grouped.writeOnly, WO_ACTIONS, this.mapDatasetsToS3Resource.bind(this)));
    Statement.push(await this.getStatement(allDatasets, BUCKET_ACTIONS, this.mapDatasetsToUniqBuckets.bind(this)));
    Statement.push({
      Effect: "Allow",
      Action: "s3:ListAllMyBuckets",
      Resource: "*",
    });
    const finalPolicy = { Version: "2012-10-17", Statement: Statement.filter(s => s.Resource.length) };
    this.logger.debug({ getPolicyDocument: JSON.stringify(finalPolicy) });
    return finalPolicy;
  }
}
