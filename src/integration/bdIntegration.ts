import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { ILogger } from "../bdcli/utils/logger_util.js";
import { BDIamRole } from "./aws/iam_role.js";
import { BDAccount } from "./boilingdata/account.js";
import { GRANT_PERMISSION, IStatement, IStatementExt } from "./boilingdata/dataset.interface.js";
import { BDDataSourceConfig } from "./boilingdata/dataset.js";

const RO_ACTIONS = ["s3:GetObject"];
const WO_ACTIONS = ["s3:PutObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"];
const RW_ACTIONS = [...RO_ACTIONS, ...WO_ACTIONS];
const BUCKET_ACTIONS = [
  "s3:ListBucket",
  "s3:GetBucketLocation",
  "s3:GetBucketRequestPayment",
  "s3:ListBucketMultipartUploads",
];

export interface IBDIntegration {
  logger: ILogger;
  stsClient: STSClient;
  bdAccount: BDAccount;
  bdRole: BDIamRole;
  bdDataSources?: BDDataSourceConfig;
}

interface IGroupedDataSources {
  readOnly: IStatementExt[];
  readWrite: IStatementExt[];
  writeOnly: IStatementExt[];
}

export class BDIntegration {
  private logger: ILogger;
  private bdDatasets: BDDataSourceConfig | undefined;
  private callerIdAccount!: string | undefined;

  constructor(private params: IBDIntegration) {
    this.logger = this.params.logger;
    this.bdDatasets = this.params?.bdDataSources;
  }

  private mapDatasetsToUniqBuckets(statements: IStatementExt[]): string[] {
    const uniqBuckets = [...new Set(statements.map(policy => policy.bucket))];
    return uniqBuckets.map(bucket => `arn:aws:s3:::${bucket}`);
  }

  private mapAccessPolicyToS3Resource(statements: IStatementExt[]): string[] {
    return statements.map(stmt => `arn:aws:s3:::${stmt.bucket}/${stmt.prefix}*`);
  }

  private async getCustomerAccountId(): Promise<string> {
    if (this.callerIdAccount) return this.callerIdAccount;
    const cmd = new GetCallerIdentityCommand({});
    const res = await this.params.stsClient.send(cmd);
    this.logger.debug({ res });
    if (!res.Account) throw new Error("Could not get caller identity AWS Account");
    this.callerIdAccount = res.Account;
    return res.Account;
  }

  private getTapsStatements(customerAccountId: string): any[] {
    const logsActions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams",
      "logs:TagResource",
      "logs:PutSubscriptionFilter",
    ];

    const iamActions = ["iam:PassRole", "iam:CreateRole", "iam:TagRole"];
    const iamResources = [`arn:aws:iam::${customerAccountId}:role/bd_*`];

    const lambdaActions = ["lambda:*"];
    const lambdaResources = [
      `arn:aws:lambda:*:${customerAccountId}:function/bd_*`,
      `arn:aws:lambda:*:${customerAccountId}:layer/bd_*`,
    ];

    return [
      { Effect: "Allow", Action: logsActions, Resource: "*" },
      {
        Effect: "Allow",
        Action: iamActions,
        Resource: iamResources,
      },
      {
        Effect: "Allow",
        Action: lambdaActions,
        Resource: lambdaResources,
      },
    ];
  }

  private getS3Statement(
    datasets: IStatementExt[],
    actions: string[],
    func: (datasets: IStatementExt[]) => string[],
  ): any {
    if (Array.isArray(datasets) && datasets.length > 0)
      return { Effect: "Allow", Action: actions, Resource: func(datasets) };
  }

  public getGroupedBuckets(): IGroupedDataSources {
    if (!this.bdDatasets) throw new Error("No bdDatasets found/passed");
    const dataSourcesConfig = this.bdDatasets.getDatasourcesConfig();
    const allPolicies: IStatement[] = [];
    dataSourcesConfig.dataSource.permissions.forEach(perm => {
      if (!perm.accessRights) perm.accessRights = [GRANT_PERMISSION.G_READ]; // default
      allPolicies.push(perm);
    });
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

  public async getTapsPolicyDocument(): Promise<any> {
    const Statements = [];
    Statements.push(...this.getTapsStatements(await this.getCustomerAccountId()));
    const finalPolicy = { Version: "2012-10-17", Statement: Statements.filter(s => s?.Resource?.length) };
    this.logger.debug({ getPolicyDocument: JSON.stringify(finalPolicy) });
    return finalPolicy;
  }

  public async getS3PolicyDocument(haveListBucketsPolicy = true): Promise<any> {
    this.logger.debug({ haveListBucketsPolicy });
    const grouped = this.getGroupedBuckets();
    const allDatasets = [...grouped.readOnly, ...grouped.readWrite, ...grouped.writeOnly];
    const Statements = [];
    Statements.push(this.getS3Statement(grouped.readOnly, RO_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
    Statements.push(this.getS3Statement(grouped.readWrite, RW_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
    Statements.push(this.getS3Statement(grouped.writeOnly, WO_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
    Statements.push(this.getS3Statement(allDatasets, BUCKET_ACTIONS, this.mapDatasetsToUniqBuckets.bind(this)));
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
