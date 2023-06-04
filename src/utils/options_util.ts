import * as cmd from "commander";
import { ILogger, TLogLevel } from "./logger_util.js";
import { disableSpinner } from "./spinner_util.js";

export function addGlobalOptions(program: cmd.Command, logger: ILogger): void {
  program
    .addOption(new cmd.Option("-d, --debug", "more logging"))
    .addOption(new cmd.Option("-V, --version", "show version"))
    .addOption(new cmd.Option("--disable-spinner", "disable in-progress spinner status messages"))
    .addOption(new cmd.Option("--log-level <level>", "log level").choices(["debug", "info", "warn", "error"]))
    .on("option:log-level", (level: TLogLevel) => logger.setLogLevel(level))
    .on("option:debug", () => logger.setLogLevel("debug"))
    .on("option:disable-spinner", () => disableSpinner());
}
