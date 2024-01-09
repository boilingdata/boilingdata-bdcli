import { ILogger } from "../../bdcli/utils/logger_util.js";
import { getReqHeaders, sandboxUrl } from "./boilingdata_api.js";
import * as fs from "fs/promises";

// import { channel } from "node:diagnostics_channel";

export interface IBDConfig {
  authToken: string;
  logger: ILogger;
}

export class BDSandbox {
  private cognitoIdToken: string;
  private logger: ILogger;

  constructor(private params: IBDConfig) {
    this.logger = this.params.logger;
    // this.logger.debug(this.params);
    this.cognitoIdToken = this.params.authToken;
  }

  public async downloadTemplate(templateName: string): Promise<string> {
    const headers = await getReqHeaders(this.cognitoIdToken);
    this.logger.debug({ sandboxUrl, headers });
    const res = await fetch(sandboxUrl + "/" + templateName, { method: "GET", headers });
    const respBody = await res.json();
    this.logger.debug({ DownloadSandbox: { respBody } });
    if (!respBody.ResponseCode || !respBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    return respBody?.template;
  }

  public async uploadTemplate(templateFilename: string, validateOnly = false): Promise<string> {
    const headers = await getReqHeaders(this.cognitoIdToken);
    this.logger.debug({ sandboxUrl, headers });
    const template = Buffer.from(await fs.readFile(templateFilename)).toString("base64");
    const body = JSON.stringify({ validateOnly, template });
    this.logger.debug({ body });
    const res = await fetch(sandboxUrl, { method: "PUT", headers, body });
    const respBody = await res.json();
    this.logger.debug({ ValidateSandbox: { respBody } });
    if (!respBody.ResponseCode || !respBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (validateOnly && (!respBody?.isValidateOnly || respBody.validationResults != "OK")) {
      throw new Error(`Validation failed: ${respBody.validationResults}`);
    }
    return respBody.isValidateOnly;
  }

  public async validateTemplate(templateFilename: string): Promise<string> {
    return this.uploadTemplate(templateFilename, true);
  }

  public async listSandboxes(): Promise<Array<{ name: string; status: string }>> {
    // channel("undici:request:create").subscribe(console.log);
    // channel("undici:request:headers").subscribe(console.log);
    const headers = await getReqHeaders(this.cognitoIdToken);
    this.logger.debug({ sandboxUrl, headers });
    const res = await fetch(sandboxUrl, { method: "GET", headers });
    const body = await res.json();
    this.logger.debug({ listSandboxes: { body } });
    if (!body.ResponseCode || !body.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (Array.isArray(body.sandboxList)) {
      return body.sandboxList;
    }
    throw new Error("Failed to list sandboxes");
  }
}
