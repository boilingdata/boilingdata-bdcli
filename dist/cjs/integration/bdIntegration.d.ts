import { STSClient } from "@aws-sdk/client-sts";
import { ILogger } from "../bdcli/utils/logger_util.js";
import { BDIamRole } from "./aws/iam_role.js";
import { BDAccount } from "./boilingdata/account.js";
import { IStatementExt } from "./boilingdata/dataset.interface.js";
import { BDDataSourceConfig } from "./boilingdata/dataset.js";
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
export declare class BDIntegration {
    private params;
    private logger;
    private bdDatasets;
    private callerIdAccount;
    constructor(params: IBDIntegration);
    private mapDatasetsToUniqBuckets;
    private mapAccessPolicyToS3Resource;
    private getCustomerAccountId;
    private getTapsStatements;
    private getS3Statement;
    getGroupedBuckets(): IGroupedDataSources;
    getTapsPolicyDocument(): Promise<any>;
    getS3PolicyDocument(haveListBucketsPolicy?: boolean): Promise<any>;
}
export {};
