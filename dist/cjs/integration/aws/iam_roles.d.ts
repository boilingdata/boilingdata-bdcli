import * as iam from "@aws-sdk/client-iam";
import * as sts from "@aws-sdk/client-sts";
import { ILogger } from "../../bdcli/utils/logger_util.js";
export interface Tag {
    Key: string;
    Value: string;
}
export interface IBDIamRole {
    logger: ILogger;
    iamClient: iam.IAMClient;
    stsClient: sts.STSClient;
    region: string;
    username: string;
    environment?: string;
    templateName?: string;
    assumeCondExternalId: string;
    assumeAwsAccount: string;
    path?: string;
    maxSessionDuration?: number;
    roleNamePrefix?: string;
    tags?: Tag[];
}
export declare class BDIamRole {
    private params;
    private iamClient;
    private stsClient;
    private logger;
    private _iamRoleName?;
    private _iamManagedPolicyName?;
    private boilingDataTags;
    private path;
    private awsAccountId?;
    private policyArn?;
    constructor(params: IBDIamRole);
    private getName;
    getAwsAccountId(): Promise<string>;
    get iamRoleName(): string;
    get iamManagedPolicyName(): string;
    getAssumeRolePolicyDocument(): object;
    private _createRole;
    private _attachRolePolicy;
    private _getPolicyArn;
    GetPolicyVersions(PolicyArn: string): Promise<iam.PolicyVersion[]>;
    private _deleteOldestPolicyVersion;
    private _createNewPolicyVersion;
    private _createPolicy;
    upsertBdAccessPolicy(PolicyDocument: string): Promise<void>;
    upsertRole(policyDocument: string): Promise<string>;
    getRole(): Promise<iam.Role>;
    deleteRole(): Promise<void>;
}
