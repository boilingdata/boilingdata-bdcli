import * as cmd from "commander";
import { ELogLevel } from "./logger_util.js";
import { disableSpinner } from "./spinner_util.js";
import { BDCONF, setProfile } from "./config_util.js";
export async function addGlobalOptions(program, logger) {
    program
        .addOption(new cmd.Option("-d, --debug", "set debug logging level"))
        .addOption(new cmd.Option("--log-level <level>", "log level").choices(["debug", "info", "warn", "error"]))
        .addOption(new cmd.Option("-V, --version", "show version"))
        .addOption(new cmd.Option("--disable-spinner", "disable in-progress spinner status messages"))
        .addOption(new cmd.Option("--profile <profile>", `select config file profile to use (optional in ${BDCONF})`))
        .on("option:profile", (profileName) => setProfile(profileName))
        .on("option:log-level", (level) => logger.setLogLevel(level))
        .on("option:debug", () => logger.setLogLevel(ELogLevel.DEBUG))
        .on("option:disable-spinner", () => disableSpinner());
}
