import { getConfigCredentials, updateConfig } from "../../bdcli/utils/config_util.js";
import { ILogger } from "../../bdcli/utils/logger_util.js";
import { accountUrl, getReqHeaders, tokenShareUrl, tokenUrl } from "./boilingdata_api.js";
import * as jwt from "jsonwebtoken";

// import { channel } from "node:diagnostics_channel";

export interface IBDConfig {
  authToken: string;
  logger: ILogger;
}

interface IAPIAccountDetails {
  AccountAwsAccount: string;
  AccountExtId: string;
}

export class BDAccount {
  private cognitoIdToken: string;
  private bdStsToken: string | undefined;
  private sharedTokens: Map<string, string>;
  private selectedToken: string | undefined;
  private decodedToken!: jwt.JwtPayload | null;
  private logger: ILogger;
  private accountDetails!: IAPIAccountDetails;

  constructor(private params: IBDConfig) {
    this.logger = this.params.logger;
    // this.logger.debug(this.params);
    this.cognitoIdToken = this.params.authToken;
    this.sharedTokens = new Map<string, string>();
  }

  public async setIamRoleWithPayload(IamRoleArn: string, payload: any): Promise<void> {
    // channel("undici:request:create").subscribe(console.log);
    const body = JSON.stringify({ IamRoleArn, ...payload });
    this.logger.debug({ body });
    const res = await fetch(accountUrl + "/iamrole", {
      method: "PUT",
      headers: await getReqHeaders(this.cognitoIdToken),
      body,
    });
    const respBody = await res.json();
    this.logger.info("\n" + JSON.stringify(respBody));
    if (res.status != 200 && res.status != 201) {
      this.logger.error({ status: res.status, statusText: res.statusText, respBody });
      throw new Error(
        `Failed to configure IAM Role (${IamRoleArn}) into BoilingData - ${res.status} ${res.statusText}: ${respBody?.ResponseText}; ${respBody?.RequestId}`,
      );
    }
  }

  private serialiseTokensMap(): string[] {
    const entries = [...this.sharedTokens.entries()];
    return entries.map(([id, token]) => `${id}:${token}`);
  }

  private unserialiseTokensMap(tokens: string[]): void {
    this.sharedTokens = new Map<string, string>();
    tokens.map(t => {
      const [id, token] = t.split(":");
      if (!token || !id) throw new Error("Local shared token cache corrupted in the config");
      this.sharedTokens.set(id, token);
    });
  }

