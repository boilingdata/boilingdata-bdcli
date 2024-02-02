import { ILogger } from "../../bdcli/utils/logger_util.js";
export interface IBDConfig {
    authToken: string;
    logger: ILogger;
}
export interface ITapTokenResp {
    bdTapToken: string;
    cached: boolean;
    expiresIn: string;
    tokenLifetimeMins: number;
    username: string;
    email: string;
    sharingUser: string;
}
export declare class BDAccount {
    private params;
    private cognitoIdToken;
    private bdStsToken;
    private bdTapToken;
    private sharedTokens;
    private selectedToken;
    private decodedToken;
    private decodedTapToken;
    private logger;
    private accountDetails;
    constructor(params: IBDConfig);
    setIamRoleWithPayload(IamRoleArn: string, payload: any): Promise<void>;
    private _getAccountDetails;
    getUsername(): Promise<string>;
    getAssumeAwsAccount(): Promise<string>;
    getExtId(): Promise<string>;
    private selectAndDecodeToken;
    private dumpSelectedToken;
    private decodeTapToken;
    private dumpTapToken;
    private getHumanReadable;
    private checkExp;
    listSharedTokens(): Promise<{
        toList: string[];
        fromList: string[];
    }>;
    shareToken(tokenLifetime: string, vendingSchedule: string | undefined, users: string[], shareName?: string, shareSql?: string): Promise<void>;
    unshareToken(shareId: string): Promise<void>;
    private getTapTokenResp;
    private getTokenResp;
    getTapToken(tokenLifetime: string, sharingUser?: string): Promise<{
        bdTapToken: string;
        cached: boolean;
    }>;
    getStsToken(tokenLifetime: string, shareId?: string): Promise<{
        bdStsToken: string;
        cached: boolean;
    }>;
}
