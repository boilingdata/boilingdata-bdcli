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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BDAccount = void 0;
const config_util_js_1 = require("../../bdcli/utils/config_util.js");
const boilingdata_api_js_1 = require("./boilingdata_api.js");
const jwt = __importStar(require("jsonwebtoken"));
class BDAccount {
    params;
    cognitoIdToken;
    bdStsToken;
    decodedToken;
    logger;
    accountDetails;
    constructor(params) {
        this.params = params;
        this.logger = this.params.logger;
        // this.logger.debug(this.params);
        this.cognitoIdToken = this.params.authToken;
    }
    async setIamRoleWithPayload(IamRoleArn, payload) {
        // channel("undici:request:create").subscribe(console.log);
        const body = JSON.stringify({ IamRoleArn, ...payload });
        this.logger.debug({ body });
        const res = await fetch(boilingdata_api_js_1.accountUrl + "/iamrole", {
            method: "PUT",
            headers: await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken),
            body,
        });
        const respBody = await res.json();
        this.logger.info("\n" + JSON.stringify(respBody));
        if (res.status != 200 && res.status != 201) {
            this.logger.error({ status: res.status, statusText: res.statusText, respBody });
            throw new Error(`Failed to configure IAM Role (${IamRoleArn}) into BoilingData - ${res.status} ${res.statusText}: ${respBody?.ResponseText}; ${respBody?.RequestId}`);
        }
    }
    async _getAccountDetails() {
        if (this.accountDetails)
            return;
        // channel("undici:request:create").subscribe(console.log);
        const res = await fetch(boilingdata_api_js_1.accountUrl, { method: "GET", headers: await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken) });
        const body = await res.json();
        this.logger.debug({ getAccountDetails: { body } });
        if (!body.ResponseCode || !body.ResponseText) {
            throw new Error("Malformed response from BD API");
        }
        if (!body.AccountDetails?.AccountAwsAccount || !body.AccountDetails?.AccountExtId) {
            throw new Error("Missing AccountDetails from BD API Response");
        }
        this.accountDetails = body.AccountDetails;
        this.logger.debug({ accountDetails: this.accountDetails });
    }
    async getAssumeAwsAccount() {
        await this._getAccountDetails();
        return this.accountDetails.AccountAwsAccount;
    }
    async getExtId() {
        await this._getAccountDetails();
        return this.accountDetails.AccountExtId;
    }
    decodeToken() {
        if (!this.bdStsToken)
            throw new Error("No BD STS token");
        this.decodedToken = jwt.decode(this.bdStsToken, { complete: true });
    }
    dumpToken() {
        if (!this.bdStsToken)
            throw new Error("No BD STS token");
        this.decodeToken();
        this.logger.debug({ bdStsToken: this.bdStsToken, decodedToken: this.decodedToken });
    }
    checkExp(exp) {
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
        if (diff < 0)
            return false;
        return true;
    }
    async listSharedTokens() {
        // channel("undici:request:create").subscribe(console.log);
        // channel("undici:request:headers").subscribe(console.log);
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken);
        this.logger.debug({ tokenShareUrl: boilingdata_api_js_1.tokenShareUrl, headers });
        const res = await fetch(boilingdata_api_js_1.tokenShareUrl, { method: "GET", headers });
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
    async shareToken(tokenLifetime, vendingSchedule = "* * * * * *", users, shareName = "", shareSql = "") {
        // channel("undici:request:create").subscribe(console.log);
        // channel("undici:request:headers").subscribe(console.log);
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken);
        const putBody = JSON.stringify({ users, vendingSchedule, tokenLifetime, shareName, shareSql });
        this.logger.debug({ tokenShareUrl: boilingdata_api_js_1.tokenShareUrl, headers, body: putBody });
        const res = await fetch(boilingdata_api_js_1.tokenShareUrl, { method: "PUT", headers, body: putBody });
        const resBody = await res.json();
        this.logger.debug({ shareToken: { body: resBody } });
        if (!resBody.ResponseCode || !resBody.ResponseText) {
            throw new Error("Malformed response from BD API");
        }
        if (resBody.ResponseCode == "00" && resBody.ResponseText == "OK")
            return;
        throw new Error("Failed to share token");
    }
    async unshareToken(users) {
        // channel("undici:request:create").subscribe(console.log);
        // channel("undici:request:headers").subscribe(console.log);
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken);
        const putBody = JSON.stringify({ users });
        this.logger.debug({ tokenShareUrl: boilingdata_api_js_1.tokenShareUrl, headers, body: putBody });
        const res = await fetch(boilingdata_api_js_1.tokenShareUrl, { method: "DELETE", headers, body: putBody });
        const resBody = await res.json();
        this.logger.debug({ unshareToken: { body: resBody } });
        if (!resBody.ResponseCode || !resBody.ResponseText) {
            throw new Error("Malformed response from BD API");
        }
        if (resBody.ResponseCode == "00" && resBody.ResponseText == "OK")
            return;
        throw new Error("Failed to unshare token");
    }
    async getToken(tokenLifetime, vendingSchedule) {
        if (this.bdStsToken)
            return { bdStsToken: this.bdStsToken, cached: true };
        this.bdStsToken = (await (0, config_util_js_1.getConfigCredentials)()).bdStsToken;
        if (this.bdStsToken) {
            try {
                this.decodeToken();
                this.dumpToken();
                if (!this.decodedToken)
                    throw new Error("Unable to decode token");
                const exp = this.decodedToken["payload"].exp;
                if (exp && this.checkExp(exp)) {
                    this.logger.debug({ cachedBdStstToken: true });
                    return { bdStsToken: this.bdStsToken, cached: true };
                }
            }
            catch (err) {
                this.logger.debug({ bdStsTokenError: err });
            }
        }
        else {
            this.logger.debug({ bdStsTokenCached: this.bdStsToken });
        }
        // channel("undici:request:create").subscribe(console.log);
        // channel("undici:request:headers").subscribe(console.log);
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken, { tokenLifetime, vendingSchedule });
        this.logger.debug({ tokenUrl: boilingdata_api_js_1.tokenUrl, headers });
        const res = await fetch(boilingdata_api_js_1.tokenUrl, { method: "GET", headers });
        const body = await res.json();
        this.logger.debug({ getStsToken: { body } });
        if (!body.ResponseCode || !body.ResponseText) {
            throw new Error("Malformed response from BD API");
        }
        if (!body.bdStsToken) {
            throw new Error("Missing bdStsToken in BD API Response");
        }
        this.bdStsToken = body.bdStsToken;
        this.decodeToken();
        this.dumpToken();
        if (!this.decodedToken)
            throw new Error("Unable to decode token");
        const exp = this.decodedToken["payload"].exp;
        if (exp && this.checkExp(exp)) {
            this.logger.debug({ cachedBdStstToken: true });
            await (0, config_util_js_1.updateConfig)({ credentials: { bdStsToken: this.bdStsToken } }); // local cache
            return { bdStsToken: this.bdStsToken, cached: false };
        }
        throw new Error("Failed to get fresh token from BD API");
    }
}
exports.BDAccount = BDAccount;
