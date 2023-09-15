import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { BDCONF, hasValidConfig, listConfigProfiles, updateConfig, profile } from "../../utils/config_util.js";
import prompts from "prompts";
import { getEmail } from "../../utils/auth_util.js";

const logger = getLogger("bdcli-account-config");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    logger.debug({ options: { ...options, password: options.password ? "**" : undefined } });

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
      if (options.password) {
        await updateConfig({ credentials: { password: options.password } });
        return spinnerSuccess("Password added to the config");
      }
      return spinnerSuccess(`Valid configuration already exists for "${profile}" profile`);
    }

    if (!options.email && !options.validate) {
      options.email = await getEmail();
    }

    if (!options.password && !options.noPassword && !options.validate) {
      const inp = await prompts({
        type: "password",
        name: "pw",
        message: "Please enter your password",
        validate: (pw: string) => (pw.length < 12 ? `Need at least 12 characters, including special` : true),
      });
      options.password = inp["pw"];
    }
    logger.debug({ options: { ...options, password: options.password ? "**" : undefined } });

    updateSpinnerText("Creating ~/.bdclirc");
    const { email, password, region } = options;
    if (!email) return spinnerError("No email found");
    await updateConfig({ credentials: { email, password, region } });
    spinnerSuccess();
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli account config")
  .addOption(new cmd.Option("--validate", "validate current config"))
  .addOption(new cmd.Option("--email <email>", "email address that works").conflicts("--validate"))
  .addOption(new cmd.Option("--password <password>", "suitably complex password"))
  .addOption(new cmd.Option("--no-password", "suitably complex password").conflicts("--password"))
  .addOption(new cmd.Option("--clear", "delete all session tokens (for opt. selected profile)"))
  .addOption(new cmd.Option("--region <awsRegion>", "Sign-in AWS region").default("eu-west-1"))
  .addOption(new cmd.Option("--list", `List all config profiles (see ${BDCONF})`))
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
