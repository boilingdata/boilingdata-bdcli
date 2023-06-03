import * as util from "node:util";
import * as winston from "winston";

export type TLogLevel = "error" | "warn" | "info" | "debug";

export interface ILogger {
  setLogLevel: (level: TLogLevel) => void;
  error: (...args: any) => void;
  warn: (...args: any) => void;
  info: (...args: any) => void;
  debug: (...args: any) => void;
}

// closure
const addAppNameFormat = (service: string): winston.Logform.FormatWrap =>
  winston.format((info: any) => {
    info.service = service;
    return info;
  });

const logFormat = winston.format.printf((info: any) => {
  if (typeof info.message === "object") {
    info.message = util.inspect(info.message, { showHidden: false, depth: 20, colors: true, compact: false });
  }
  return info.message;
});

export function getLogger(service: string): ILogger {
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(addAppNameFormat(service)(), winston.format.json()),
    transports: [
      new winston.transports.File({ filename: "error.log", level: "error" }),
      new winston.transports.File({ filename: "combined.log" }),
    ],
  });
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(addAppNameFormat(service)(), winston.format.colorize(), logFormat),
    }),
  );
  return {
    error: logger.error.bind(logger),
    warn: logger.warn.bind(logger),
    info: logger.info.bind(logger),
    debug: logger.debug.bind(logger),
    setLogLevel: (level: TLogLevel) => (logger.level = level),
  };
}
