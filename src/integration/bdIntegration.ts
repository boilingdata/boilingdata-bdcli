import { ILogger } from "../bdcli/utils/logger_util.js";
import { BDIamRole } from "./aws/iam_roles.js";
import { BDAccount } from "./boilingdata/account.js";
import { GRANT_PERMISSION, IStatement, IStatementExt } from "./boilingdata/dataset.interface.js";
import { BDDataSourceConfig } from "./boilingdata/dataset.js";

const RO_ACTIONS = ["s3:GetObject"];
const WO_ACTIONS = ["s3:PutObject"];
const RW_ACTIONS = ["s3:PutObject", "s3:GetObject"];
const BUCKET_ACTIONS = ["s3:ListBucket", "s3:GetBucketLocation", "s3:GetBucketRequestPayment"];

export interface IBDIntegration {
  logger: ILogger;
  bdAccount: BDAccount;
  bdRole: BDIamRole;
  bdDataSources: BDDataSourceConfig;
}

interface IGroupedDataSources {
  readOnly: IStatementExt[];
  readWrite: IStatementExt[];
  writeOnly: IStatementExt[];
}

export class BDIntegration {
  private logger: ILogger;
  private bdDatasets: BDDataSourceConfig;

  constructor(private params: IBDIntegration) {
    this.logger = this.params.logger;
    this.bdDatasets = this.params.bdDataSources;
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
    if (Array.isArray(datasets) && datasets.length > 0)
      return { Effect: "Allow", Action: actions, Resource: func(datasets) };
  }

  public getGroupedBuckets(): IGroupedDataSources {
    const dataSourcesConfig = this.bdDatasets.getDatasourcesConfig();
    const allPolicies: IStatement[] = [];
    dataSourcesConfig.dataSources.forEach(ds =>
      ds.permissions.forEach(perm => {
        if (!perm.accessRights) perm.accessRights = [GRANT_PERMISSION.G_READ]; // default
        allPolicies.push(perm);
      }),
    );
    this.logger.debug({ allPolicies });
    if (allPolicies.some(policy => !policy.accessRights)) throw new Error("Missing policy permissions");
    const readOnly = allPolicies
      .filter(
        policy =>
          !policy.accessRights?.includes(GRANT_PERMISSION.G_WRITE) &&
          policy.accessRights?.includes(GRANT_PERMISSION.G_READ),
      )
      .map(policy => ({
        ...policy,
        bucket: new URL(policy.urlPrefix).host,
        prefix: new URL(policy.urlPrefix).pathname.substring(1),
      }));
    const readWrite = allPolicies
      .filter(
        policy =>
          policy.accessRights?.includes(GRANT_PERMISSION.G_WRITE) &&
          policy.accessRights?.includes(GRANT_PERMISSION.G_READ),
      )
      .map(policy => ({
        ...policy,
        bucket: new URL(policy.urlPrefix).host,
        prefix: new URL(policy.urlPrefix).pathname.substring(1),
      }));
    const writeOnly = allPolicies
      .filter(
        policy =>
          policy.accessRights?.includes(GRANT_PERMISSION.G_WRITE) &&
          !policy.accessRights?.includes(GRANT_PERMISSION.G_READ),
      )
      .map(policy => ({
        ...policy,
        bucket: new URL(policy.urlPrefix).host,
        prefix: new URL(policy.urlPrefix).pathname.substring(1),
      }));

    return { readOnly, readWrite, writeOnly };
  }

  public async getPolicyDocument(haveListBucketsPolicy = true): Promise<any> {
    this.logger.debug({ haveListBucketsPolicy });
    const grouped = this.getGroupedBuckets();
    const allDatasets = [...grouped.readOnly, ...grouped.readWrite, ...grouped.writeOnly];
    const Statements = [];
    Statements.push(this.getStatement(grouped.readOnly, RO_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
    Statements.push(this.getStatement(grouped.readWrite, RW_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
    Statements.push(this.getStatement(grouped.writeOnly, WO_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
    Statements.push(this.getStatement(allDatasets, BUCKET_ACTIONS, this.mapDatasetsToUniqBuckets.bind(this)));
    if (haveListBucketsPolicy) {
      // This is so that you can run: SELECT * FROM list('s3://')
      Statements.push({
        Effect: "Allow",
        Action: "s3:ListAllMyBuckets",
        Resource: "*",
      });
    }
    const finalPolicy = { Version: "2012-10-17", Statement: Statements.filter(s => s?.Resource?.length) };
    this.logger.debug({ getPolicyDocument: JSON.stringify(finalPolicy) });
    return finalPolicy;
  }
}
