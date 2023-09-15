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
exports.getReqHeaders = exports.getApiKey = exports.apiKey = exports.Pool = exports.poolData = exports.UserPoolId = exports.bdAWSAccount = exports.tokenShareUrl = exports.tokenUrl = exports.accountUrl = exports.dataSetsUrl = exports.sharePath = exports.tokenPath = exports.accountPath = exports.dataSetsPath = exports.baseApiUrl = void 0;
const id = __importStar(require("amazon-cognito-identity-js"));
// FIXME: switch to prod as default
exports.baseApiUrl = "https://rest.api.test.boilingdata.com";
exports.dataSetsPath = "/data-sets";
exports.accountPath = "/account";
exports.tokenPath = "/token";
exports.sharePath = "/share";
exports.dataSetsUrl = exports.baseApiUrl + exports.dataSetsPath;
exports.accountUrl = exports.baseApiUrl + exports.accountPath;
exports.tokenUrl = exports.baseApiUrl + exports.tokenPath;
exports.tokenShareUrl = exports.baseApiUrl + exports.sharePath;
// FIXME: get from bdAccount API
exports.bdAWSAccount = "589434896614";
exports.UserPoolId = "eu-west-1_0GLV9KO1p";
exports.poolData = { UserPoolId: exports.UserPoolId, ClientId: "6timr8knllr4frovfvq8r2o6oo" };
exports.Pool = new id.CognitoUserPool(exports.poolData);
// FIXME: Make org specific
exports.apiKey = "Ak7itOEG1N1I7XpFfmYO97NWHRZwEYDmYBL4y0lb";
function getApiKey() {
    return Promise.resolve(exports.apiKey); // FIXME: Get API key..
}
exports.getApiKey = getApiKey;
async function getReqHeaders(token) {
    const apikey = await getApiKey();
    return {
        Authorization: token,
        "x-api-key": apikey,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}
exports.getReqHeaders = getReqHeaders;
