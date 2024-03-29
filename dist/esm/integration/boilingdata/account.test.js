import { getIdToken } from "../../bdcli/utils/auth_util.js";
import { ELogLevel, getLogger } from "../../bdcli/utils/logger_util.js";
import { BDAccount } from "./account.js";
// NOTE: 2023-06 These do not seem to work.. :(
// import { MockAgent, setGlobalDispatcher } from "undici";
// const mockAgent = new MockAgent();
// const mockPool = mockAgent.get(baseApiUrl);
// setGlobalDispatcher(mockAgent);
const logger = getLogger("data-set-config");
logger.setLogLevel(ELogLevel.DEBUG);
describe("bdAccount", () => {
    it("unauthorized", async () => {
        const authToken = "dummyToken";
        const account = new BDAccount({ logger, authToken });
        expect(account.getExtId()).rejects.toThrowError();
    });
    it.skip("can get account details", async () => {
        const authToken = await getIdToken();
        const account = new BDAccount({ logger, authToken: authToken.idToken });
        expect(account.getExtId()).resolves.toHaveLength(44);
    });
    it.skip("can get aws account id", async () => {
        const authToken = await getIdToken();
        const account = new BDAccount({ logger, authToken: authToken.idToken });
        expect(account.getAssumeAwsAccount()).resolves.toHaveLength(12);
    });
});
