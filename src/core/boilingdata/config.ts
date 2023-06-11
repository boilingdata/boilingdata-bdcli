import { ILogger } from "../../bdcli/utils/logger_util.js";
import { accountUrl, getReqHeaders } from "../utils/http_util.js";
// import { channel } from "node:diagnostics_channel";

export interface IBDConfig {
  authToken: string;
  logger: ILogger;
}

export class BDAccount {
  private token: string;
  private logger: ILogger;

  constructor(private params: IBDConfig) {
    this.logger = this.params.logger;
    this.logger.debug(this.params);
    this.token = this.params.authToken;
  }

  public async setIamRole(iamRoleArn: string): Promise<void> {
    //channel("undici:request:create").subscribe(console.log);
    const body = JSON.stringify({ iamRoleArn });
    const res = await fetch(accountUrl + "iamrole", { method: "PUT", headers: await getReqHeaders(this.token), body });
    // this.logger.debug({ res });
    if (res.status != 200 && res.status != 201) {
      this.logger.error({ status: res.status, statusText: res.statusText });
      throw new Error(`Failed to set IAM Role (${iamRoleArn}) - ${res.status} ${res.statusText}`);
    }
  }

  public async getAssumeAwsAccount(): Promise<string> {
    // TODO: Fetch from API
    return "589434896614";
  }

  public async getExtId(): Promise<string> {
    //channel("undici:request:create").subscribe(console.log);
    const res = await fetch(accountUrl, { method: "GET", headers: await getReqHeaders(this.token) });
    //this.logger.debug({ res });
    const body = await res.json();
    this.logger.debug({ getExtId: { body } });
    return body;
  }
}
