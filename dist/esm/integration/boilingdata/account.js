import { getConfigCredentials, updateConfig } from "../../bdcli/utils/config_util.js";
import { accountUrl, getReqHeaders, tokenShareUrl, tokenUrl } from "./boilingdata_api.js";
import * as jwt from "jsonwebtoken";
export class BDAccount {
    params;
    cognitoIdToken;
    bdStsToken;
    sharedTokens;
    selectedToken;
    decodedToken;
    logger;
    accountDetails;
    constructor(params) {
        this.params = params;
        this.logger = this.params.logger;
        // this.logger.debug(this.params);
        this.cognitoIdToken = this.params.authToken;
        this.sharedTokens = new Map();
    }
    async setIamRoleWithPayload(IamRoleArn, payload) {
        // channel("undici:request:create").subscribe(console.log);
        const body = JSON.stringify({ IamRoleArn, ...payload });
        this.logger.debug({ body });
        const res = await fetch(accountUrl + "/iamrole", {
            method: "PUT",
            headers: await getReqHeaders(this.cognitoIdToken),
            body,
        });
        const respBody = await res.json();
        this.logger.info("\n" + JSON.stringify(respBody));
        if (res.status != 200 && res.status != 201) {
            this.logger.error({ status: res.status, statusText: res.statusText, respBody });
            throw new Error(`Failed to configure IAM Role (${IamRoleArn}) into BoilingData - ${res.status} ${res.statusText}: ${respBody?.ResponseText}; ${respBody?.RequestId}`);
        }
    }
    serialiseTokensMap() {
        // TODO: Store all response elements, so that token freshness can be locally checked
        const entries = [...this.sharedTokens.entries()];
        return entries.map(([id, token]) => `${id}:${token}`);
    }
    unserialiseTokensMap(tokens) {
        this.sharedTokens = new Map();
        tokens.map(t => {
            const [id, token] = t.split(":");
            if (!token || !id)
                throw new Error("Local shared token cache corrupted in the config");
            this.sharedTokens.set(id, token);
        });
    }
    async _getAccountDetails() {
        if (this.accountDetails)
            return;
        // channel("undici:request:create").subscribe(console.log);
        const res = await fetch(accountUrl, { method: "GET", headers: await getReqHeaders(this.cognitoIdToken) });
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
    selectAndDecodeToken(shareId) {
        if (shareId) {
            if (!this.sharedTokens.has(shareId))
                throw new Error(`No token with share id ${shareId}`);
            const bdStsToken = this.sharedTokens.get(shareId);
            this.decodedToken = jwt.decode(bdStsToken, { complete: true });
            this.logger.debug({ decodedToken: this.decodedToken });
            this.selectedToken = bdStsToken;
            const aud = this.decodedToken?.["payload"]?.aud; // audience
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
            throw new Error(`Could not find token (share id ${shareId})`);
    }
    dumpSelectedToken() {
        if (!this.selectedToken)
            throw new Error("No selected BD STS token");
        this.logger.debug({ bdStsToken: this.selectedToken, decodedToken: this.decodedToken });
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
        const headers = await getReqHeaders(this.cognitoIdToken);
        this.logger.debug({ tokenShareUrl, headers });
        const res = await fetch(tokenShareUrl, { method: "GET", headers });
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
        const headers = await getReqHeaders(this.cognitoIdToken);
        const putBody = JSON.stringify({ users, vendingSchedule, tokenLifetime, shareName, shareSql });
        this.logger.debug({ tokenShareUrl, headers, body: putBody });
        const res = await fetch(tokenShareUrl, { method: "PUT", headers, body: putBody });
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
        const headers = await getReqHeaders(this.cognitoIdToken);
        const putBody = JSON.stringify({ shareId });
        this.logger.debug({ tokenShareUrl, headers, body: putBody });
        const res = await fetch(tokenShareUrl, { method: "DELETE", headers, body: putBody });
        const resBody = await res.json();
        this.logger.debug({ unshareToken: { body: resBody } });
        if (!resBody.ResponseCode || !resBody.ResponseText) {
            throw new Error("Malformed response from BD API");
        }
        if (resBody.ResponseCode == "00" && resBody.ResponseText == "OK")
            return;
        throw new Error("Failed to unshare token");
    }
    async getToken(tokenLifetime, shareId) {
        if (this.bdStsToken && !shareId) {
            this.selectedToken = this.bdStsToken;
            return { bdStsToken: this.bdStsToken, cached: true };
        }
        const creds = await getConfigCredentials();
        this.bdStsToken = creds.bdStsToken;
        if (creds.sharedTokens)
            this.unserialiseTokensMap(creds.sharedTokens);
        try {
            this.selectAndDecodeToken(shareId);
            this.dumpSelectedToken();
            if (!this.decodedToken || !this.selectedToken)
                throw new Error("Unable to select/decode token");
            const exp = this.decodedToken["payload"].exp;
            if (exp && this.checkExp(exp)) {
                this.logger.debug({ cachedBdStstToken: true });
                return { bdStsToken: this.selectedToken, cached: true };
            }
        }
        catch (err) {
            this.logger.debug({ bdStsTokenError: err });
        }
        this.logger.debug({ bdStsTokenCached: this.bdStsToken });
        this.logger.debug({ status: "need fresh token" });
        // channel("undici:request:create").subscribe(console.log);
        // channel("undici:request:headers").subscribe(console.log);
        const headers = await getReqHeaders(this.cognitoIdToken); // , { tokenLifetime, vendingSchedule, shareId });
        let method = "GET";
        let body = undefined;
        if (shareId) {
            method = "POST";
            body = JSON.stringify({ tokenLifetime, shareId });
        }
        this.logger.debug({ method, tokenUrl, headers, body });
        const res = await fetch(tokenUrl, { method, headers, body });
        const resBody = await res.json();
        this.logger.debug({ getStsToken: { body: resBody } });
        if (!resBody.ResponseCode || !resBody.ResponseText) {
            throw new Error("Malformed response from BD API");
        }
        if (!resBody.bdStsToken) {
            throw new Error("Missing bdStsToken in BD API Response");
        }
        if (shareId) {
            this.sharedTokens.set(shareId, resBody);
        }
        else {
            this.bdStsToken = resBody.bdStsToken;
        }
        this.selectAndDecodeToken(shareId);
        this.dumpSelectedToken();
        if (!this.decodedToken || !this.selectedToken) {
            throw new Error("Unable to select/decode token after fetch from API");
        }
        const exp = this.decodedToken["payload"].exp;
        if (exp && this.checkExp(exp)) {
            this.logger.debug({ cachedBdStstToken: true });
            const credentials = shareId ? { sharedTokens: this.serialiseTokensMap() } : { bdStsToken: this.selectedToken };
            await updateConfig({ credentials }); // local cache
            return { ...resBody, bdStsToken: this.selectedToken, cached: false };
        }
        throw new Error(`Failed to get fresh token from BD API (with share id ${shareId})`);
    }
}
