import {
  IDecodedSession,
  getCachedTokenSessions,
  getConfigCredentials,
  serialiseTokensList,
  updateConfig,
} from "../../bdcli/utils/config_util.js";
import { ILogger } from "../../bdcli/utils/logger_util.js";
import { spinnerError } from "../../bdcli/utils/spinner_util.js";
import {
  accountUrl,
  getReqHeaders,
  tokenShareUrl,
  stsTokenUrl,
  tapTokenUrl,
  tapMasterSecretUrl,
} from "./boilingdata_api.js";
import * as jwt from "jsonwebtoken";

// import { channel } from "node:diagnostics_channel";

export interface IBDConfig {
  authToken: string;
  logger: ILogger;
}

export interface ITapTokenResp {
  bdTapToken: string;
  cached: boolean;
  expiresIn: string;
  tokenLifetimeMins: number;
  username: string;
  email: string;
  sharingUser: string;
}

interface IAPIAccountDetails {
  AccountAwsAccount: string;
  AccountExtId: string;
  AccountUsername: string;
  AccountEmail: string;
}

export class BDAccount {
  private cognitoIdToken: string;
  private bdStsToken: string | undefined;
  private bdTapToken: string | undefined;
  private bdTapMasterSecret: string | undefined;
  private bdTapMasterSecretApplication: string | undefined;
  private sharedTokens: IDecodedSession[];
  private selectedToken: string | undefined;
  private decodedToken!: jwt.JwtPayload | null;
  private decodedTapToken!: jwt.JwtPayload | null;
  private logger: ILogger;
  private accountDetails!: IAPIAccountDetails;

  constructor(private params: IBDConfig) {
    this.logger = this.params.logger;
    // this.logger.debug(this.params);
    this.cognitoIdToken = this.params.authToken;
    this.sharedTokens = [];
  }

  public async setTapsIamRoleWithPayload(_IamRoleArn: string): Promise<any> {
    // const body = JSON.stringify({ IamRoleArn });
    // this.logger.debug({ body });
    // const res = await fetch(accountUrl + "/tapsiamrole", {
    //   method: "PUT",
    //   headers: await getReqHeaders(this.cognitoIdToken),
    //   body,
    // });
    // const respBody = await res.json();
    // this.logger.info("\n" + JSON.stringify(respBody));
    // if (res.status != 200 && res.status != 201) {
    //   this.logger.error({ status: res.status, statusText: res.statusText, respBody });
    //   throw new Error(
    //     `Failed to configure Taps IAM Role (${IamRoleArn}) into BoilingData - ${res.status} ${res.statusText}: ${respBody?.ResponseText}; ${respBody?.RequestId}`,
    //   );
    // }
  }

