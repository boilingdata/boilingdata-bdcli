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
exports.getIdToken = exports.setupMfa = exports.recoverPassword = exports.updatePassword = exports.registerToBoilingData = exports.getPw = void 0;
const id = __importStar(require("amazon-cognito-identity-js"));
const config_util_js_1 = require("./config_util.js");
const boilingdata_api_js_1 = require("../../integration/boilingdata/boilingdata_api.js");
const aws_jwt_verify_1 = require("aws-jwt-verify");
const prompts_1 = __importDefault(require("prompts"));
const qrcode_1 = __importDefault(require("qrcode"));
const spinner_util_js_1 = require("./spinner_util.js");
const userPoolId = "eu-west-1_0GLV9KO1p"; // eu-west-1 preview
const clientId = "6timr8knllr4frovfvq8r2o6oo"; // eu-west-1 preview
async function getPw(message) {
    (0, spinner_util_js_1.stopSpinner)();
    const inp = await (0, prompts_1.default)({
        type: "password",
        name: "pw",
        message,
        validate: (pw) => (`${pw}`.length < 12 ? `Must be at least 12 characters long with special characters` : true),
    });
    (0, spinner_util_js_1.resumeSpinner)();
    return inp["pw"];
}
exports.getPw = getPw;
async function getCognitoUser(_logger, Username) {
    if (!Username) {
        const creds = await (0, config_util_js_1.getCredentials)();
        Username = creds.email;
    }
    const userData = { Username, Pool: boilingdata_api_js_1.Pool };
    const cognitoUser = new id.CognitoUser(userData);
    return cognitoUser;
}
async function getCognitoUserSession(logger) {
    const creds = await (0, config_util_js_1.getCredentials)(logger);
    const { email: Username, idToken: IdToken, accessToken: AccessToken, refreshToken: RefreshToken } = creds;
    if (!IdToken || !AccessToken || !RefreshToken)
        throw new Error("Missing tokens, please log in first");
    const session = new id.CognitoUserSession({
        IdToken: new id.CognitoIdToken({ IdToken }),
        AccessToken: new id.CognitoAccessToken({ AccessToken }),
        RefreshToken: new id.CognitoRefreshToken({ RefreshToken }),
    });
    const cognitoUser = await getCognitoUser(logger, Username);
    cognitoUser.setSignInUserSession(session);
    logger?.debug({ status: "Cognito user session created" });
    return cognitoUser;
}
async function registerToBoilingData(optsRegion, optsEnvironment, optsEmail, optsPassword, logger) {
    logger?.debug({ status: "registerToBoilingData" });
    const creds = await (0, config_util_js_1.getCredentials)(logger);
    let { email, password, region, environment } = creds;
    // TODO: Add support for multiple profiles, i.e. BoilingData users.
    if (optsEmail && email && optsEmail.trim().localeCompare(email.trim()) != 0) {
        throw new Error("Config file email and provided email option differ");
    }
    if (optsRegion && region && optsRegion.trim().localeCompare(region.trim()) != 0) {
        throw new Error("Config file region and provided region option differ");
    }
    if (optsEnvironment && environment && optsEnvironment.trim().localeCompare(environment.trim()) != 0) {
        throw new Error("Config file environment and provided environment option differ");
    }
    region = region ?? optsRegion; // config overrides as opts have default value always
    email = optsEmail ?? email; // option overrides
    password = optsPassword ?? password; // option overrides
    environment = environment ?? optsEnvironment;
    if (!password)
        password = await getPw("Please enter password");
    logger?.debug({ region, email, environment });
    const attributeList = [];
    const dataEmail = { Name: "email", Value: email };
    attributeList.push(new id.CognitoUserAttribute(dataEmail));
    // const dataPhoneNumber = { Name: "phone_number", Value: "+15555555555" };
    // attributeList.push(new id.CognitoUserAttribute(dataPhoneNumber));
    const userPool = new id.CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId });
    return new Promise((resolve, reject) => {
        userPool.signUp(email, "", attributeList, [], (err, result) => {
            if (err)
                return reject(err);
            if (!result)
                return reject("No results");
            const cognitoUser = result.user;
            (0, config_util_js_1.updateConfig)({ credentials: { email, password, region, environment } });
            logger?.debug({ cognitoUserName: cognitoUser.getUsername() });
            resolve();
        });
    });
}
exports.registerToBoilingData = registerToBoilingData;
async function updatePassword(_logger) {
    const cognitoUser = await getCognitoUserSession();
    const oldPassword = (await (0, config_util_js_1.getCredentials)()).password;
    (0, spinner_util_js_1.stopSpinner)();
    const newPassword = await getPw("Please enter new password");
    if (!newPassword || newPassword?.length < 12)
        throw new Error("Invalid new password");
    (0, spinner_util_js_1.resumeSpinner)();
    return new Promise((resolve, reject) => {
        cognitoUser.changePassword(oldPassword, newPassword, (err, data) => {
            if (err)
                reject(err);
            resolve(data);
        });
    });
}
exports.updatePassword = updatePassword;
async function recoverPassword(logger) {
    const cognitoUser = await getCognitoUser(logger);
    return new Promise((resolve, reject) => {
        cognitoUser.forgotPassword({
            onSuccess: (data) => {
                logger?.debug({ status: "forgotPassword.onSuccess" });
                logger?.debug({ data });
                resolve(data);
            },
            onFailure: (err) => {
                logger?.debug({ status: "forgotPassword.onFailure" });
                logger?.debug({ err });
                reject(err.message);
            },
            inputVerificationCode: async (data) => {
                logger?.debug({ status: "forgotPassword.inputVerificationCode" });
                logger?.debug({ data });
                const infoMsg = `Code sent to ${data?.CodeDeliveryDetails?.Destination} (${data?.CodeDeliveryDetails?.DeliveryMedium})`;
                (0, spinner_util_js_1.spinnerInfo)(infoMsg);
                (0, spinner_util_js_1.stopSpinner)();
                const inp = await (0, prompts_1.default)({
                    type: "text",
                    name: "code",
                    message: `Please enter the received recovery code`,
                    validate: (code) => (code.length != 6 ? `Code must be 6 digits` : true),
                });
                const verificationCode = inp["code"];
                if (!verificationCode || verificationCode?.length < 6) {
                    throw new Error("Invalid recovery code, must be at least 6 chars");
                }
                const newPassword = await getPw("Please enter new password");
                if (!newPassword || newPassword.length < 12)
                    throw new Error("Invalid new password");
                (0, spinner_util_js_1.resumeSpinner)();
                cognitoUser.confirmPassword(verificationCode, newPassword, {
                    async onSuccess(success) {
                        logger?.debug({ success });
                        await (0, config_util_js_1.updateConfig)({ credentials: { password: newPassword } });
                        resolve(success);
                    },
                    onFailure(err) {
                        logger?.debug({ err });
                        reject(err.message);
                    },
                });
            },
        });
    });
}
exports.recoverPassword = recoverPassword;
async function setupMfa(logger) {
    const cognitoUser = await getCognitoUserSession(logger);
    const mfaSettings = { PreferredMfa: true, Enabled: true };
    const Username = (await (0, config_util_js_1.getCredentials)()).email;
    return new Promise((resolve, reject) => {
        cognitoUser.associateSoftwareToken({
            associateSecretCode: async function (secretCode) {
                (0, spinner_util_js_1.stopSpinner)();
                logger?.debug({ secretCode });
                const qrCode = await qrcode_1.default.toString(`otpauth://totp/BoilingData:${Username}?secret=${secretCode}&issuer=BoilingData`, {
                    type: "terminal",
                });
                console.log(qrCode);
                await (0, prompts_1.default)({
                    type: "text",
                    name: "resp",
                    message: `Please create new TOTP with this secret. All done? (yes/no)`,
                    validate: (resp) => (["yes", "no"].includes(`${resp}`) ? true : `yes/no`),
                });
                const code = await (0, prompts_1.default)({
                    type: "text",
                    name: "code",
                    message: `Please give code from the authenticator`,
                    validate: (code) => (`${code}`.length != 6 ? `Please give 6 digits` : true),
                });
                (0, spinner_util_js_1.resumeSpinner)();
                cognitoUser.verifySoftwareToken(`${code["code"]}`, "Authenticator", {
                    onFailure: function (err) {
                        logger?.debug({ verifySoftwareToken: err });
                        reject(err);
                    },
                    onSuccess: function (err) {
                        if (err) {
                            logger?.debug({ onSuccessError: err }); // what?
                            reject(err);
                        }
                        logger?.debug({ status: "Setting up user MFA preference" });
                        cognitoUser.setUserMfaPreference(null, mfaSettings, function (err, result) {
                            if (err) {
                                logger?.debug({ setUserMfaPreferenceError: err });
                                reject(err);
                            }
                            logger?.debug({ setUserMfaPreferenceResult: result });
                            resolve();
                        });
                    },
                });
            },
            onFailure: function (err) {
                reject(err);
            },
        });
    });
}
exports.setupMfa = setupMfa;
// NOTE: "accesstoken" does not work, it has to be "idtoken".
async function getIdToken(logger) {
    const creds = await (0, config_util_js_1.getCredentials)(logger);
    const { email: Username, password: Password, idToken, region } = creds;
    // check if idToken is still valid..
    if (idToken) {
        const verifier = aws_jwt_verify_1.CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "id" });
        try {
            const idTokenPayload = await verifier.verify(idToken);
            logger?.debug({ idTokenPayload });
            return { idToken, cached: true, region: region ?? "eu-west-1" };
        }
        catch (err) {
            // bypass
        }
    }
    return new Promise((resolve, reject) => {
        const loginDetails = { Username, Password };
        const userData = { Username, Pool: boilingdata_api_js_1.Pool };
        const cognitoUser = new id.CognitoUser(userData);
        const authenticationDetails = new id.AuthenticationDetails(loginDetails);
        cognitoUser.authenticateUser(authenticationDetails, {
            mfaSetup: (_challengeName, _challengeParameters) => setupMfa(logger),
            selectMFAType: async function (_challengeName, _challengeParameters) {
                (0, spinner_util_js_1.stopSpinner)();
                const inp = await (0, prompts_1.default)({
                    type: "text",
                    name: "mfatype",
                    message: "Please select the MFA method (sms_mfa, sw_mfa)",
                    validate: (mfatype) => ["sms_mfa", "sw_mfa"].includes(mfatype) ? true : `Please select: sms_mfa or sw_mfa (e.g. google auth.)`,
                });
                (0, spinner_util_js_1.resumeSpinner)();
                const mfaType = `${inp["mfatype"]}`.toLowerCase() == "sms_mfa" ? "SMS_MFA" : "SOFTWARE_TOKEN_MFA";
                cognitoUser.sendMFASelectionAnswer(mfaType, this);
            },
            totpRequired: async function (challengeName, challengeParameters) {
                logger?.debug({ challengeName, challengeParameters });
                (0, spinner_util_js_1.stopSpinner)();
                const inp = await (0, prompts_1.default)({
                    type: "text",
                    name: "mfa",
                    message: "Please enter MFA",
                    validate: (mfa) => (mfa.length == 6 && !isNaN(parseInt(mfa)) ? true : `Need 6 digits`),
                    format: (mfa) => parseInt(mfa),
                });
                (0, spinner_util_js_1.resumeSpinner)();
                cognitoUser.sendMFACode(`${inp["mfa"]}`, this, "SOFTWARE_TOKEN_MFA");
            },
            mfaRequired: async function (challengeName, challengeParameters) {
                logger?.debug({ challengeName, challengeParameters });
                (0, spinner_util_js_1.stopSpinner)();
                const inp = await (0, prompts_1.default)({
                    type: "number",
                    name: "mfa",
                    message: "Please enter MFA",
                    validate: (mfa) => (`${mfa}`.length == 6 ? `Need 6 digits` : true),
                });
                (0, spinner_util_js_1.resumeSpinner)();
                cognitoUser.sendMFACode(`${inp["mfa"]}`, this);
            },
            newPasswordRequired: async function (userAttributes, requiredAttributes) {
                logger?.debug({ userAttributes, requiredAttributes });
                delete userAttributes.email_verified;
                (0, spinner_util_js_1.stopSpinner)();
                const newPassword = await getPw("Please enter new password");
                (0, spinner_util_js_1.resumeSpinner)();
                cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, this);
            },
            onSuccess: async (session) => {
                const idToken = session.getIdToken().getJwtToken();
                const accessToken = session.getAccessToken().getJwtToken();
                const refreshToken = session.getRefreshToken()?.getToken();
                if (!idToken)
                    return reject("Could not fetch Cognito ID Token");
                (0, config_util_js_1.updateConfig)({ credentials: { idToken, accessToken, refreshToken } })
                    .then(() => resolve({ idToken, cached: false, region: region ?? "eu-west-1" }))
                    .catch(err => reject(err));
            },
            onFailure: (err) => {
                logger?.debug({ err });
                reject(err);
            },
        });
    });
}
exports.getIdToken = getIdToken;
