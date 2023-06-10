import * as cmd from "commander";
import { ILogger, ELogLevel } from "./logger_util.js";
import { disableSpinner } from "./spinner_util.js";

export function addGlobalOptions(program: cmd.Command, logger: ILogger): void {
  program
    .addOption(new cmd.Option("-d, --debug", "set debug logging level"))
    .addOption(new cmd.Option("--log-level <level>", "log level").choices(["debug", "info", "warn", "error"]))
    .addOption(new cmd.Option("-V, --version", "show version"))
    .addOption(new cmd.Option("--disable-spinner", "disable in-progress spinner status messages"))
    .on("option:log-level", (level: ELogLevel) => logger.setLogLevel(level))
    .on("option:debug", () => logger.setLogLevel(ELogLevel.DEBUG))
    .on("option:disable-spinner", () => disableSpinner());
}
