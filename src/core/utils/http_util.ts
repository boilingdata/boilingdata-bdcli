import { getApiKey } from "../../bdcli/utils/auth_util.js";

export const baseApiUrl = "https://ijdz5e8kp9.execute-api.eu-west-1.amazonaws.com/dev/";
export const dataSetsUrl = baseApiUrl + "data-sets/";

export async function getReqHeaders(token: string): Promise<{ [k: string]: string }> {
  const apikey = await getApiKey();
  return {
    Authorization: token,
    "x-api-key": apikey,
    "Content-Type": "application/json",
  };
}
