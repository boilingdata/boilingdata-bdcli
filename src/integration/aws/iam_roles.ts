import * as iam from "@aws-sdk/client-iam";
import * as crypto from "crypto";
import * as sts from "@aws-sdk/client-sts";
import { getRegionShortName } from "./util.js";
import { ILogger } from "../../bdcli/utils/logger_util.js";

export interface Tag {
  Key: string;
  Value: string;
}

enum ENameType {
  "ROLE" = "role",
  "POLICY" = "policy",
}

export interface IBDIamRole {
  logger: ILogger;
  iamClient: iam.IAMClient;
  stsClient: sts.STSClient;
  region: string;
  uniqNamePart: string;
  assumeCondExternalId: string;
  assumeAwsAccount: string;
  path?: string;
  maxSessionDuration?: number;
  roleNamePrefix?: string;
  tags?: Tag[];
}

export class BDIamRole {
  private iamClient: iam.IAMClient;
  private stsClient: sts.STSClient;
  private logger: ILogger;
  private _iamRoleName?: string;
  private _iamManagedPolicyName?: string;
  private boilingDataTags: Tag[];
  private path: string;
  private awsAccountId?: string;
  private policyArn?: string;

  constructor(private params: IBDIamRole) {
    this.iamClient = this.params.iamClient;
    this.stsClient = this.params.stsClient;
    this.logger = this.params.logger;
    this.path = this.params.path ?? "/boilingdata/";
    if (!this.path.startsWith("/") || !this.path.endsWith("/")) throw new Error("path must start and end with /");
    this.boilingDataTags = [{ Key: "service", Value: "boilingdata" }];
  }

  private getName(type: string): string {
    const prefix = this.params.roleNamePrefix ?? "bd";
    const regionShort = getRegionShortName(this.params.region ?? process.env["AWS_REGION"] ?? "eu-west-2");
    const hash = crypto
      .createHash("md5")
      .update(
        type +
          this.path +
          prefix +
          regionShort +
          this.params.uniqNamePart +
          this.params.assumeAwsAccount +
          this.params.assumeCondExternalId +
          `${this.params.maxSessionDuration ?? "N/A"}`,
      );
    const reducedHashLength = 15;
    const nameLenSoFar = prefix.length + regionShort.length + reducedHashLength;
    const roomLeft = 64 - nameLenSoFar - 3; // "-" chars
    const dataSetShort = this.params.uniqNamePart.substring(0, roomLeft);
    return [prefix, regionShort, dataSetShort, hash.digest("hex").substring(0, 15)].join("-");
  }

  public async getAwsAccountId(): Promise<string> {
    if (this.awsAccountId) return this.awsAccountId;
    const resp = await this.stsClient.send(new sts.GetCallerIdentityCommand({}));
    this.logger.debug({ resp });
    if (!resp?.Account) throw new Error("Could not get AWS Account Id with STS get caller identity");
    this.awsAccountId = resp.Account;
    return this.awsAccountId;
  }

  // deterministic IAM Role name - max length 64 chars
  public get iamRoleName(): string {
    if (this._iamRoleName) return this._iamRoleName;
    this._iamRoleName = this.getName(ENameType.ROLE);
    if (this._iamRoleName.length > 64) throw new Error("Role name too long, bugger in code.");
    return this._iamRoleName;
  }

  public get iamManagedPolicyName(): string {
    if (this._iamManagedPolicyName) return this._iamManagedPolicyName;
    this._iamManagedPolicyName = this.getName(ENameType.POLICY);
    if (this._iamManagedPolicyName.length > 64) throw new Error("Role name too long, bugger in code.");
    return this._iamManagedPolicyName;
  }

