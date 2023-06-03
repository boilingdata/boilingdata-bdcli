import * as cmd from "commander";
import { ILogger, TLogLevel } from "./logger_util.js";

export function addGlobalOptions(program: cmd.Command, logger: ILogger): void {
  program
    .addOption(new cmd.Option("-d, --debug", "more logging"))
    .addOption(new cmd.Option("-v, --version", "show version"))
    .addOption(new cmd.Option("--log-level <level>", "log level").choices(["debug", "info", "warn", "error"]))
    .on("option:log-level", (level: TLogLevel) => logger.setLogLevel(level))
    .on("option:debug", () => logger.setLogLevel("debug"));
}
