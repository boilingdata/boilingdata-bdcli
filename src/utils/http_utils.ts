export const baseApiUrl = "https://ijdz5e8kp9.execute-api.eu-west-1.amazonaws.com/dev/";
export const dataSetsUrl = baseApiUrl + "data-sets/";

export function getReqHeaders(token: string, apikey: string): Promise<{ [k: string]: string }> {
  return Promise.resolve({
    Authorization: token,
    "x-api-key": apikey,
    "Content-Type": "application/json",
  });
}
