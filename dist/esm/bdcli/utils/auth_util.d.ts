import { ILogger } from "./logger_util.js";
export declare function validateTokenLifetime(lifetime: string, logger?: ILogger): Promise<void>;
export declare function getEmail(): Promise<string>;
export declare function getPw(message: string): Promise<string>;
export declare function confirmEmailToBoilingData(confirm: string, logger: ILogger): Promise<void>;
export declare function registerToBoilingData(optsRegion: string, optsEnvironment: string, optsEmail?: string, optsPassword?: string, logger?: ILogger): Promise<void>;
export declare function updatePassword(_logger?: ILogger): Promise<void>;
export declare function recoverPassword(logger?: ILogger): Promise<any>;
export declare function setupMfa(logger?: ILogger): Promise<void>;
export declare function getIdToken(logger?: ILogger): Promise<{
    idToken: string;
    cached: boolean;
    region: string;
}>;
