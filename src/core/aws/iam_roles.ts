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

  constructor(private params: IBDIamRole) {
    this.iamClient = this.params.iamClient;
    this.stsClient = this.params.stsClient;
    this.logger = this.params.logger;
    this.path = this.params.path ?? "boilingdata/";
    this.boilingDataTags = [{ Key: "service", Value: "boilingdata" }];
  }

  private getName(type: string): string {
    const prefix = this.params.roleNamePrefix ?? "bd";
    const regionShort = getRegionShortName(this.params.region);
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
    const command = new sts.GetCallerIdentityCommand({});
    const resp = await this.stsClient.send(command);
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
    const command = new iam.CreateRoleCommand({
      Path: this.params.path,
      RoleName: this.iamRoleName,
      AssumeRolePolicyDocument: JSON.stringify(this.getAssumeRolePolicyDocument()),
      Tags: [...this.boilingDataTags, ...(this.params.tags ?? [])],
    });
    this.logger.debug({ command });
    try {
      const resp = await this.iamClient.send(command);
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

  private async _attachRolePolicy(policyArn: string): Promise<void> {
    this.logger.debug({ _attachRolePolicy: { RoleName: this.iamRoleName, PolicyArn: policyArn } });
    const command = new iam.AttachRolePolicyCommand({ RoleName: this.iamRoleName, PolicyArn: policyArn });
    await this.iamClient.send(command);
    return;
  }

  private async _getPolicyArn(): Promise<string> {
    return `arn:aws:iam::${await this.getAwsAccountId()}:policy/${this.path}${this.iamManagedPolicyName}`;
  }

  public async GetPolicyVersions(): Promise<string[]> {
    this.logger.debug({ GetPolicyVersions: { policyName: this.iamManagedPolicyName } });
    const PolicyArn = await this._getPolicyArn();
    const command = new iam.ListPolicyVersionsCommand({ PolicyArn });
    try {
      const resp = await this.iamClient.send(command);
      if (!resp?.Versions) throw new Error(`Could not find policy versions for ${PolicyArn}`);
      return resp.Versions.map(v => v.VersionId ?? "N/A");
    } catch (err) {
      this.logger.debug({ err });
      return [];
    }
  }

  public async upsertBdAccessPolicy(PolicyDocument: string): Promise<string> {
    const PolicyArn = await this._getPolicyArn();
    this.logger.debug({ upsertBdAccessPolicy: { policyName: this.iamManagedPolicyName, PolicyArn } });
    const versions = await this.GetPolicyVersions();
    if (versions.length >= 5) {
      const VersionId = versions.shift();
      const command = new iam.DeletePolicyVersionCommand({ PolicyArn, VersionId });
      await this.iamClient.send(command);
    }
    if (versions.length <= 0) {
      const command = new iam.CreatePolicyCommand({
        PolicyName: this.iamManagedPolicyName,
        Description: "Access Policy for BoilingData",
        PolicyDocument,
        Tags: [...(this.params.tags ?? []), ...this.boilingDataTags],
      });
      const resp = await this.iamClient.send(command);
      if (!resp?.Policy?.Arn) {
        this.logger.error({ upsertBdAccessPolicy: resp });
        throw new Error("Policy creation failed");
      }
      if (resp.Policy.Arn != PolicyArn) throw new Error("PolicyArn is different than what we expect!");
      return resp.Policy.Arn;
    } else {
      const command = new iam.CreatePolicyVersionCommand({ PolicyArn, PolicyDocument });
      const resp = await this.iamClient.send(command);
      this.logger.debug({ upsertBdAccessPolicy: { VersionId: resp?.PolicyVersion?.VersionId } });
      if (!resp?.PolicyVersion?.VersionId) throw new Error("Policy version creation failed");
      return PolicyArn;
    }
  }

  public async upsertRole(policyDocument: string): Promise<string> {
    try {
      const resp = await this.getRole();
      if (!resp.Arn) throw new Error("Could not find role ARN");
      const managedPolicyArn = await this.upsertBdAccessPolicy(policyDocument);
      await this._attachRolePolicy(managedPolicyArn);
      return resp.Arn;
    } catch (err: any) {
      if (err?.message != "Getting IAM Role failed") throw err;
      const resp = await this._createRole();
      const managedPolicyArn = await this.upsertBdAccessPolicy(policyDocument);
      await this._attachRolePolicy(managedPolicyArn);
      if (!resp.Arn) throw new Error("Could not find role ARN after create role");
      return resp.Arn;
    }
  }

  public async getRole(): Promise<iam.Role> {
    try {
      const command = new iam.GetRoleCommand({ RoleName: this.iamRoleName });
      const resp = await this.iamClient.send(command);
      if (!resp || !resp.Role) throw new Error("Getting IAM Role failed");
      this.logger.debug({ getRole: { role: resp.Role } });
      return resp.Role;
    } catch (err) {
      this.logger.error(err);
      throw new Error("Getting IAM Role failed");
    }
  }

  public async deleteRole(): Promise<void> {
    this.logger.debug({ deleteRole: { roleName: this.iamRoleName } });
    const command = new iam.DeleteRoleCommand({ RoleName: this.iamRoleName });
    await this.iamClient.send(command);
    return;
  }
}
