import { getApiKey, getIdToken } from "./auth_utils";

export const baseApiUrl = "https://ijdz5e8kp9.execute-api.eu-west-1.amazonaws.com/dev/";
export const dataSetsUrl = baseApiUrl + "data-sets/";

export async function getReqHeaders(): Promise<{ [k: string]: string }> {
  const token = await getIdToken();
  const apikey = await getApiKey();
  return {
    Authorization: token,
    "x-api-key": apikey,
    "Content-Type": "application/json",
  };
}
