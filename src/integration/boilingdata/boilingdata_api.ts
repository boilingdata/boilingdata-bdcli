import * as id from "amazon-cognito-identity-js";

// FIXME: proper domain and stage
export const baseApiUrl = "https://8br5emv4u6.execute-api.eu-west-1.amazonaws.com";
export const dataSetsPath = "/dev/data-sets";
export const accountPath = "/dev/account";
export const dataSetsUrl = baseApiUrl + dataSetsPath;
export const accountUrl = baseApiUrl + accountPath;
export const bdAWSAccount = "589434896614"; // FIXME: get from bdAccount API

export const UserPoolId = "eu-west-1_0GLV9KO1p";
export const poolData = { UserPoolId, ClientId: "6timr8knllr4frovfvq8r2o6oo" };
export const Pool = new id.CognitoUserPool(poolData);
// FIXME: Fixed..
export const apiKey = "Ak7itOEG1N1I7XpFfmYO97NWHRZwEYDmYBL4y0lb";

export function getApiKey(): Promise<string> {
  return Promise.resolve(apiKey); // FIXME: Get API key..
}

export async function getReqHeaders(token: string): Promise<{ [k: string]: string }> {
  const apikey = await getApiKey();
  return {
    Authorization: token,
    "x-api-key": apikey,
    "Content-Type": "application/json",
  };
}
