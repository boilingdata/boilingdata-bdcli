export function getReqHeaders(token: string, apikey: string): Promise<{ [k: string]: string }> {
  return Promise.resolve({
    Authorization: token,
    "x-api-key": apikey,
    "Content-Type": "application/json",
  });
}
