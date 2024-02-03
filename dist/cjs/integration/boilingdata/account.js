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
const spinner_util_js_1 = require("../../bdcli/utils/spinner_util.js");
const boilingdata_api_js_1 = require("./boilingdata_api.js");
const jwt = __importStar(require("jsonwebtoken"));
class BDAccount {
    params;
    cognitoIdToken;
    bdStsToken;
    bdTapToken;
    sharedTokens;
    selectedToken;
    decodedToken;
    decodedTapToken;
    logger;
    accountDetails;
    constructor(params) {
        this.params = params;
        this.logger = this.params.logger;
        // this.logger.debug(this.params);
        this.cognitoIdToken = this.params.authToken;
        this.sharedTokens = [];
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
        if (!body.AccountDetails?.AccountAwsAccount ||
            !body.AccountDetails?.AccountExtId ||
            !body.AccountDetails?.AccountUsername ||
            !body.AccountDetails?.AccountEmail) {
            throw new Error("Missing some or all of AccountDetails from BD API Response");
        }
        this.accountDetails = body.AccountDetails;
        this.logger.debug({ accountDetails: this.accountDetails });
    }
    async getUsername() {
        await this._getAccountDetails();
        return this.accountDetails.AccountUsername;
    }
    async getAssumeAwsAccount() {
        await this._getAccountDetails();
        return this.accountDetails.AccountAwsAccount;
    }
    async getExtId() {
        await this._getAccountDetails();
        return this.accountDetails.AccountExtId;
    }
    selectAndDecodeToken(shareId) {
        if (shareId) {
            const foundIt = this.sharedTokens.find(e => e.shareId == shareId);
            if (!foundIt)
                throw new Error(`No token with share id ${shareId}`);
            const bdStsToken = foundIt.bdStsToken;
            this.decodedToken = jwt.decode(bdStsToken, { complete: true });
            this.logger.debug({ decodedToken: this.decodedToken });
            this.selectedToken = bdStsToken;
            const aud = this.decodedToken?.["payload"]?.aud; // audience
            this.logger.debug({ aud });
            if (!aud || !Array.isArray(aud) || aud.length < 3 || aud[2].length < 6 || aud[2] != shareId) {
                throw new Error("Decoded token not matching with selected shareId");
            }
        }
        else {
            if (!this.bdStsToken)
                throw new Error("No BD STS token");
            this.decodedToken = jwt.decode(this.bdStsToken, { complete: true });
            this.selectedToken = this.bdStsToken;
        }
        if (!this.decodedToken || !this.selectedToken)
            throw new Error(`Could not find STS token (share id ${shareId})`);
    }
    dumpSelectedToken() {
        if (!this.selectedToken)
            throw new Error("No selected BD STS token");
        this.logger.debug({ bdStsToken: this.selectedToken, decodedToken: this.decodedToken });
    }
    decodeTapToken() {
        if (!this.bdTapToken)
            throw new Error("No BD TAP token");
        this.decodedTapToken = jwt.decode(this.bdTapToken, { complete: true });
        if (!this.decodedTapToken)
            throw new Error(`Could not find TAP token`);
    }
    dumpTapToken() {
        if (!this.bdTapToken)
            throw new Error("No BD TAP token");
        this.logger.debug({ bdTapToken: this.bdTapToken, decodedToken: this.decodedTapToken });
    }
    getHumanReadable(exp) {
        const humanReadable = new Date();
        humanReadable.setTime(exp * 1000);
        return humanReadable.toISOString();
    }
    checkExp(exp, minutesAgo = 2) {
        const minsAgo = new Date();
        minsAgo.setTime(Date.now() - minutesAgo * 60 * 1000);
        const diff = exp * 1000 - minsAgo.getTime();
        this.logger.debug({
            exp,
            diff,
            twoMinsAgo: minsAgo.toISOString(),
            expiresIn: this.getHumanReadable(exp),
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
    async unshareToken(shareId) {
        // channel("undici:request:create").subscribe(console.log);
        // channel("undici:request:headers").subscribe(console.log);
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken);
        const putBody = JSON.stringify({ shareId });
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
    async getTapTokenResp(updateConfigFile = true) {
        this.decodeTapToken();
        this.dumpTapToken();
        if (!this.decodedTapToken || !this.bdTapToken)
            throw new Error("Unable to decode TAP token");
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
            if (updateConfigFile)
                await (0, config_util_js_1.updateConfig)({ credentials }); // local config file
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
    async getTokenResp(shareId) {
        this.selectAndDecodeToken(shareId);
        this.dumpSelectedToken();
        if (!this.decodedToken || !this.selectedToken)
            throw new Error("Unable to select/decode STS token");
        const exp = this.decodedToken["payload"].exp;
        const iat = this.decodedToken["payload"].iat;
        const tokenLifetimeMins = Math.floor((exp - iat) / 60);
        if (exp && this.checkExp(exp)) {
            this.logger.debug({ cachedBdStsToken: true });
            // we clean up expired tokens at the same time
            // clean first as we use deepmerge that merges lists and would otherwise cause duplicates
            await (0, config_util_js_1.updateConfig)({ credentials: { sharedTokens: undefined } });
            const credentials = { sharedTokens: (0, config_util_js_1.serialiseTokensList)(this.sharedTokens), bdStsToken: this.bdStsToken };
            await (0, config_util_js_1.updateConfig)({ credentials }); // local config file
            // NOTE: Even if the tokenLifetime would be different from the request, we return non-expired token
            return { bdStsToken: this.selectedToken, cached: true, expiresIn: this.getHumanReadable(exp), tokenLifetimeMins };
        }
        return; // expired
    }
    async getTapToken(tokenLifetime, sharingUser) {
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
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken); // , { tokenLifetime, vendingSchedule, shareId });
        const method = "POST";
        const body = JSON.stringify({ tokenLifetime, sharingUser });
        this.logger.debug({ method, tapTokenUrl: boilingdata_api_js_1.tapTokenUrl, headers, body });
        const res = await fetch(boilingdata_api_js_1.tapTokenUrl, { method, headers, body });
        const resBody = await res.json();
        this.logger.debug({ getTapToken: { body: resBody } });
        if (!resBody.ResponseCode || !resBody.ResponseText) {
            throw new Error("Malformed response from BD API");
        }
        if (resBody.ResponseCode != "00") {
            (0, spinner_util_js_1.spinnerError)(resBody.ResponseText);
            throw new Error(`Failed to fetch token: ${resBody.ResponseText}`);
        }
        if (!resBody.bdTapToken) {
            throw new Error("Missing bdStsToken in BD API Response");
        }
        this.bdTapToken = resBody.bdTapToken;
        const resp = await this.getTapTokenResp(true);
        if (resp)
            return resp;
        throw new Error(`Failed to get fresh TAP token from BD API`);
    }
    async getStsToken(tokenLifetime, shareId) {
        if (this.bdStsToken && !shareId) {
            this.selectedToken = this.bdStsToken;
            return { bdStsToken: this.bdStsToken, cached: true };
        }
        const creds = await (0, config_util_js_1.getConfigCredentials)();
        this.bdStsToken = creds.bdStsToken;
        this.sharedTokens = (await (0, config_util_js_1.getCachedTokenSessions)(this.logger)).filter(t => t.shareId != "NA");
        try {
            // Create response if we have all data in cache already
            const resp = await this.getTokenResp(shareId);
            if (resp)
                return resp;
        }
        catch (err) {
            this.logger.debug({ bdStsTokenError: err });
        }
        this.logger.debug({ bdStsTokenCached: this.bdStsToken });
        this.logger.debug({ status: "need fresh token" });
        // channel("undici:request:create").subscribe(console.log);
        // channel("undici:request:headers").subscribe(console.log);
        const headers = await (0, boilingdata_api_js_1.getReqHeaders)(this.cognitoIdToken); // , { tokenLifetime, vendingSchedule, shareId });
        let method = "GET";
        let body = undefined;
        if (shareId) {
            method = "POST";
            body = JSON.stringify({ tokenLifetime, shareId });
        }
        this.logger.debug({ method, tokenUrl: boilingdata_api_js_1.stsTokenUrl, headers, body });
        const res = await fetch(boilingdata_api_js_1.stsTokenUrl, { method, headers, body });
        const resBody = await res.json();
        this.logger.debug({ getStsToken: { body: resBody } });
        if (!resBody.ResponseCode || !resBody.ResponseText) {
            throw new Error("Malformed response from BD API");
        }
        if (resBody.ResponseCode != "00") {
            (0, spinner_util_js_1.spinnerError)(resBody.ResponseText);
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
        }
        else {
            this.bdStsToken = resBody.bdStsToken;
        }
        const resp = await this.getTokenResp(shareId);
        if (resp)
            return resp;
        throw new Error(`Failed to get fresh STS token from BD API (with share id ${shareId})`);
    }
}
exports.BDAccount = BDAccount;
