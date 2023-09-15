"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BDIamRole = void 0;
const iam = __importStar(require("@aws-sdk/client-iam"));
const crypto = __importStar(require("crypto"));
const sts = __importStar(require("@aws-sdk/client-sts"));
const util_js_1 = require("./util.js");
var ENameType;
(function (ENameType) {
    ENameType["ROLE"] = "role";
    ENameType["POLICY"] = "policy";
})(ENameType || (ENameType = {}));
class BDIamRole {
    params;
    iamClient;
    stsClient;
    logger;
    _iamRoleName;
    _iamManagedPolicyName;
    boilingDataTags;
    path;
    awsAccountId;
    policyArn;
    constructor(params) {
        this.params = params;
        this.iamClient = this.params.iamClient;
        this.stsClient = this.params.stsClient;
        this.logger = this.params.logger;
        this.path = this.params.path ?? "/boilingdata/";
        if (!this.path.startsWith("/") || !this.path.endsWith("/"))
            throw new Error("path must start and end with /");
        this.boilingDataTags = [{ Key: "service", Value: "boilingdata" }];
    }
    getName(type) {
        const prefix = this.params.roleNamePrefix ?? "bd";
        const regionShort = (0, util_js_1.getRegionShortName)(this.params.region ?? process.env["AWS_REGION"]);
        const hash = crypto
            .createHash("md5")
            .update(type +
            this.path +
            prefix +
            regionShort +
            this.params.uniqNamePart +
            this.params.assumeAwsAccount +
            this.params.assumeCondExternalId +
            `${this.params.maxSessionDuration ?? "N/A"}`);
        const reducedHashLength = 15;
        const nameLenSoFar = prefix.length + regionShort.length + reducedHashLength;
        const roomLeft = 64 - nameLenSoFar - 3; // "-" chars
        const dataSetShort = this.params.uniqNamePart.substring(0, roomLeft);
        return [prefix, regionShort, dataSetShort, hash.digest("hex").substring(0, 15)].join("-");
    }
    async getAwsAccountId() {
        if (this.awsAccountId)
            return this.awsAccountId;
        const resp = await this.stsClient.send(new sts.GetCallerIdentityCommand({}));
        this.logger.debug({ resp });
        if (!resp?.Account)
            throw new Error("Could not get AWS Account Id with STS get caller identity");
        this.awsAccountId = resp.Account;
        return this.awsAccountId;
    }
    // deterministic IAM Role name - max length 64 chars
    get iamRoleName() {
        if (this._iamRoleName)
            return this._iamRoleName;
        this._iamRoleName = this.getName(ENameType.ROLE);
        if (this._iamRoleName.length > 64)
            throw new Error("Role name too long, bugger in code.");
        return this._iamRoleName;
    }
    get iamManagedPolicyName() {
        if (this._iamManagedPolicyName)
            return this._iamManagedPolicyName;
        this._iamManagedPolicyName = this.getName(ENameType.POLICY);
        if (this._iamManagedPolicyName.length > 64)
            throw new Error("Role name too long, bugger in code.");
        return this._iamManagedPolicyName;
    }
    getAssumeRolePolicyDocument() {
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
    async _createRole() {
        this.logger.debug({ _createRole: { roleName: this.iamRoleName } });
        try {
            const commandParams = {
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
        }
        catch (err) {
            this.logger.error({ _createRoleError: { err } });
            throw err;
        }
    }
    async _attachRolePolicy() {
        const PolicyArn = await this._getPolicyArn();
        this.logger.debug({ _attachRolePolicy: { RoleName: this.iamRoleName, PolicyArn } });
        await this.iamClient.send(new iam.AttachRolePolicyCommand({ RoleName: this.iamRoleName, PolicyArn }));
        return;
    }
    async _getPolicyArn() {
        if (this.policyArn)
            return this.policyArn;
        const resp = await this.iamClient.send(new iam.ListPoliciesCommand({ PathPrefix: this.path }));
        const allBoilingDataPolicies = resp.Policies;
        this.logger.debug({ allBoilingDataPolicies });
        if (!allBoilingDataPolicies)
            return;
        this.policyArn = allBoilingDataPolicies.find(policy => policy.Arn?.includes(this.path + this.iamManagedPolicyName))
            ?.Arn;
        return this.policyArn;
    }
    async GetPolicyVersions(PolicyArn) {
        this.logger.debug({ GetPolicyVersions: { policyName: this.iamManagedPolicyName, PolicyArn } });
        try {
            const resp = await this.iamClient.send(new iam.ListPolicyVersionsCommand({ PolicyArn }));
            if (!resp?.Versions)
                throw new Error(`Could not find policy versions for ${PolicyArn}`);
            return resp.Versions;
        }
        catch (err) {
            this.logger.debug({ err: err?.message });
            return [];
        }
    }
    async _deleteOldestPolicyVersion(PolicyArn, versions) {
        const sortedVersions = versions
            .filter(ver => !ver.IsDefaultVersion)
            .sort((a, b) => parseInt(a.VersionId?.substring(1) ?? "0") - parseInt(b.VersionId?.substring(1) ?? "0"));
        this.logger.debug({ sortedVersions });
        const VersionId = sortedVersions.shift()?.VersionId;
        if (!VersionId)
            throw new Error("Failed to filter VersionId");
        this.logger.debug({ upsertBdAccessPolicy: { DeletePolicyVersionCommand: { VersionId } } });
        await this.iamClient.send(new iam.DeletePolicyVersionCommand({ PolicyArn, VersionId }));
    }
    async _createNewPolicyVersion(PolicyArn, PolicyDocument) {
        const resp = await this.iamClient.send(new iam.CreatePolicyVersionCommand({ PolicyArn, PolicyDocument }));
        this.logger.debug({ upsertBdAccessPolicy: { VersionId: resp?.PolicyVersion?.VersionId } });
        if (!resp?.PolicyVersion?.VersionId)
            throw new Error("Policy version creation failed");
        const commandParams = { PolicyArn, VersionId: resp?.PolicyVersion?.VersionId };
        await this.iamClient.send(new iam.SetDefaultPolicyVersionCommand(commandParams));
    }
    async _createPolicy(PolicyDocument) {
        const commandParams = {
            Path: this.path,
            PolicyName: this.iamManagedPolicyName,
            Description: "Access Policy for BoilingData",
            PolicyDocument,
            Tags: [...(this.params.tags ?? []), ...this.boilingDataTags],
        };
        const resp = await this.iamClient.send(new iam.CreatePolicyCommand(commandParams));
        if (!resp?.Policy?.Arn)
            throw new Error("Policy creation failed");
    }
    async upsertBdAccessPolicy(PolicyDocument) {
        try {
            const PolicyArn = await this._getPolicyArn();
            this.logger.debug({ upsertBdAccessPolicy: { policyName: this.iamManagedPolicyName, PolicyArn } });
            if (!PolicyArn) {
                await this._createPolicy(PolicyDocument);
                return;
            }
            const versions = await this.GetPolicyVersions(PolicyArn);
            if (versions.length >= 5)
                await this._deleteOldestPolicyVersion(PolicyArn, versions);
            await this._createNewPolicyVersion(PolicyArn, PolicyDocument);
        }
        catch (err) {
            this.logger.error({ upsertBdAccessPolicy: { err } });
            throw err;
        }
    }
    async upsertRole(policyDocument) {
        let arn;
        try {
            const resp = await this.getRole();
            if (!resp.Arn)
                throw new Error("Could not find role ARN");
            arn = resp.Arn;
        }
        catch (err) {
            if (err?.message != "Getting IAM Role failed")
                throw err;
            const resp = await this._createRole();
            if (!resp.Arn)
                throw new Error("Could not find role ARN after create role");
            arn = resp.Arn;
        }
        await this.upsertBdAccessPolicy(policyDocument);
        await this._attachRolePolicy();
        return arn;
    }
    async getRole() {
        try {
            const resp = await this.iamClient.send(new iam.GetRoleCommand({ RoleName: this.iamRoleName }));
            if (!resp || !resp.Role)
                throw new Error("Getting IAM Role failed");
            this.logger.debug({ getRole: { role: resp.Role } });
            return resp.Role;
        }
        catch (err) {
            this.logger.debug({ getRole: err });
            throw new Error("Getting IAM Role failed");
        }
    }
    async deleteRole() {
        this.logger.debug({ deleteRole: { roleName: this.iamRoleName } });
        await this.iamClient.send(new iam.DeleteRoleCommand({ RoleName: this.iamRoleName }));
        return;
    }
}
exports.BDIamRole = BDIamRole;
