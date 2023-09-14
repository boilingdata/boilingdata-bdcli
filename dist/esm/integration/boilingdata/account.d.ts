import { ILogger } from "../../bdcli/utils/logger_util.js";
export interface IBDConfig {
    authToken: string;
    logger: ILogger;
}
export declare class BDAccount {
    private params;
    private cognitoIdToken;
    private bdStsToken;
    private decodedToken;
    private logger;
    private accountDetails;
    constructor(params: IBDConfig);
    setIamRoleWithPayload(IamRoleArn: string, payload: any): Promise<void>;
    private _getAccountDetails;
    getAssumeAwsAccount(): Promise<string>;
    getExtId(): Promise<string>;
    private decodeToken;
    private dumpToken;
    private checkExp;
    getStsToken(): Promise<{
        bdStsToken: string;
        cached: boolean;
    }>;
}
