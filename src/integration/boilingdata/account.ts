import { ILogger } from "../../bdcli/utils/logger_util.js";
import { accountUrl, getReqHeaders } from "./boilingdata_api.js";
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
  private token: string;
  private logger: ILogger;
  private accountDetails!: IAPIAccountDetails;

  constructor(private params: IBDConfig) {
    this.logger = this.params.logger;
    this.logger.debug(this.params);
    this.token = this.params.authToken;
  }

  public async setIamRoleWithPayload(IamRoleArn: string, payload: any): Promise<void> {
    // channel("undici:request:create").subscribe(console.log);
    const body = JSON.stringify({ IamRoleArn, ...payload });
    this.logger.debug({ body });
    const res = await fetch(accountUrl + "/iamrole", { method: "PUT", headers: await getReqHeaders(this.token), body });
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
    //channel("undici:request:create").subscribe(console.log);
    const res = await fetch(accountUrl, { method: "GET", headers: await getReqHeaders(this.token) });
    const body = await res.json();
    this.logger.debug({ getExtId: { body } });
    if (!body.ResponseCode || !body.ResponseText) {
      throw new Error("Malformed response from BD API Response");
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
}
