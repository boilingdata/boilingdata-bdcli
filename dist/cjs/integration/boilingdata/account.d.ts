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
    listSharedTokens(): Promise<{
        toList: string[];
        fromList: string[];
    }>;
    shareToken(tokenLifetime: string, vendingSchedule: string | undefined, users: string[], shareName?: string, shareSql?: string): Promise<void>;
    unshareToken(users: string[]): Promise<void>;
    getToken(tokenLifetime: string, vendingSchedule?: string): Promise<{
        bdStsToken: string;
        cached: boolean;
    }>;
}
