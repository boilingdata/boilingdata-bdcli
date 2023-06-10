import { ILogger } from "../../bdcli/utils/logger_util.js";
import { dataSetsUrl, getReqHeaders } from "../utils/http_util.js";
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

  public async setIamRole(): Promise<void> {
    //channel("undici:request:create").subscribe(console.log);
    const body = JSON.stringify({});
    const res = await fetch(dataSetsUrl + "default", { method: "PUT", headers: await getReqHeaders(this.token), body });
    this.logger.debug({ res });
  }

  public async getAssumeAwsAccount(): Promise<string> {
    // FIXME: Fetch from API
    return "589434896614";
  }

  public async getExtId(): Promise<string> {
    // FIXME: Fetch from API
    return "fixmeDummyExtId";
  }
}