  private async _getAccountDetails(): Promise<void> {
    if (this.accountDetails) return;
    // channel("undici:request:create").subscribe(console.log);
    const res = await fetch(accountUrl, { method: "GET", headers: await getReqHeaders(this.cognitoIdToken) });
    const body = await res.json();
    this.logger.debug({ getAccountDetails: { body } });
    if (!body.ResponseCode || !body.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (!body.AccountDetails?.AccountAwsAccount || !body.AccountDetails?.AccountExtId) {
      throw new Error("Missing AccountDetails from BD API Response");
    }
    this.accountDetails = <IAPIAccountDetails>body.AccountDetails;
    this.logger.debug({ accountDetails: this.accountDetails });
  }

  public async getAssumeAwsAccount(): Promise<string> {
    await this._getAccountDetails();
    return this.accountDetails.AccountAwsAccount;
  }

  public async getExtId(): Promise<string> {
    await this._getAccountDetails();
    return this.accountDetails.AccountExtId;
  }

  private selectAndDecodeToken(shareId?: string): void {
    if (shareId) {
      if (!this.sharedTokens.has(shareId)) throw new Error(`No token with share id ${shareId}`);
      const bdStsToken = <string>this.sharedTokens.get(shareId);
      this.decodedToken = jwt.decode(bdStsToken, { complete: true });
      this.logger.debug({ decodedToken: this.decodedToken });
      this.selectedToken = bdStsToken;
      const aud = this.decodedToken?.["payload"]?.aud; // audience
      if (!aud || !Array.isArray(aud) || aud.length < 3 || aud[2].length < 6 || aud[2] != shareId) {
        throw new Error("Decoded token not matching with selected shareId");
      }
    } else {
      if (!this.bdStsToken) throw new Error("No BD STS token");
      this.decodedToken = jwt.decode(this.bdStsToken, { complete: true });
      this.selectedToken = this.bdStsToken;
    }
    if (!this.decodedToken || !this.selectedToken) throw new Error(`Could not find token (share id ${shareId})`);
  }

  private dumpSelectedToken(): void {
    if (!this.selectedToken) throw new Error("No selected BD STS token");
    this.logger.debug({ bdStsToken: this.selectedToken, decodedToken: this.decodedToken });
  }

  private checkExp(exp: number): boolean {
    const humanReadable = new Date();
    const twoMinsAgo = new Date();
    twoMinsAgo.setTime(Date.now() - 2 * 60 * 1000);
    humanReadable.setTime(exp * 1000);
    const diff = exp * 1000 - twoMinsAgo.getTime();
    this.logger.debug({
      exp,
      diff,
      twoMinsAgo: twoMinsAgo.toISOString(),
      expReadable: humanReadable.toISOString(),
    });
    if (diff < 0) return false;
    return true;
  }

  public async listSharedTokens(): Promise<{ toList: string[]; fromList: string[] }> {
    // channel("undici:request:create").subscribe(console.log);
    // channel("undici:request:headers").subscribe(console.log);
    const headers = await getReqHeaders(this.cognitoIdToken);
    this.logger.debug({ tokenShareUrl, headers });
    const res = await fetch(tokenShareUrl, { method: "GET", headers });
    const body = await res.json();
    this.logger.debug({ listTokens: { body } });
    if (!body.ResponseCode || !body.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (Array.isArray(body.toList) && Array.isArray(body.fromList)) {
      return { toList: body.toList, fromList: body.fromList };
    }
    throw new Error("Failed to list tokens shared for you");
  }

  public async shareToken(
    tokenLifetime: string,
    vendingSchedule: string = "* * * * * *",
    users: string[],
    shareName: string = "",
    shareSql: string = "",
  ): Promise<void> {
    // channel("undici:request:create").subscribe(console.log);
    // channel("undici:request:headers").subscribe(console.log);
    const headers = await getReqHeaders(this.cognitoIdToken);
    const putBody = JSON.stringify({ users, vendingSchedule, tokenLifetime, shareName, shareSql });
    this.logger.debug({ tokenShareUrl, headers, body: putBody });
    const res = await fetch(tokenShareUrl, { method: "PUT", headers, body: putBody });
    const resBody = await res.json();
    this.logger.debug({ shareToken: { body: resBody } });
    if (!resBody.ResponseCode || !resBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (resBody.ResponseCode == "00" && resBody.ResponseText == "OK") return;
    throw new Error("Failed to share token");
  }

  public async unshareToken(shareId: string): Promise<void> {
    // channel("undici:request:create").subscribe(console.log);
    // channel("undici:request:headers").subscribe(console.log);
    const headers = await getReqHeaders(this.cognitoIdToken);
    const putBody = JSON.stringify({ shareId });
    this.logger.debug({ tokenShareUrl, headers, body: putBody });
    const res = await fetch(tokenShareUrl, { method: "DELETE", headers, body: putBody });
    const resBody = await res.json();
    this.logger.debug({ unshareToken: { body: resBody } });
    if (!resBody.ResponseCode || !resBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (resBody.ResponseCode == "00" && resBody.ResponseText == "OK") return;
    throw new Error("Failed to unshare token");
  }

  public async getToken(tokenLifetime: string, shareId?: string): Promise<{ bdStsToken: string; cached: boolean }> {
    if (this.bdStsToken && !shareId) {
      this.selectedToken = this.bdStsToken;
      return { bdStsToken: this.bdStsToken, cached: true };
    }
    const creds = await getConfigCredentials();
    this.bdStsToken = creds.bdStsToken;
    if (creds.sharedTokens) this.unserialiseTokensMap(creds.sharedTokens);
    try {
      this.selectAndDecodeToken(shareId);
      this.dumpSelectedToken();
      if (!this.decodedToken || !this.selectedToken) throw new Error("Unable to select/decode token");
      const exp = this.decodedToken["payload"].exp;
      if (exp && this.checkExp(exp)) {
        this.logger.debug({ cachedBdStstToken: true });
        return { bdStsToken: this.selectedToken, cached: true };
      }
    } catch (err) {
      this.logger.debug({ bdStsTokenError: err });
    }
    this.logger.debug({ bdStsTokenCached: this.bdStsToken });
    this.logger.debug({ status: "need fresh token" });

    // channel("undici:request:create").subscribe(console.log);
    // channel("undici:request:headers").subscribe(console.log);
    const headers = await getReqHeaders(this.cognitoIdToken); // , { tokenLifetime, vendingSchedule, shareId });
    let method = "GET";
    let reqBody: string | undefined = undefined;
    if (tokenLifetime || shareId) {
      method = "POST";
      reqBody = JSON.stringify({ tokenLifetime, shareId });
    }
    this.logger.debug({ method, tokenUrl, headers, body: reqBody });
    const res = await fetch(tokenUrl, { method, headers, body: reqBody });
    const body = await res.json();
    this.logger.debug({ getStsToken: { body } });
    if (!body.ResponseCode || !body.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (!body.bdStsToken) {
      throw new Error("Missing bdStsToken in BD API Response");
    }
    if (shareId) {
      this.sharedTokens.set(shareId, <string>body.bdStsToken);
    }
    this.selectAndDecodeToken(shareId);
    this.dumpSelectedToken();
    if (!this.decodedToken || !this.selectedToken) {
      throw new Error("Unable to select/decode token after fetch from API");
    }
    const exp = this.decodedToken["payload"].exp;
    if (exp && this.checkExp(exp)) {
      this.logger.debug({ cachedBdStstToken: true });
      const credentials = shareId ? { sharedTokens: this.serialiseTokensMap() } : { bdStsToken: this.selectedToken };
      await updateConfig({ credentials }); // local cache
      return { bdStsToken: this.selectedToken, cached: false };
    }
    throw new Error(`Failed to get fresh token from BD API (with share id ${shareId})`);
  }
}
