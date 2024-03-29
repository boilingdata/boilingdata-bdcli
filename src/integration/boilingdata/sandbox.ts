import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as yaml from "js-yaml";
import { ILogger } from "../../bdcli/utils/logger_util.js";
import { getReqHeaders, sandboxUrl } from "./boilingdata_api.js";
import { createCheckers } from "ts-interface-checker";
import sandboxTemplateTI from "./sandbox-template.types-ti.js";
import { ITemplate } from "./sandbox-template.types.js";
import * as path from "path";

// import { channel } from "node:diagnostics_channel";

export interface IBDConfig {
  authToken: string;
  logger: ILogger;
}

export class BDSandbox {
  private cognitoIdToken: string;
  private logger: ILogger;
  private _tmpl!: ITemplate;
  private tmplErrors: string[] = [];

  constructor(private params: IBDConfig) {
    this.logger = this.params.logger;
    // this.logger.debug(this.params);
    this.cognitoIdToken = this.params.authToken;
  }

  public get tmpl(): ITemplate {
    return this._tmpl;
  }

  public get region(): string | undefined {
    return this._tmpl.region;
  }

  public withTemplate(templateFilename: string): this {
    this.validateTemplateLocal(templateFilename);
    return this;
  }

  public getSandboxTemplateErrors(): string {
    return this.tmplErrors.map(e => "\t" + e).join("\n");
  }

  public isSandboxConfig(sandboxTemplate: unknown): sandboxTemplate is ITemplate {
    try {
      const { ITemplate: ITemplateChecker } = createCheckers(sandboxTemplateTI);
      if (!ITemplateChecker) throw new Error("ts-interface-check checker MISSING");
      ITemplateChecker.check(sandboxTemplate);
      return true;
    } catch (err: any) {
      //this.logger.error(`\n${err?.message}`);
      this.tmplErrors.push(err?.message.replace("value.", ""));
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
    if (respBody.ResponseCode == "01" && respBody.ResponseText == "Integration failure") {
      throw new Error(`Busy to destroy sandbox`);
    }
    if (respBody.ResponseCode != "00") throw new Error(respBody.ResponseText);
    return respBody;
  }

  public async downloadTemplate(sandboxName: string, version: string, status?: string): Promise<string> {
    const headers = await getReqHeaders(this.cognitoIdToken);
    headers["x-bd-template-version"] = version;
    headers["x-bd-template-status"] = status ?? "uploaded";
    this.logger.debug({ sandboxUrl, headers });
    const res = await fetch(sandboxUrl + "/" + sandboxName, { method: "GET", headers });
    const respBody = await res.json();
    this.logger.debug({ DownloadSandbox: { respBody } });
    if (!respBody.ResponseCode || !respBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (respBody.ResponseCode == "01" && respBody.ResponseText == "Integration failure") {
      throw new Error(`Busy to download template`);
    }
    if (respBody.ResponseCode != "00") {
      throw new Error(respBody.ResponseText);
    }
    return respBody?.template;
  }

  public validateTemplateLocal(templateFilename: string): void {
    let fileContents;
    let sandboxTemplateConfig;
    try {
      fileContents = fsSync.readFileSync(templateFilename, "utf8");
    } catch (err: any) {
      throw new Error(`${err?.message}`);
    }
    try {
      sandboxTemplateConfig = <object>yaml.load(fileContents);
    } catch (err: any) {
      throw new Error(`${err?.message}`);
    }
    this.logger.debug(sandboxTemplateConfig);
    if (!this.isSandboxConfig(sandboxTemplateConfig))
      throw new Error(`sandbox template config schema not validated:\n${this.getSandboxTemplateErrors()}`);
    this._tmpl = sandboxTemplateConfig;
  }

  public async uploadTemplate(templateFilename: string, allowChangedFilename = false): Promise<string> {
    this.validateTemplateLocal(templateFilename);
    return this._uploadTemplate(templateFilename, false, false, allowChangedFilename);
  }

  public async validateTemplate(templateFilename: string, warningsAsErrors = false): Promise<string> {
    this.validateTemplateLocal(templateFilename);
    const validateOnly = true;
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
    if (body.ResponseCode == "01" && body.ResponseText == "Integration failure") {
      throw new Error(`Busy to list sandboxes`);
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

  public async updateSandbox(sandboxName: string): Promise<any> {
    return this._updateSandbox(sandboxName);
  }

  // ---- private ----

  private async _updateSandbox(sandboxName: string): Promise<any> {
    const headers = await getReqHeaders(this.cognitoIdToken);
    this.logger.debug({ sandboxUrl, headers });
    const res = await fetch(sandboxUrl + "/" + sandboxName, { method: "PATCH", headers });
    const respBody = await res.json();
    this.logger.debug({ updateSandboxe: { body: respBody } });
    if (!respBody.ResponseCode || !respBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (respBody.ResponseCode == "01" && respBody.ResponseText == "Integration failure") {
      throw new Error(`Busy to update ${sandboxName}`);
    }
    if (respBody.ResponseCode != "00") {
      throw new Error(`Failed to patch ${sandboxName}`);
    }
    return respBody;
  }

  private async _uploadTemplate(
    templateFilename: string,
    validateOnly = false,
    warningsAsErrors = false,
    allowChangedFilename = false,
  ): Promise<string> {
    const headers = await getReqHeaders(this.cognitoIdToken);
    this.logger.debug({ sandboxUrl, headers });
    const template = Buffer.from(await fs.readFile(templateFilename)).toString("base64");
    const body = JSON.stringify({
      validateOnly,
      warningsAsErrors,
      template,
      templateFilename: path.basename(templateFilename),
      allowChangedFilename,
    });
    this.logger.debug({ body });
    const res = await fetch(sandboxUrl, { method: "PUT", headers, body });
    const respBody = await res.json();
    this.logger.debug({ ValidateSandbox: { respBody } });
    if (!respBody.ResponseCode || !respBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (respBody.ResponseCode == "01" && respBody.ResponseText == "Integration failure") {
      throw new Error(`Busy to validate and upload template`);
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
    this.logger.debug({ deploySandbox: { body: respBody } });
    if (!respBody.ResponseCode || !respBody.ResponseText) {
      throw new Error("Malformed response from BD API");
    }
    if (respBody.ResponseCode == "01" && respBody.ResponseText == "Integration failure") {
      throw new Error(`Busy to ${action} ${sandboxName}`);
    }
    if (respBody.ResponseCode != "00") {
      throw new Error(`Failed to ${action} ${sandboxName}`);
    }
    return respBody;
  }
}
