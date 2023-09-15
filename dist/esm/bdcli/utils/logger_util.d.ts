export declare enum ELogLevel {
    "ERROR" = "error",
    "WARN" = "warn",
    "INFO" = "info",
    "DEBUG" = "debug"
}
export interface ILogger {
    setLogLevel: (level: ELogLevel) => void;
    error: (...args: any) => void;
    warn: (...args: any) => void;
    info: (...args: any) => void;
    debug: (...args: any) => void;
}
export declare function getLogger(service: string): ILogger;
