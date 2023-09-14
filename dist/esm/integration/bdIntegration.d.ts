import { ILogger } from "../bdcli/utils/logger_util.js";
import { BDIamRole } from "./aws/iam_roles.js";
import { BDAccount } from "./boilingdata/account.js";
import { IStatementExt } from "./boilingdata/dataset.interface.js";
import { BDDataSourceConfig } from "./boilingdata/dataset.js";
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
export declare class BDIntegration {
    private params;
    private logger;
    private bdDatasets;
    constructor(params: IBDIntegration);
    private mapDatasetsToUniqBuckets;
    private mapAccessPolicyToS3Resource;
    private getStatement;
    getGroupedBuckets(): IGroupedDataSources;
    getPolicyDocument(): Promise<any>;
}
export {};
