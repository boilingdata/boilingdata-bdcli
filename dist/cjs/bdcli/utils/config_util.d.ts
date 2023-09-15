import { ILogger } from "./logger_util.js";
export declare const BDCONF = "~/.bdcli.yaml";
export declare let profile: string;
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
export interface IConfigProfiles {
    [profile: string]: IConfig;
}
export interface IConfig {
    settings?: {
        [key: string]: string;
    };
    credentials: ICredentials;
}
export declare function hasValidConfig(logger?: ILogger): Promise<boolean>;
export declare function listConfigProfiles(logger?: ILogger): Promise<string[]>;
export declare function updateConfig(updates: IConfig, logger?: ILogger): Promise<void>;
export declare function setProfile(profileName: string, logger?: ILogger): void;
export declare function getConfig(logger?: ILogger): Promise<IConfig | undefined>;
export declare function getConfigSettings(logger?: ILogger): Promise<{
    [key: string]: string;
}>;
export declare function combineOptsWithSettings(opts: any, logger?: ILogger): Promise<{
    [key: string]: string;
}>;
export declare function getConfigCredentials(logger?: ILogger): Promise<ICredentials & Required<Pick<ICredentials, "email" | "password">>>;
