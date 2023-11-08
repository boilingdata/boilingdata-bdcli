import * as id from "amazon-cognito-identity-js";
import { getConfigCredentials, updateConfig } from "./config_util.js";
import { Pool } from "../../integration/boilingdata/boilingdata_api.js";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import prompts from "prompts";
import qrcode from "qrcode";
import { resumeSpinner, spinnerInfo, stopSpinner } from "./spinner_util.js";
import ms from "ms";
const userPoolId = "eu-west-1_0GLV9KO1p"; // eu-west-1 preview
const clientId = "6timr8knllr4frovfvq8r2o6oo"; // eu-west-1 preview
export async function validateTokenLifetime(lifetime, logger) {
    const lifetimeInMs = ms(`${lifetime}`);
    logger?.debug({ lifetimeInMs });
    if (!lifetimeInMs || lifetimeInMs < ms("10min") || lifetimeInMs > ms("24h")) {
        throw new Error("Invalid token expiration time span, " +
            "please see https://github.com/vercel/ms for the format of the period. " +
            "Lifetime must be between 10min - 24h");
    }
}
export async function getEmail() {
    stopSpinner();
    const inp = await prompts({
        type: "text",
        name: "email",
        message: "Please give email",
        validate: (email) => `${email}`.length < 6 || !email.includes("@")
            ? `Email must be at least 6 characters long with @ character`
            : true,
    });
    if (!inp["email"] || inp["email"].length < 6) {
        throw new Error("Email must be at least 6 characters long with @ character");
    }
    resumeSpinner();
    return inp["email"];
}
export async function getPw(message) {
    stopSpinner();
    const inp = await prompts({
        type: "password",
        name: "pw",
        message,
        validate: (pw) => (`${pw}`.length < 12 ? `Must be at least 12 characters long with special characters` : true),
    });
    if (!inp["pw"] || inp["pw"].length < 12) {
        throw new Error("Password must be at least 12 characters long with special characters");
    }
    resumeSpinner();
    return inp["pw"];
}
async function getCognitoUser(_logger, Username) {
    if (!Username) {
        const creds = await getConfigCredentials();
        Username = creds.email;
    }
    const userData = { Username, Pool };
    const cognitoUser = new id.CognitoUser(userData);
    return cognitoUser;
}
async function getCognitoUserSession(logger) {
    const creds = await getConfigCredentials(logger);
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
export async function confirmEmailToBoilingData(confirm, logger) {
    logger?.debug({ status: "confirmEmailToBoilingData" });
    const cognitoUser = await getCognitoUser(logger);
    return new Promise((resolve, reject) => {
        cognitoUser.confirmRegistration(confirm, false, (err) => {
            if (err)
                return reject(err);
            resolve();
        });
    });
}
export async function registerToBoilingData(optsRegion, optsEnvironment, optsEmail, optsPassword, logger) {
    logger?.debug({ status: "registerToBoilingData" });
    const creds = await getConfigCredentials(logger);
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
        userPool.signUp(email, password, attributeList, [], (err, result) => {
            if (err)
                return reject(err);
            if (!result)
                return reject("No results");
            const cognitoUser = result.user;
            updateConfig({ credentials: { email, password, region, environment } });
            logger?.debug({ cognitoUserName: cognitoUser.getUsername() });
            resolve();
        });
    });
}
export async function updatePassword(_logger) {
    const cognitoUser = await getCognitoUserSession();
    const oldPassword = (await getConfigCredentials()).password;
    stopSpinner();
    const newPassword = await getPw("Please enter new password");
    if (!newPassword || newPassword?.length < 12)
        throw new Error("Invalid new password");
    resumeSpinner();
    return new Promise((resolve, reject) => {
        cognitoUser.changePassword(oldPassword, newPassword, (err, data) => {
            if (err)
                reject(err);
            resolve(data);
        });
    });
}
export async function recoverPassword(logger) {
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
                spinnerInfo(infoMsg);
                stopSpinner();
                const inp = await prompts({
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
                resumeSpinner();
                cognitoUser.confirmPassword(verificationCode, newPassword, {
                    async onSuccess(success) {
                        logger?.debug({ success });
                        await updateConfig({ credentials: { password: newPassword } });
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
export async function setupMfa(logger) {
    const cognitoUser = await getCognitoUserSession(logger);
    const mfaSettings = { PreferredMfa: true, Enabled: true };
    const Username = (await getConfigCredentials()).email;
    return new Promise((resolve, reject) => {
        cognitoUser.associateSoftwareToken({
            associateSecretCode: async function (secretCode) {
                stopSpinner();
                logger?.debug({ secretCode });
                const qrCode = await qrcode.toString(`otpauth://totp/BoilingData:${Username}?secret=${secretCode}&issuer=BoilingData`, {
                    type: "terminal",
                });
                console.log(qrCode);
                await prompts({
                    type: "text",
                    name: "resp",
                    message: `Please create new TOTP with this secret. All done? (yes/no)`,
                    validate: (resp) => (["yes", "no"].includes(`${resp}`) ? true : `yes/no`),
                });
                const code = await prompts({
                    type: "text",
                    name: "code",
                    message: `Please give code from the authenticator`,
                    validate: (code) => (`${code}`.length != 6 ? `Please give 6 digits` : true),
                });
                resumeSpinner();
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
// NOTE: "accesstoken" does not work, it has to be "idtoken".
export async function getIdToken(logger) {
    const creds = await getConfigCredentials(logger);
    const { email: Username, password: Password, idToken, region } = creds;
    // check if idToken is still valid..
    if (idToken) {
        const verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "id" });
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
        const userData = { Username, Pool };
        const cognitoUser = new id.CognitoUser(userData);
        const authenticationDetails = new id.AuthenticationDetails(loginDetails);
        cognitoUser.authenticateUser(authenticationDetails, {
            mfaSetup: (_challengeName, _challengeParameters) => setupMfa(logger),
            selectMFAType: async function (_challengeName, _challengeParameters) {
                stopSpinner();
                const inp = await prompts({
                    type: "text",
                    name: "mfatype",
                    message: "Please select the MFA method (sms_mfa, sw_mfa)",
                    validate: (mfatype) => ["sms_mfa", "sw_mfa"].includes(mfatype) ? true : `Please select: sms_mfa or sw_mfa (e.g. google auth.)`,
                });
                if (inp["mfatype"] !== "sms_mfa" && inp["mfatype"] !== "sw_mfa") {
                    throw new Error("Please select: sms_mfa or sw_mfa (e.g. google auth.)");
                }
                resumeSpinner();
                const mfaType = `${inp["mfatype"]}`.toLowerCase() == "sms_mfa" ? "SMS_MFA" : "SOFTWARE_TOKEN_MFA";
                cognitoUser.sendMFASelectionAnswer(mfaType, this);
            },
            totpRequired: async function (challengeName, challengeParameters) {
                logger?.debug({ challengeName, challengeParameters });
                stopSpinner();
                const inp = await prompts({
                    type: "text",
                    name: "mfa",
                    message: "Please enter MFA (totp)",
                    validate: (mfa) => (mfa.length == 6 && !isNaN(parseInt(mfa)) ? true : `Need 6 digits`),
                    format: (mfa) => parseInt(mfa),
                });
                if (!inp["mfa"] || isNaN(parseInt(inp["mfa"])))
                    throw new Error("Please give 6 digits");
                resumeSpinner();
                cognitoUser.sendMFACode(`${inp["mfa"]}`, this, "SOFTWARE_TOKEN_MFA");
            },
            mfaRequired: async function (challengeName, challengeParameters) {
                logger?.debug({ challengeName, challengeParameters });
                stopSpinner();
                const inp = await prompts({
                    type: "number",
                    name: "mfa",
                    message: "Please enter MFA (sms)",
                    validate: (mfa) => (mfa.length == 6 && !isNaN(parseInt(mfa)) ? true : `Need 6 digits`),
                    format: (mfa) => parseInt(mfa),
                });
                if (!inp["mfa"] || isNaN(parseInt(inp["mfa"])))
                    throw new Error("Please give 6 digits");
                resumeSpinner();
                cognitoUser.sendMFACode(`${inp["mfa"]}`, this);
            },
            newPasswordRequired: async function (userAttributes, requiredAttributes) {
                logger?.debug({ userAttributes, requiredAttributes });
                delete userAttributes.email_verified;
                const newPassword = await getPw("Please enter new password");
                cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, this);
            },
            onSuccess: async (session) => {
                const idToken = session.getIdToken().getJwtToken();
                const accessToken = session.getAccessToken().getJwtToken();
                const refreshToken = session.getRefreshToken()?.getToken();
                if (!idToken)
                    return reject("Could not fetch Cognito ID Token");
                updateConfig({ credentials: { idToken, accessToken, refreshToken } })
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
