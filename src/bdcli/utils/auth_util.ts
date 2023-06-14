import * as id from "amazon-cognito-identity-js";
import { getCredentials } from "./config_util.js";
import { Pool } from "../../core/boilingdata/boilingdata_api.js";

// NOTE: "accesstoken" does not work, it has to be "idtoken".
// TODO: Cache the id token to home folder
export async function getIdToken(): Promise<string> {
  const { Username, Password } = await getCredentials();
  return new Promise((resolve, reject) => {
    //if (jwtToken != undefined) resolve(jwtToken);
    const loginDetails = { Username, Password };
    const userData = { Username, Pool };
    const cognitoUser = new id.CognitoUser(userData);
    const authenticationDetails = new id.AuthenticationDetails(loginDetails);
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result: any) => resolve(result?.getIdToken().getJwtToken()),
      onFailure: (err: any) => reject(err),
    });
  });
}