  public getAssumeRolePolicyDocument(): object {
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: this.params.assumeAwsAccount },
          Action: "sts:AssumeRole",
          Condition: {
            StringEquals: {
              "sts:ExternalId": this.params.assumeCondExternalId,
            },
          },
        },
      ],
    };
    this.logger.debug({ policy });
    return policy;
  }

  private async _createRole(): Promise<iam.Role> {
    this.logger.debug({ _createRole: { roleName: this.iamRoleName } });
    try {
      const commandParams: iam.CreateRoleRequest = {
        Path: this.path,
        RoleName: this.iamRoleName,
        AssumeRolePolicyDocument: JSON.stringify(this.getAssumeRolePolicyDocument()),
        Tags: [...this.boilingDataTags, ...(this.params.tags ?? [])],
      };
      const resp = await this.iamClient.send(new iam.CreateRoleCommand(commandParams));
      if (!resp || !resp.Role) {
        this.logger.error({ createRoleResp: resp });
        throw new Error("IAM Role creation failed");
      }
      return resp.Role;
    } catch (err: any) {
      this.logger.error({ _createRoleError: { err } });
      throw err;
    }
  }

  private async _attachRolePolicy(): Promise<void> {
    const PolicyArn = await this._getPolicyArn();
    this.logger.debug({ _attachRolePolicy: { RoleName: this.iamRoleName, PolicyArn } });
    await this.iamClient.send(new iam.AttachRolePolicyCommand({ RoleName: this.iamRoleName, PolicyArn }));
    return;
  }

  private async _getPolicyArn(): Promise<string | undefined> {
    if (this.policyArn) return this.policyArn;
    const resp = await this.iamClient.send(new iam.ListPoliciesCommand({ PathPrefix: this.path }));
    const allBoilingDataPolicies = resp.Policies;
    this.logger.debug({ allBoilingDataPolicies });
    if (!allBoilingDataPolicies) return;
    this.policyArn = allBoilingDataPolicies.find(policy => policy.Arn?.includes(this.path + this.iamManagedPolicyName))
      ?.Arn;
    return this.policyArn;
  }

  public async GetPolicyVersions(PolicyArn: string): Promise<iam.PolicyVersion[]> {
    this.logger.debug({ GetPolicyVersions: { policyName: this.iamManagedPolicyName, PolicyArn } });
    try {
      const resp = await this.iamClient.send(new iam.ListPolicyVersionsCommand({ PolicyArn }));
      if (!resp?.Versions) throw new Error(`Could not find policy versions for ${PolicyArn}`);
      return resp.Versions;
    } catch (err: any) {
      this.logger.debug({ err: err?.message });
      return [];
    }
  }

  private async _deleteOldestPolicyVersion(PolicyArn: string, versions: iam.PolicyVersion[]): Promise<void> {
    const sortedVersions = versions
      .filter(ver => !ver.IsDefaultVersion)
      .sort((a, b) => parseInt(a.VersionId?.substring(1) ?? "0") - parseInt(b.VersionId?.substring(1) ?? "0"));
    this.logger.debug({ sortedVersions });
    const VersionId = sortedVersions.shift()?.VersionId;
    if (!VersionId) throw new Error("Failed to filter VersionId");
    this.logger.debug({ upsertBdAccessPolicy: { DeletePolicyVersionCommand: { VersionId } } });
    await this.iamClient.send(new iam.DeletePolicyVersionCommand({ PolicyArn, VersionId }));
  }

  private async _createNewPolicyVersion(PolicyArn: string, PolicyDocument: string): Promise<void> {
    const resp = await this.iamClient.send(new iam.CreatePolicyVersionCommand({ PolicyArn, PolicyDocument }));
    this.logger.debug({ upsertBdAccessPolicy: { VersionId: resp?.PolicyVersion?.VersionId } });
    if (!resp?.PolicyVersion?.VersionId) throw new Error("Policy version creation failed");
    const commandParams: iam.SetDefaultPolicyVersionRequest = { PolicyArn, VersionId: resp?.PolicyVersion?.VersionId };
    await this.iamClient.send(new iam.SetDefaultPolicyVersionCommand(commandParams));
  }

  private async _createPolicy(PolicyDocument: string): Promise<void> {
    const commandParams: iam.CreatePolicyRequest = {
      Path: this.path,
      PolicyName: this.iamManagedPolicyName,
      Description: "Access Policy for BoilingData",
      PolicyDocument,
      Tags: [...(this.params.tags ?? []), ...this.boilingDataTags],
    };
    const resp = await this.iamClient.send(new iam.CreatePolicyCommand(commandParams));
    if (!resp?.Policy?.Arn) throw new Error("Policy creation failed");
  }

  public async upsertBdAccessPolicy(PolicyDocument: string): Promise<void> {
    try {
      const PolicyArn = await this._getPolicyArn();
      this.logger.debug({ upsertBdAccessPolicy: { policyName: this.iamManagedPolicyName, PolicyArn } });
      if (!PolicyArn) {
        await this._createPolicy(PolicyDocument);
        return;
      }
      const versions = await this.GetPolicyVersions(PolicyArn);
      if (versions.length >= 5) await this._deleteOldestPolicyVersion(PolicyArn, versions);
      await this._createNewPolicyVersion(PolicyArn, PolicyDocument);
    } catch (err: any) {
      this.logger.error({ upsertBdAccessPolicy: { err } });
      throw err;
    }
  }

  public async upsertRole(policyDocument: string): Promise<string> {
    let arn: string;
    try {
      const resp = await this.getRole();
      if (!resp.Arn) throw new Error("Could not find role ARN");
      arn = resp.Arn;
    } catch (err: any) {
      if (err?.message != "Getting IAM Role failed") throw err;
      const resp = await this._createRole();
      if (!resp.Arn) throw new Error("Could not find role ARN after create role");
      arn = resp.Arn;
    }
    await this.upsertBdAccessPolicy(policyDocument);
    await this._attachRolePolicy();
    return arn;
  }

  public async getRole(): Promise<iam.Role> {
    try {
      const resp = await this.iamClient.send(new iam.GetRoleCommand({ RoleName: this.iamRoleName }));
      if (!resp || !resp.Role) throw new Error("Getting IAM Role failed");
      this.logger.debug({ getRole: { role: resp.Role } });
      return resp.Role;
    } catch (err) {
      this.logger.debug({ getRole: err });
      throw new Error("Getting IAM Role failed");
    }
  }

  public async deleteRole(): Promise<void> {
    this.logger.debug({ deleteRole: { roleName: this.iamRoleName } });
    await this.iamClient.send(new iam.DeleteRoleCommand({ RoleName: this.iamRoleName }));
    return;
  }
}
