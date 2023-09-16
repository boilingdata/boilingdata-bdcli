import { ILogger } from "../../bdcli/utils/logger_util.js";
export interface IBDConfig {
    authToken: string;
    logger: ILogger;
}
export declare class BDAccount {
    private params;
    private cognitoIdToken;
    private bdStsToken;
    private sharedTokens;
    private selectedToken;
    private decodedToken;
    private logger;
    private accountDetails;
    constructor(params: IBDConfig);
    setIamRoleWithPayload(IamRoleArn: string, payload: any): Promise<void>;
    private _getAccountDetails;
    getAssumeAwsAccount(): Promise<string>;
    getExtId(): Promise<string>;
    private selectAndDecodeToken;
    private dumpSelectedToken;
    private checkExp;
    listSharedTokens(): Promise<{
        toList: string[];
        fromList: string[];
    }>;
    shareToken(tokenLifetime: string, vendingSchedule: string | undefined, users: string[], shareName?: string, shareSql?: string): Promise<void>;
    unshareToken(shareId: string): Promise<void>;
    private getTokenResp;
    getToken(tokenLifetime: string, shareId?: string): Promise<{
        bdStsToken: string;
        cached: boolean;
    }>;
}
