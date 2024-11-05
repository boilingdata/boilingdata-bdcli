"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSignedWssUrl = getSignedWssUrl;
const client_cognito_identity_1 = require("@aws-sdk/client-cognito-identity");
const credential_provider_cognito_identity_1 = require("@aws-sdk/credential-provider-cognito-identity");
const boilingdata_api_js_1 = require("../boilingdata/boilingdata_api.js");
const core_1 = require("@aws-amplify/core");
async function getAwsCredentials(jwtIdToken, region) {
    const IdentityPoolId = "eu-west-1:bce21571-e3a6-47a4-8032-fd015213405f";
    // const poolData = { UserPoolId, ClientId: "6timr8knllr4frovfvq8r2o6oo" };
    // const Pool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    const Logins = `cognito-idp.${region}.amazonaws.com/${boilingdata_api_js_1.UserPoolId}`;
    const cognitoidentity = new client_cognito_identity_1.CognitoIdentityClient({
        credentials: (0, credential_provider_cognito_identity_1.fromCognitoIdentityPool)({
            client: new client_cognito_identity_1.CognitoIdentityClient(),
            identityPoolId: IdentityPoolId,
            logins: {
                [Logins]: jwtIdToken,
            },
        }),
    });
    return cognitoidentity.config.credentials();
}
async function getSignedWssUrl(_logger, token, region) {
    const creds = await getAwsCredentials(token, region);
    const url = "wss://4rpyi2ae3f.execute-api.eu-west-1.amazonaws.com/prodbd";
    const signedWsUrl = core_1.Signer.signUrl(url, {
        access_key: creds.accessKeyId,
        secret_key: creds.secretAccessKey,
        session_token: creds.sessionToken,
    });
    return signedWsUrl;
}
