import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { UserPoolId } from "../boilingdata/boilingdata_api.js";
import { Signer } from "@aws-amplify/core";
async function getAwsCredentials(jwtIdToken, region) {
    const IdentityPoolId = "eu-west-1:bce21571-e3a6-47a4-8032-fd015213405f";
    // const poolData = { UserPoolId, ClientId: "6timr8knllr4frovfvq8r2o6oo" };
    // const Pool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    const Logins = `cognito-idp.${region}.amazonaws.com/${UserPoolId}`;
    const cognitoidentity = new CognitoIdentityClient({
        credentials: fromCognitoIdentityPool({
            client: new CognitoIdentityClient(),
            identityPoolId: IdentityPoolId,
            logins: {
                [Logins]: jwtIdToken,
            },
        }),
    });
    return cognitoidentity.config.credentials();
}
export async function getSignedWssUrl(_logger, token, region) {
    const creds = await getAwsCredentials(token, region);
    const url = "wss://4rpyi2ae3f.execute-api.eu-west-1.amazonaws.com/prodbd";
    const signedWsUrl = Signer.signUrl(url, {
        access_key: creds.accessKeyId,
        secret_key: creds.secretAccessKey,
        session_token: creds.sessionToken,
    });
    return signedWsUrl;
}
