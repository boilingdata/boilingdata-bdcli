import * as id from "amazon-cognito-identity-js";
import ms from "ms";

// FIXME: switch to prod as default
export const baseApiUrl = "https://rest.api.test.boilingdata.com";
export const dataSetsPath = "/data-sets";
export const accountPath = "/account";
export const tokenPath = "/token";
export const sharePath = "/share";
export const dataSetsUrl = baseApiUrl + dataSetsPath;
export const accountUrl = baseApiUrl + accountPath;
export const tokenUrl = baseApiUrl + tokenPath;
export const tokenShareUrl = baseApiUrl + sharePath;
// FIXME: get from bdAccount API
export const bdAWSAccount = "589434896614";

export const UserPoolId = "eu-west-1_0GLV9KO1p";
export const poolData = { UserPoolId, ClientId: "6timr8knllr4frovfvq8r2o6oo" };
export const Pool = new id.CognitoUserPool(poolData);
// FIXME: Make org specific
export const apiKey = "Ak7itOEG1N1I7XpFfmYO97NWHRZwEYDmYBL4y0lb";

export function getApiKey(): Promise<string> {
  return Promise.resolve(apiKey); // FIXME: Get API key..
}

export interface IGetReqHeadersOptions {
  tokenLifetime?: string;
  vendingSchedule?: string;
}

export async function getReqHeaders(
  token: string,
  reqOptions?: IGetReqHeadersOptions,
): Promise<{ [k: string]: string }> {
  const apikey = await getApiKey();
  if (reqOptions?.tokenLifetime) {
    const periodInMs = ms(reqOptions.tokenLifetime);
    if (!periodInMs || periodInMs < 60000) {
      throw new Error("Invalid time period, please see https://github.com/vercel/ms for the format of the period");
    }
  }
  const tokenPeriod = reqOptions?.tokenLifetime ? { "x-token-lifetime": reqOptions.tokenLifetime } : undefined;
  const vendingWindow = reqOptions?.vendingSchedule
    ? { "x-token-vending-window": reqOptions.vendingSchedule }
    : undefined;
  return {
    ...tokenPeriod,
    ...vendingWindow,
    Authorization: token,
    "x-api-key": apikey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}
