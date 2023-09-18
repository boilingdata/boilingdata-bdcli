import * as cmd from "commander";
import { ILogger, ELogLevel } from "./logger_util.js";
import { disableSpinner } from "./spinner_util.js";
import { BDCONF, setProfile } from "./config_util.js";

export async function addGlobalOptions(program: cmd.Command, logger: ILogger): Promise<void> {
  program
    .addOption(new cmd.Option("-d, --debug", "set debug logging level"))
    .addOption(new cmd.Option("--log-level <level>", "log level").choices(["debug", "info", "warn", "error"]))
    .addOption(new cmd.Option("-V, --version", "show version"))
    .addOption(new cmd.Option("--disable-spinner", "disable in-progress spinner status messages"))
    .addOption(
      new cmd.Option(
        "--profile <profile>",
        `select config file profile to use (optional in ${BDCONF} and overrides BD_PROFILE env)`,
      ),
    )
    .on("option:profile", (profileName: string) => setProfile(profileName))
    .on("option:log-level", (level: ELogLevel) => logger.setLogLevel(level))
    .on("option:debug", () => logger.setLogLevel(ELogLevel.DEBUG))
    .on("option:disable-spinner", () => disableSpinner());
}
