import { getApiKey } from "../../bdcli/utils/auth_util.js";

// FIXME: proper domain and stage
export const baseApiUrl = "https://8br5emv4u6.execute-api.eu-west-1.amazonaws.com";
export const dataSetsPath = "/dev/data-sets";
export const accountPath = "/dev/account";
export const dataSetsUrl = baseApiUrl + dataSetsPath;
export const accountUrl = baseApiUrl + accountPath;
export const bdAWSAccount = "589434896614"; // FIXME: get from bdAccount API

export async function getReqHeaders(token: string): Promise<{ [k: string]: string }> {
  const apikey = await getApiKey();
  return {
    Authorization: token,
    "x-api-key": apikey,
    "Content-Type": "application/json",
  };
}
