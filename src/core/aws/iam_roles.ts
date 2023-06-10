import * as iam from "@aws-sdk/client-iam";
import * as crypto from "crypto";
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
  private client: iam.IAMClient;
  private logger: ILogger;
  private _iamRoleName?: string;
  private _iamManagedPolicyName?: string;
  private boilingDataTags: Tag[];

  constructor(private params: IBDIamRole) {
    this.client = this.params.iamClient;
    this.logger = this.params.logger;
    this.boilingDataTags = [{ Key: "service", Value: "boilingdata" }];
  }

  private getName(type: string): string {
    const path = this.params.path ?? "boilingdata/";
    const prefix = this.params.roleNamePrefix ?? "bd";
    const regionShort = getRegionShortName(this.params.region);
    const hash = crypto
      .createHash("md5")
      .update(
        type +
          path +
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
    return {
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
  }

  public managedBdAccessRolePolicyInput(policy: iam.Policy): iam.CreatePolicyCommandInput {
    return {
      PolicyName: this.iamManagedPolicyName,
      Description: "Access Role for BoilingData",
      PolicyDocument: JSON.stringify(policy),
      Tags: [...(this.params.tags ?? []), ...this.boilingDataTags],
    };
  }

  private async _createRole(): Promise<iam.Role> {
    this.logger.debug({ _createRole: { roleName: this.iamRoleName } });
    const command = new iam.CreateRoleCommand({
      RoleName: this.iamRoleName,
      AssumeRolePolicyDocument: JSON.stringify(this.getAssumeRolePolicyDocument()),
      Tags: [...this.boilingDataTags, ...(this.params.tags ?? [])],
    });
    const resp = await this.client.send(command);
    if (!resp || !resp.Role) {
      this.logger.error({ createRoleResp: resp });
      throw new Error("IAM Role creation failed");
    }
    return resp.Role;
  }

  private async _attachRolePolicy(role: iam.Role, policy: iam.Policy): Promise<void> {
    this.logger.debug({ _attachRolePolicy: { role, policy } });
    return;
  }

  public async createOrUpdateManagedBdAccessRolePolicy(policy: iam.Policy = {}): Promise<iam.Policy> {
    this.logger.debug({ createOrUpdateManagedBdAccessRolePolicy: { roleName: this.iamRoleName } });
    const command = new iam.CreatePolicyCommand(this.managedBdAccessRolePolicyInput(policy));
    const resp = await this.client.send(command);
    if (!resp || !resp.Policy) {
      this.logger.error({ createPolicyResp: resp });
      throw new Error("Policy creation failed");
    }
    return resp.Policy;
  }

  public async createRoleIfNotExists(): Promise<iam.Role> {
    try {
      const resp = await this.getRole();
      return resp;
    } catch (err: any) {
      if (err?.message != "Getting IAM Role failed") throw err;
      const resp = await this._createRole();
      const managePolicy = await this.createOrUpdateManagedBdAccessRolePolicy();
      await this._attachRolePolicy(resp, managePolicy);
      return resp;
    }
  }

  public async getRole(): Promise<iam.Role> {
    const command = new iam.GetRoleCommand({ RoleName: this.iamRoleName });
    const resp = await this.client.send(command);
    if (!resp || !resp.Role) throw new Error("Getting IAM Role failed");
    return resp.Role;
  }

  public async deleteRole(): Promise<void> {
    this.logger.debug({ deleteRole: { roleName: this.iamRoleName } });
    const command = new iam.DeleteRoleCommand({ RoleName: this.iamRoleName });
    await this.client.send(command);
    return;
  }
}
