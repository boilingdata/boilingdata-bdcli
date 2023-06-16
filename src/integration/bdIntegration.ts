import { ILogger } from "../bdcli/utils/logger_util.js";
import { BDIamRole } from "./aws/iam_roles.js";
import { BDAccount } from "./boilingdata/account.js";
import { G_WRITE, G_READ, IStatementExt } from "./boilingdata/dataset.interface.js";
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

interface IGroupedDataSources {
  readOnly: IStatementExt[];
  readWrite: IStatementExt[];
  writeOnly: IStatementExt[];
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

  private mapDatasetsToUniqBuckets(statements: IStatementExt[]): string[] {
    const uniqBuckets = [...new Set(statements.map(policy => policy.bucket))];
    return uniqBuckets.map(bucket => `arn:aws:s3:::${bucket}`);
  }

  private mapAccessPolicyToS3Resource(statements: IStatementExt[]): string[] {
    return statements.map(stmt => `arn:aws:s3:::${stmt.bucket}/${stmt.prefix}*`);
  }

  private getStatement(
    datasets: IStatementExt[],
    actions: string[],
    func: (datasets: IStatementExt[]) => string[],
  ): any {
    return { Effect: "Allow", Action: actions, Resource: func(datasets) };
  }

  public getGroupedBuckets(): IGroupedDataSources {
    const dataSourcesConfig = this.bdDatasets.dataSourcesConfig;
    const allPolicies = dataSourcesConfig.dataSources.map(d => d.accessPolicy).flat();
    const readOnly = allPolicies
      .filter(policy => !policy.permissions?.includes(G_WRITE) && policy.permissions?.includes(G_READ))
      .map(policy => ({
        ...policy,
        bucket: new URL(policy.urlPrefix).host,
        prefix: new URL(policy.urlPrefix).pathname.substring(1),
      }));
    const readWrite = allPolicies
      .filter(policy => policy.permissions?.includes(G_WRITE) && policy.permissions?.includes(G_READ))
      .map(policy => ({
        ...policy,
        bucket: new URL(policy.urlPrefix).host,
        prefix: new URL(policy.urlPrefix).pathname.substring(1),
      }));
    const writeOnly = allPolicies
      .filter(policy => policy.permissions?.includes(G_WRITE) && !policy.permissions?.includes(G_READ))
      .map(policy => ({
        ...policy,
        bucket: new URL(policy.urlPrefix).host,
        prefix: new URL(policy.urlPrefix).pathname.substring(1),
      }));

    return { readOnly, readWrite, writeOnly };
  }

  public async getPolicyDocument(): Promise<any> {
    const grouped = this.getGroupedBuckets();
    const allDatasets = [...grouped.readOnly, ...grouped.readWrite, ...grouped.writeOnly];
    const Statement = [];
    Statement.push(this.getStatement(grouped.readOnly, RO_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
    Statement.push(this.getStatement(grouped.readWrite, RW_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
    Statement.push(this.getStatement(grouped.writeOnly, WO_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
    Statement.push(this.getStatement(allDatasets, BUCKET_ACTIONS, this.mapDatasetsToUniqBuckets.bind(this)));
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