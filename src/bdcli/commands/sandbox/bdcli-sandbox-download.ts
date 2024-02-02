import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { combineOptsWithSettings, hasValidConfig, profile } from "../../utils/config_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { BDSandbox } from "../../../integration/boilingdata/sandbox.js";
import * as fs from "fs/promises";

const logger = getLogger("bdcli-sandbox-validate");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);
    const filename = options.name + ".yaml";

    if (!(await hasValidConfig())) {
      return spinnerError(`No valid bdcli configuration found for "${profile}" profile`);
    }

    let fileAlreadyExists = false;
    try {
      if (await fs.lstat(filename)) {
        fileAlreadyExists = true;
      }
    } catch (err) {
      logger.debug({ err });
    }
    if (fileAlreadyExists) {
      spinnerError(`Local file ${filename} already exists`);
    }

    updateSpinnerText("Authenticating");
    const { idToken: token, cached: idCached } = await getIdToken(logger);
    updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
    spinnerSuccess();

    updateSpinnerText(`Downloading sandbox IaC template of ${options.name}`);
    const bdSandbox = new BDSandbox({ logger, authToken: token });
    const template = await bdSandbox.downloadTemplate(options.name, options.version, options?.status ?? "uploaded");
    await fs.writeFile(filename, template);
    spinnerSuccess();
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli sandbox download")
  .addOption(new cmd.Option("--name <templateName>", "template name from listing").makeOptionMandatory())
  .addOption(new cmd.Option("--status <status>", "Download 'uploaded' (default) or 'deployed' template"))
  .addOption(new cmd.Option("--version <version>", "Download specific version from listing"))
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
