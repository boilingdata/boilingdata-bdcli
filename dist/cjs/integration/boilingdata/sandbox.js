"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BDSandbox = void 0;
const fs = __importStar(require("fs/promises"));
const fsSync = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const boilingdata_api_js_1 = require("./boilingdata_api.js");
const ts_interface_checker_1 = require("ts-interface-checker");
const sandbox_template_types_ti_js_1 = __importDefault(require("./sandbox-template.types-ti.js"));
const path = __importStar(require("path"));
class BDSandbox {
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
            const { ITemplate: ITemplateChecker } = (0, ts_interface_checker_1.createCheckers)(sandbox_template_types_ti_js_1.default);
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
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken);
        headers["x-bd-destroy-also-interfaces"] = `${destroyAlsoInterfaces}`;
        headers["x-bd-finally-delete-template"] = `${finallyDeleteTemplate}`;
        this.logger.debug({ sandboxUrl: boilingdata_api_js_1.sandboxUrl, headers });
        const res = await fetch(boilingdata_api_js_1.sandboxUrl + "/" + sandboxName, { method: "DELETE", headers });
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
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken);
        headers["x-bd-template-version"] = version;
        headers["x-bd-template-status"] = status ?? "uploaded";
        this.logger.debug({ sandboxUrl: boilingdata_api_js_1.sandboxUrl, headers });
        const res = await fetch(boilingdata_api_js_1.sandboxUrl + "/" + sandboxName, { method: "GET", headers });
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
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken);
        headers["x-bd-list-deleted"] = `${listDeleted}`;
        headers["x-bd-list-versions"] = `${listVersions}`;
        this.logger.debug({ sandboxUrl: boilingdata_api_js_1.sandboxUrl, headers });
        const res = await fetch(boilingdata_api_js_1.sandboxUrl, { method: "GET", headers });
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
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken);
        this.logger.debug({ sandboxUrl: boilingdata_api_js_1.sandboxUrl, headers });
        const template = Buffer.from(await fs.readFile(templateFilename)).toString("base64");
        const body = JSON.stringify({
            validateOnly,
            warningsAsErrors,
            template,
            templateFilename: path.basename(templateFilename),
            allowChangedFilename,
        });
        this.logger.debug({ body });
        const res = await fetch(boilingdata_api_js_1.sandboxUrl, { method: "PUT", headers, body });
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
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken);
        this.logger.debug({ sandboxUrl: boilingdata_api_js_1.sandboxUrl, headers });
        const body = JSON.stringify({ planOnly, diffOnly });
        const res = await fetch(boilingdata_api_js_1.sandboxUrl + "/" + sandboxName, { method: "PUT", headers, body });
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
exports.BDSandbox = BDSandbox;
