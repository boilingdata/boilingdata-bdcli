import * as id from "amazon-cognito-identity-js";
// FIXME: test hard-coded
export const baseApiUrl = "https://rest.api.test.boilingdata.com";
export const dataSetsPath = "/data-sets";
export const accountPath = "/account";
export const tokenPath = "/token";
export const dataSetsUrl = baseApiUrl + dataSetsPath;
export const accountUrl = baseApiUrl + accountPath;
export const tokenUrl = baseApiUrl + tokenPath;
export const bdAWSAccount = "589434896614"; // FIXME: get from bdAccount API
export const UserPoolId = "eu-west-1_0GLV9KO1p";
export const poolData = { UserPoolId, ClientId: "6timr8knllr4frovfvq8r2o6oo" };
export const Pool = new id.CognitoUserPool(poolData);
// FIXME: Fixed..
export const apiKey = "Ak7itOEG1N1I7XpFfmYO97NWHRZwEYDmYBL4y0lb";
export function getApiKey() {
    return Promise.resolve(apiKey); // FIXME: Get API key..
}
export async function getReqHeaders(token) {
    const apikey = await getApiKey();
    return {
        Authorization: token,
        "x-api-key": apikey,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}