  public async setS3IamRoleWithPayload(IamRoleArn: string, payload: any): Promise<void> {
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

  private async _getAccountDetails(): Promise<void> {
    if (this.accountDetails) return;
    // channel("undici:request:create").subscribe(console.log);
    const res = await fetch(accountUrl, { method: "GET", headers: await getReqHeaders(this.cognitoIdToken) });
    const body = await res.json();
    this.logger.debug({ getAccountDetails: { body } });
    if (!body.ResponseCode || !body.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (
      !body.AccountDetails?.AccountAwsAccount ||
      !body.AccountDetails?.AccountExtId ||
      !body.AccountDetails?.AccountUsername ||
      !body.AccountDetails?.AccountEmail
    ) {
      throw new Error("Missing some or all of AccountDetails from BD API Response");
    }
    this.accountDetails = <IAPIAccountDetails>body.AccountDetails;
    this.logger.debug({ accountDetails: this.accountDetails });
  }

  public async getUsername(): Promise<string> {
    await this._getAccountDetails();
    return this.accountDetails.AccountUsername;
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
      const foundIt = this.sharedTokens.find(e => e.shareId == shareId);
      if (!foundIt) throw new Error(`No token with share id ${shareId}`);
      const bdStsToken = foundIt.bdStsToken;
      this.decodedToken = jwt.decode(bdStsToken, { complete: true });
      this.logger.debug({ decodedToken: this.decodedToken });
      this.selectedToken = bdStsToken;
      const aud = this.decodedToken?.["payload"]?.aud; // audience
      this.logger.debug({ aud });
      if (!aud || !Array.isArray(aud) || aud.length < 3 || aud[2].length < 6 || aud[2] != shareId) {
        throw new Error("Decoded token not matching with selected shareId");
      }
    } else {
      if (!this.bdStsToken) throw new Error("No BD STS token");
      this.decodedToken = jwt.decode(this.bdStsToken, { complete: true });
      this.selectedToken = this.bdStsToken;
    }
    if (!this.decodedToken || !this.selectedToken) throw new Error(`Could not find STS token (share id ${shareId})`);
  }

  private dumpSelectedToken(): void {
    if (!this.selectedToken) throw new Error("No selected BD STS token");
    this.logger.debug({ bdStsToken: this.selectedToken, decodedToken: this.decodedToken });
  }

  private decodeTapToken(): void {
    if (!this.bdTapToken) throw new Error("No BD TAP token");
    this.decodedTapToken = jwt.decode(this.bdTapToken, { complete: true });
    if (!this.decodedTapToken) throw new Error(`Could not find TAP token`);
  }

  private dumpTapToken(): void {
    if (!this.bdTapToken) throw new Error("No BD TAP token");
    this.logger.debug({ bdTapToken: this.bdTapToken, decodedToken: this.decodedTapToken });
  }

  private getHumanReadable(exp: number): string {
    const humanReadable = new Date();
    humanReadable.setTime(exp * 1000);
    return humanReadable.toISOString();
  }

  private checkExp(exp: number, minutesAgo = 2): boolean {
    const minsAgo = new Date();
    minsAgo.setTime(Date.now() - minutesAgo * 60 * 1000);
    const diff = exp * 1000 - minsAgo.getTime();
    this.logger.debug({
      exp,
      diff,
      twoMinsAgo: minsAgo.toISOString(),
      expiresIn: this.getHumanReadable(exp),
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

  private async getTapTokenResp(updateConfigFile = true): Promise<ITapTokenResp | undefined> {
    this.decodeTapToken();
    this.dumpTapToken();
    if (!this.decodedTapToken || !this.bdTapToken) throw new Error("Unable to decode TAP token");
    const exp = this.decodedTapToken["payload"].exp;
    const iat = this.decodedTapToken["payload"].iat;
    const aud = this.decodedTapToken["payload"].aud;
    const tapTokenLifetimeMins = Math.floor((exp - iat) / 60);
    const oneHourMin = 60;
    if (exp && this.checkExp(exp, oneHourMin)) {
      this.logger.debug({ cachedBdTapToken: true });
      // we clean up expired tokens at the same time
      // clean first as we use deepmerge that merges lists and would otherwise cause duplicates
      const credentials = { bdTapToken: this.bdTapToken };
      if (updateConfigFile) await updateConfig({ credentials }); // local config file
      // NOTE: Even if the tokenLifetime would be different from the request, we return non-expired token
      return {
        bdTapToken: this.bdTapToken,
        cached: updateConfigFile != true,
        expiresIn: this.getHumanReadable(exp),
        tokenLifetimeMins: tapTokenLifetimeMins,
        username: aud?.[0],
        email: aud?.[1],
        sharingUser: aud?.[2],
      };
    }
    return; // expired
  }

  private async getTokenResp(
    shareId?: string,
  ): Promise<{ bdStsToken: string; cached: boolean; expiresIn: string; tokenLifetimeMins: number } | undefined> {
    this.selectAndDecodeToken(shareId);
    this.dumpSelectedToken();
    if (!this.decodedToken || !this.selectedToken) throw new Error("Unable to select/decode STS token");
    const exp = this.decodedToken["payload"].exp;
    const iat = this.decodedToken["payload"].iat;
    const tokenLifetimeMins = Math.floor((exp - iat) / 60);
    if (exp && this.checkExp(exp)) {
      this.logger.debug({ cachedBdStsToken: true });
      // we clean up expired tokens at the same time
      // clean first as we use deepmerge that merges lists and would otherwise cause duplicates
      await updateConfig({ credentials: { sharedTokens: undefined } });
      const credentials = { sharedTokens: serialiseTokensList(this.sharedTokens), bdStsToken: this.bdStsToken };
      await updateConfig({ credentials }); // local config file
      // NOTE: Even if the tokenLifetime would be different from the request, we return non-expired token
      return { bdStsToken: this.selectedToken, cached: true, expiresIn: this.getHumanReadable(exp), tokenLifetimeMins };
    }
    return; // expired
  }

  public async getTapToken(
    tokenLifetime: string,
    sharingUser?: string,
  ): Promise<{ bdTapToken: string; cached: boolean }> {
    // NOTE: Get fresh tap token every time for now.
    // const creds = await getConfigCredentials();
    // this.bdTapToken = creds.bdTapToken;
    // if (this.bdTapToken) {
    //   const cachedToken = await this.getTapTokenResp(false);
    //   if (cachedToken && ((sharingUser && cachedToken?.sharingUser === sharingUser) || !sharingUser)) {
    //     return cachedToken; // disk cached token is not yet expired..
    //   }
    // }
    // channel("undici:request:create").subscribe(console.log);
    // channel("undici:request:headers").subscribe(console.log);
    const headers = await getReqHeaders(this.cognitoIdToken); // , { tokenLifetime, vendingSchedule, shareId });
    const method = "POST";
    const body = JSON.stringify({ tokenLifetime, sharingUser });
    this.logger.debug({ method, tapTokenUrl, headers, body });
    const res = await fetch(tapTokenUrl, { method, headers, body });
    const resBody = await res.json();
    this.logger.debug({ getTapToken: { body: resBody } });
    if (!resBody.ResponseCode || !resBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (resBody.ResponseCode != "00") {
      spinnerError(resBody.ResponseText);
      throw new Error(`Failed to fetch token: ${resBody.ResponseText}`);
    }
    if (!resBody.bdTapToken) {
      throw new Error("Missing bdStsToken in BD API Response");
    }
    this.bdTapToken = resBody.bdTapToken;

    const resp = await this.getTapTokenResp(true);
    if (resp) return resp;
    throw new Error(`Failed to get fresh TAP token from BD API`);
  }

  public async getTapMasterSecret(
    application = "default",
  ): Promise<{ bdTapMasterSecret: string; cached: boolean; application: string }> {
    if (this.bdTapMasterSecret && this.bdTapMasterSecretApplication === application) {
      return { bdTapMasterSecret: this.bdTapMasterSecret, cached: true, application };
    }
    const headers = await getReqHeaders(this.cognitoIdToken); // , { tokenLifetime, vendingSchedule, shareId });
    const method = "POST";
    const body = JSON.stringify({ application });
    this.logger.debug({ method, tapMasterSecretUrl, headers, body });
    const res = await fetch(tapMasterSecretUrl, { method, headers, body });
    const resBody = await res.json();
    this.logger.debug({ getTapToken: { body: resBody } });
    if (!resBody.ResponseCode || !resBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (resBody.ResponseCode != "00") {
      spinnerError(resBody.ResponseText);
      throw new Error(`Failed to fetch token: ${resBody.ResponseText}`);
    }
    if (!resBody.bdTapMasterSecret) {
      throw new Error("Missing bdTapMasterSecret in BD API Response");
    }
    this.bdTapMasterSecret = resBody.bdTapMasterSecret;
    this.bdTapMasterSecretApplication = resBody?.application ?? "default";
    return {
      bdTapMasterSecret: resBody.bdTapMasterSecret,
      cached: false,
      application: resBody?.application ?? "default",
    };
  }

  public async getStsToken(tokenLifetime: string, shareId?: string): Promise<{ bdStsToken: string; cached: boolean }> {
    if (this.bdStsToken && !shareId) {
      this.selectedToken = this.bdStsToken;
      return { bdStsToken: this.bdStsToken, cached: true };
    }
    const creds = await getConfigCredentials();
    this.bdStsToken = creds.bdStsToken;
    this.sharedTokens = (await getCachedTokenSessions(this.logger)).filter(t => t.shareId != "NA");
    try {
      // Create response if we have all data in cache already
      const resp = await this.getTokenResp(shareId);
      if (resp) return resp;
    } catch (err) {
      this.logger.debug({ bdStsTokenError: err });
    }
    this.logger.debug({ bdStsTokenCached: this.bdStsToken });
    this.logger.debug({ status: "need fresh token" });

    // channel("undici:request:create").subscribe(console.log);
    // channel("undici:request:headers").subscribe(console.log);
    const headers = await getReqHeaders(this.cognitoIdToken); // , { tokenLifetime, vendingSchedule, shareId });
    let method = "GET";
    let body: string | undefined = undefined;
    if (shareId) {
      method = "POST";
      body = JSON.stringify({ tokenLifetime, shareId });
    }
    this.logger.debug({ method, tokenUrl: stsTokenUrl, headers, body });
    const res = await fetch(stsTokenUrl, { method, headers, body });
    const resBody = await res.json();
    this.logger.debug({ getStsToken: { body: resBody } });
    if (!resBody.ResponseCode || !resBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (resBody.ResponseCode != "00") {
      spinnerError(resBody.ResponseText);
      throw new Error(`Failed to fetch token: ${resBody.ResponseText}`);
    }
    if (!resBody.bdStsToken) {
      throw new Error("Missing bdStsToken in BD API Response");
    }
    if (shareId) {
      this.sharedTokens.push({
        shareId,
        bdStsToken: resBody.bdStsToken,
        minsRemaining: 0,
        status: "VALID",
        bdStsTokenPayload: {},
      });
    } else {
      this.bdStsToken = resBody.bdStsToken;
    }

    const resp = await this.getTokenResp(shareId);
    if (resp) return resp;
    throw new Error(`Failed to get fresh STS token from BD API (with share id ${shareId})`);
  }
}
