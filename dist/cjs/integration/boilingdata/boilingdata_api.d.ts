import * as id from "amazon-cognito-identity-js";
export declare const baseApiUrl = "https://rest.api.test.boilingdata.com";
export declare const dataSetsPath = "/data-sets";
export declare const accountPath = "/account";
export declare const stsTokenPath = "/token";
export declare const tapTokenPath = "/taptoken";
export declare const tapMasterSecret = "/tapmastersecret";
export declare const sharePath = "/share";
export declare const sandboxPath = "/sandbox";
export declare const dataSetsUrl: string;
export declare const accountUrl: string;
export declare const stsTokenUrl: string;
export declare const tapTokenUrl: string;
export declare const tapMasterSecretUrl: string;
export declare const tokenShareUrl: string;
export declare const sandboxUrl: string;
export declare const bdAWSAccount = "589434896614";
export declare const UserPoolId = "eu-west-1_0GLV9KO1p";
export declare const poolData: {
    UserPoolId: string;
    ClientId: string;
};
export declare const Pool: id.CognitoUserPool;
export declare const apiKey = "Ak7itOEG1N1I7XpFfmYO97NWHRZwEYDmYBL4y0lb";
export declare function getApiKey(): Promise<string>;
export declare function getReqHeaders(token: string): Promise<{
    [k: string]: string;
}>;
