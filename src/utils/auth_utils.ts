import * as id from "amazon-cognito-identity-js";

const UserPoolId = "eu-west-1_0GLV9KO1p";
const poolData = { UserPoolId, ClientId: "6timr8knllr4frovfvq8r2o6oo" };
const Pool = new id.CognitoUserPool(poolData);

const Username = process.env["BD_USERNAME"] ?? "";
const Password = process.env["BD_PASSWORD"] ?? "";
const apiKey = "Ak7itOEG1N1I7XpFfmYO97NWHRZwEYDmYBL4y0lb";
const jwToken =
  "eyJraWQiOiJOM29DXC9ta21Cb0VERGpINnlJUk1NUnBUZDlNbnpCK3VMb09PcVdWdWpIWT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIyMTM0NmJmMi02YzMxLTRjYWYtOGU3ZS05ODMyMjA1ZmZkZWUiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS13ZXN0LTEuYW1hem9uYXdzLmNvbVwvZXUtd2VzdC0xXzBHTFY5S08xcCIsImNvZ25pdG86dXNlcm5hbWUiOiIyMTM0NmJmMi02YzMxLTRjYWYtOGU3ZS05ODMyMjA1ZmZkZWUiLCJvcmlnaW5fanRpIjoiMTAwODM2ZWEtMjM3Ni00NzRiLThkNjEtODFlYWEwY2YyNmUzIiwiYXVkIjoiNnRpbXI4a25sbHI0ZnJvdmZ2cThyMm82b28iLCJldmVudF9pZCI6IjFkMjc2OTM2LWFhMTctNGRhNS1iNGY3LTIyNzY4ZmY3NDBmZCIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNjg1NjgwMjgyLCJleHAiOjE2ODU2ODM4ODIsImlhdCI6MTY4NTY4MDI4MiwianRpIjoiY2Y5MGEzYTAtZDA2Yi00ZjUwLTg5NDAtM2E4NzFlOGU1YjA5IiwiZW1haWwiOiJkZW1vQGJvaWxpbmdkYXRhLmNvbSJ9.Lg4MICCimun7avfSzOZJAbZsvN2F4kvkz9-IUil40SLpWG-_2xzUa50_PbhtAlWt-oSa3PJ0n3n5pmRn2U_knN7tUPqCUEIn-0t4Uzzhib0RBlmyvR9zyAriCuXNysJMA0zrJqfdFV8pr59HO1vRkuENXaAlZW8k8zKX4-uVu8M4F2TQ3TL2XK1CXbMZSMJUZqLz1L7jt2X0vBWYjeqZfDu0fs2PCMHByP69luxUx1l0RK9KkxtAQfzT7p0_FQKBc_zcm2IPHvl1SIETBBJfjJKM3VJx6B3fb8IODtx8uCK391Me_mhOTCueQtKgWdU5s-1xP0B9PiojnYJ_yzPEwQ";

export function getApiKey(): Promise<string> {
  return Promise.resolve(apiKey);
}

// NOTE: "accesstoken" does not work, it has to be "idtoken".
// TODO: Cache the id token to home folder
export function getIdToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (jwToken) return jwToken;
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
