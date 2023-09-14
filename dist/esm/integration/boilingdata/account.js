import { getCredentials, updateConfig } from "../../bdcli/utils/config_util.js";
import { accountUrl, getReqHeaders, tokenUrl } from "./boilingdata_api.js";
import * as jwt from "jsonwebtoken";
export class BDAccount {
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
    async _getAccountDetails() {
        if (this.accountDetails)
            return;
        // channel("undici:request:create").subscribe(console.log);
        const res = await fetch(accountUrl, { method: "GET", headers: await getReqHeaders(this.cognitoIdToken) });
        const body = await res.json();
        this.logger.debug({ getAccountDetails: { body } });
        if (!body.ResponseCode || !body.ResponseText) {
            throw new Error("Malformed response from BD API Response");
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
    async getStsToken() {
        if (this.bdStsToken)
            return { bdStsToken: this.bdStsToken, cached: true };
        this.bdStsToken = (await getCredentials()).bdStsToken;
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
        const headers = await getReqHeaders(this.cognitoIdToken);
        this.logger.debug({ tokenUrl, headers });
        const res = await fetch(tokenUrl, { method: "GET", headers });
        const body = await res.json();
        this.logger.debug({ getStsToken: { body } });
        if (!body.ResponseCode || !body.ResponseText) {
            throw new Error("Malformed response from BD API Response");
        }
        if (!body.bdStsToken) {
            throw new Error("Missing bdStsToken from BD API Response");
        }
        this.bdStsToken = body.bdStsToken;
        this.decodeToken();
        this.dumpToken();
        if (!this.decodedToken)
            throw new Error("Unable to decode token");
        const exp = this.decodedToken["payload"].exp;
        if (exp && this.checkExp(exp)) {
            this.logger.debug({ cachedBdStstToken: true });
            await updateConfig({ credentials: { bdStsToken: this.bdStsToken } }); // local cache
            return { bdStsToken: this.bdStsToken, cached: false };
        }
        throw new Error("Failed to get fresh token");
    }
}