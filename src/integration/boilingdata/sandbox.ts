import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import { ILogger } from "../../bdcli/utils/logger_util.js";
import { getReqHeaders, sandboxUrl } from "./boilingdata_api.js";
import { createCheckers } from "ts-interface-checker";
import sandboxTemplateTI from "./sandbox-template.types-ti.js";
import { ITemplate } from "./sandbox-template.types.js";

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

  public isSandboxConfig(sandboxTemplate: unknown): sandboxTemplate is ITemplate {
    try {
      const { ITemplate } = createCheckers(sandboxTemplateTI);
      ITemplate?.check(sandboxTemplate);
      return true;
    } catch (err) {
      this.logger.error({ err });
      return false;
    }
  }

  public async destroySandbox(
    sandboxName: string,
    destroyAlsoInterfaces: boolean,
    finallyDeleteTemplate: boolean,
  ): Promise<any> {
    const headers = await getReqHeaders(this.cognitoIdToken);
    headers["x-bd-destroy-also-interfaces"] = `${destroyAlsoInterfaces}`;
    headers["x-bd-finally-delete-template"] = `${finallyDeleteTemplate}`;
    this.logger.debug({ sandboxUrl, headers });
    const res = await fetch(sandboxUrl + "/" + sandboxName, { method: "DELETE", headers });
    const respBody = await res.json();
    this.logger.debug({ DeleteSandbox: { respBody } });
    if (!respBody.ResponseCode || !respBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (respBody.ResponseCode != "00") throw new Error(respBody.ResponseText);
    return respBody;
  }

  public async downloadTemplate(sandboxName: string, version: string): Promise<string> {
    const headers = await getReqHeaders(this.cognitoIdToken);
    headers["x-bd-template-version"] = version;
    this.logger.debug({ sandboxUrl, headers });
    const res = await fetch(sandboxUrl + "/" + sandboxName, { method: "GET", headers });
    const respBody = await res.json();
    this.logger.debug({ DownloadSandbox: { respBody } });
    if (!respBody.ResponseCode || !respBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    return respBody?.template;
  }

  public async uploadTemplate(templateFilename: string): Promise<string> {
    // local validation
    const sandboxTemplateConfig = <object>yaml.load(await fs.readFile(templateFilename, "utf8"));
    if (!this.isSandboxConfig(sandboxTemplateConfig)) throw new Error("sandbox template config schema not validated");
    return this._uploadTemplate(templateFilename);
  }

  public async validateTemplate(templateFilename: string, warningsAsErrors = false): Promise<string> {
    // local validation
    const sandboxTemplateConfig = <object>yaml.load(await fs.readFile(templateFilename, "utf8"));
    if (!this.isSandboxConfig(sandboxTemplateConfig)) throw new Error("sandbox template config schema not validated");
    const validateOnly = true;
    // remote validation
    return this._uploadTemplate(templateFilename, validateOnly, warningsAsErrors);
  }

  public async listSandboxes(
    listDeleted: boolean,
    listVersions: boolean,
  ): Promise<Array<{ name: string; status: string }>> {
    // channel("undici:request:create").subscribe(console.log);
    // channel("undici:request:headers").subscribe(console.log);
    const headers = await getReqHeaders(this.cognitoIdToken);
    headers["x-bd-list-deleted"] = `${listDeleted}`;
    headers["x-bd-list-versions"] = `${listVersions}`;
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

  public async planSandbox(sandboxName: string): Promise<any> {
    const planOnly = true;
    const diffOnly = false;
    return this._deploySandbox(sandboxName, planOnly, diffOnly);
  }

  public async diffSandbox(sandboxName: string): Promise<any> {
    const planOnly = false;
    const diffOnly = true;
    return this._deploySandbox(sandboxName, planOnly, diffOnly);
  }

  public async deploySandbox(sandboxName: string): Promise<any> {
    return this._deploySandbox(sandboxName);
  }

  // ---- private ----

  private async _uploadTemplate(
    templateFilename: string,
    validateOnly = false,
    warningsAsErrors = false,
  ): Promise<string> {
    const headers = await getReqHeaders(this.cognitoIdToken);
    this.logger.debug({ sandboxUrl, headers });
    const template = Buffer.from(await fs.readFile(templateFilename)).toString("base64");
    const body = JSON.stringify({ validateOnly, warningsAsErrors, template });
    this.logger.debug({ body });
    const res = await fetch(sandboxUrl, { method: "PUT", headers, body });
    const respBody = await res.json();
    this.logger.debug({ ValidateSandbox: { respBody } });
    if (!respBody.ResponseCode || !respBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (respBody.ResponseCode != "00") {
      throw new Error(respBody?.validationResults ?? respBody);
    }
    return respBody;
  }

  private async _deploySandbox(sandboxName: string, planOnly = false, diffOnly = false): Promise<string> {
    const action = planOnly ? "plan" : diffOnly ? "diff" : "deploy";
    const headers = await getReqHeaders(this.cognitoIdToken);
    this.logger.debug({ sandboxUrl, headers });
    const body = JSON.stringify({ planOnly, diffOnly });
    const res = await fetch(sandboxUrl + "/" + sandboxName, { method: "PUT", headers, body });
    const respBody = await res.json();
    this.logger.debug({ listSandboxes: { body: respBody } });
    if (!respBody.ResponseCode || !respBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (respBody.ResponseCode != "00") {
      throw new Error(`Failed to ${action} ${sandboxName}`);
    }
    return respBody;
  }
}
