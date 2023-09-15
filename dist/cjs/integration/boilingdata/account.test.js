"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_util_js_1 = require("../../bdcli/utils/auth_util.js");
const logger_util_js_1 = require("../../bdcli/utils/logger_util.js");
const account_js_1 = require("./account.js");
// NOTE: 2023-06 These do not seem to work.. :(
// import { MockAgent, setGlobalDispatcher } from "undici";
// const mockAgent = new MockAgent();
// const mockPool = mockAgent.get(baseApiUrl);
// setGlobalDispatcher(mockAgent);
const logger = (0, logger_util_js_1.getLogger)("data-set-config");
logger.setLogLevel(logger_util_js_1.ELogLevel.DEBUG);
describe("bdAccount", () => {
    it("unauthorized", async () => {
        const authToken = "dummyToken";
        const account = new account_js_1.BDAccount({ logger, authToken });
        expect(account.getExtId()).rejects.toThrowError();
    });
    it.skip("can get account details", async () => {
        const authToken = await (0, auth_util_js_1.getIdToken)();
        const account = new account_js_1.BDAccount({ logger, authToken: authToken.idToken });
        expect(account.getExtId()).resolves.toHaveLength(44);
    });
    it.skip("can get aws account id", async () => {
        const authToken = await (0, auth_util_js_1.getIdToken)();
        const account = new account_js_1.BDAccount({ logger, authToken: authToken.idToken });
        expect(account.getAssumeAwsAccount()).resolves.toHaveLength(12);
    });
});
