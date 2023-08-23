import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { hasValidConfig, updateConfig } from "../../utils/config_util.js";
import prompts from "prompts";
import * as EmailValidator from "email-validator";

const logger = getLogger("bdcli-account-create-config");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    logger.debug({ options: { ...options, password: options.password ? "**" : undefined } });

    if (options.clear) {
      updateSpinnerText("Deleting session tokens from ~/.bdclirc");
      await updateConfig({
        credentials: { bdStsToken: undefined, idToken: undefined, accessToken: undefined, refreshToken: undefined },
      });
      spinnerSuccess();
      return;
    }

    if (await hasValidConfig()) return spinnerSuccess("Valid config file already exists");

    if (!options.email) {
      const inp = await prompts({
        type: "text",
        name: "email",
        message: "Please enter your email",
        validate: (email: string) => (EmailValidator.validate(email) ? true : "Invalid email address"),
      });
      options.email = inp["email"];
    }
    if (!options.password) {
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
    if (!email || !password) return spinnerError("No email or password found");
    await updateConfig({ credentials: { email, password, region } });
    spinnerSuccess();
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli account create-config")
  .addOption(new cmd.Option("--email <email>", "email address that works"))
  .addOption(new cmd.Option("--password <password>", "suitably complex password"))
  .addOption(new cmd.Option("--clear", "delete all session tokens"))
  .addOption(new cmd.Option("--region <awsRegion>", "Sign-in AWS region").default("eu-west-1"))
  .action(async (options, command) => await show(options, command));

addGlobalOptions(program, logger);

(async () => await program.parseAsync(process.argv))();
