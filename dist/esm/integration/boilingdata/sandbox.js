import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as yaml from "js-yaml";
import { getReqHeaders, sandboxUrl } from "./boilingdata_api.js";
import { createCheckers } from "ts-interface-checker";
import sandboxTemplateTI from "./sandbox-template.types-ti.js";
import * as path from "path";
export class BDSandbox {
    params;
    cognitoIdToken;
    logger;
    _tmpl;
    tmplErrors = [];
    constructor(params) {
        this.params = params;
        this.logger = this.params.logger;
        // this.logger.debug(this.params);
        this.cognitoIdToken = this.params.authToken;
    }
    get tmpl() {
        return this._tmpl;
    }
    get region() {
        return this._tmpl.region;
    }
    withTemplate(templateFilename) {
        this.validateTemplateLocal(templateFilename);
        return this;
    }
    getSandboxTemplateErrors() {
        return this.tmplErrors.map(e => "\t" + e).join("\n");
    }
    isSandboxConfig(sandboxTemplate) {
        try {
            const { ITemplate: ITemplateChecker } = createCheckers(sandboxTemplateTI);
            if (!ITemplateChecker)
                throw new Error("ts-interface-check checker MISSING");
            ITemplateChecker.check(sandboxTemplate);
            return true;
        }
        catch (err) {
            //this.logger.error(`\n${err?.message}`);
            this.tmplErrors.push(err?.message.replace("value.", ""));
            return false;
        }
    }
    async destroySandbox(sandboxName, destroyAlsoInterfaces, finallyDeleteTemplate) {
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
        if (respBody.ResponseCode != "00")
            throw new Error(respBody.ResponseText);
        return respBody;
    }
    async downloadTemplate(sandboxName, version, status) {
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
        if (respBody.ResponseCode != "00") {
            throw new Error(respBody.ResponseText);
        }
        return respBody?.template;
    }
    validateTemplateLocal(templateFilename) {
        let fileContents;
        let sandboxTemplateConfig;
        try {
            fileContents = fsSync.readFileSync(templateFilename, "utf8");
        }
        catch (err) {
            throw new Error(`${err?.message}`);
        }
        try {
            sandboxTemplateConfig = yaml.load(fileContents);
        }
        catch (err) {
            throw new Error(`${err?.message}`);
        }
        this.logger.debug(sandboxTemplateConfig);
        if (!this.isSandboxConfig(sandboxTemplateConfig))
            throw new Error(`sandbox template config schema not validated:\n${this.getSandboxTemplateErrors()}`);
        this._tmpl = sandboxTemplateConfig;
    }
    async uploadTemplate(templateFilename, allowChangedFilename = false) {
        this.validateTemplateLocal(templateFilename);
        return this._uploadTemplate(templateFilename, false, false, allowChangedFilename);
    }
    async validateTemplate(templateFilename, warningsAsErrors = false) {
        this.validateTemplateLocal(templateFilename);
        const validateOnly = true;
        return this._uploadTemplate(templateFilename, validateOnly, warningsAsErrors);
    }
    async listSandboxes(listDeleted, listVersions) {
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
    async planSandbox(sandboxName) {
        const planOnly = true;
        const diffOnly = false;
        return this._deploySandbox(sandboxName, planOnly, diffOnly);
    }
    async diffSandbox(sandboxName) {
        const planOnly = false;
        const diffOnly = true;
        return this._deploySandbox(sandboxName, planOnly, diffOnly);
    }
    async deploySandbox(sandboxName) {
        return this._deploySandbox(sandboxName);
    }
    // ---- private ----
    async _uploadTemplate(templateFilename, validateOnly = false, warningsAsErrors = false, allowChangedFilename = false) {
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
        if (respBody.ResponseCode != "00") {
            throw new Error(respBody?.validationResults ?? respBody);
        }
        return respBody;
    }
    async _deploySandbox(sandboxName, planOnly = false, diffOnly = false) {
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
