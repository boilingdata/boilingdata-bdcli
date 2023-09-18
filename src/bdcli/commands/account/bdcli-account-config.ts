import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import {
  BDCONF,
  hasValidConfig,
  listConfigProfiles,
  updateConfig,
  profile,
  combineOptsWithSettings,
} from "../../utils/config_util.js";
import prompts from "prompts";
import { getEmail } from "../../utils/auth_util.js";

const logger = getLogger("bdcli-account-config");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (options.list) {
      updateSpinnerText(`Listing profiles in ${BDCONF}`);
      const list = await listConfigProfiles(logger);
      spinnerSuccess();
      console.log(JSON.stringify(list));
      return;
    }

    if (options.clear) {
      updateSpinnerText(`Deleting session tokens from ${BDCONF}`);
      await updateConfig({
        credentials: {
          bdStsToken: undefined,
          idToken: undefined,
          accessToken: undefined,
          refreshToken: undefined,
          sharedTokens: undefined,
        },
      });
      spinnerSuccess();
      return;
    }

    if (await hasValidConfig()) {
      if (options.password && !options.validate) {
        await updateConfig({ credentials: { password: options.password } });
        return spinnerSuccess("Password added to the config");
      }
      return spinnerSuccess(`Valid configuration already exists for "${profile}" profile`);
    } else {
      if (options.validate) {
        return spinnerError(`No valid configuration found for "${profile}" profile`);
      }
    }

    if (!options.email && !options.validate) {
      options.email = await getEmail();
    }

    if (!options.password && !options.nopw && !options.validate) {
      const inp = await prompts({
        type: "password",
        name: "pw",
        message: "Please enter your password",
        validate: (pw: string) => (pw.length < 12 ? `Need at least 12 characters, including special` : true),
      });
      options.password = inp["pw"];
    }
    logger.debug({ options: { ...options, password: options.password ? "**" : undefined } });

    updateSpinnerText(`Creating ${BDCONF}`);
    const { email, password, region } = options;
    if (!email) {
      return spinnerError("No email found, did you forget to set profile with BD_PROFILE env or --profile option?");
    }
    await updateConfig({ credentials: { email, password, region } });
    spinnerSuccess();
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli account config")
  .addOption(new cmd.Option("--validate", "validate current config").conflicts("--clear").conflicts("--list"))
  .addOption(new cmd.Option("--email <email>", "email address that works").conflicts("--validate"))
  .addOption(new cmd.Option("--password <password>", "suitably complex password to be set into config"))
  .addOption(new cmd.Option("--nopw", "do not store password into config").conflicts("--password"))
  .addOption(new cmd.Option("--clear", "delete all session tokens (for opt. selected profile)"))
  .addOption(new cmd.Option("--region <awsRegion>", "Sign-in AWS region").default("eu-west-1"))
  .addOption(new cmd.Option("--list", `List all config profiles (see ${BDCONF})`))
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
