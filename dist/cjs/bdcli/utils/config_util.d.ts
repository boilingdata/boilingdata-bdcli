import { ILogger } from "./logger_util.js";
export interface ICredentials {
    email?: string;
    password?: string;
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    bdStsToken?: string;
    region?: string;
    mfa?: boolean;
    environment?: string;
}
export interface IConfig {
    credentials: ICredentials;
}
export declare function hasValidConfig(): Promise<boolean>;
export declare function updateConfig(updates: IConfig): Promise<void>;
export declare function getConfig(): Promise<IConfig>;
export declare function getCredentials(logger?: ILogger): Promise<ICredentials & Required<Pick<ICredentials, "email" | "password">>>;
