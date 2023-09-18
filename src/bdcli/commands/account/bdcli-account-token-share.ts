import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken, validateTokenLifetime } from "../../utils/auth_util.js";
import cron from "cron-validate";
import { parseCronExpression } from "cron-schedule";
import { BDAccount } from "../../../integration/boilingdata/account.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";

const logger = getLogger("bdcli-account-token-share");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (options.lifetime) await validateTokenLifetime(options.lifetime);

    if (options.vendingSchedule) {
      const cronResult = (<(cronString: string, inputOptions?: any) => any>(<unknown>cron))(options.vendingSchedule, {
        preset: "npm-cron-schedule",
      });
      const isValid = cronResult.isValid();
      logger.debug({ isValid, cronResult });
      if (!isValid) {
        throw new Error(`Invalid token vending window cron expression: ${JSON.stringify(cronResult)}`);
      }
      logger.debug({ cronResultValue: cronResult.getValue() });
      const parsed = parseCronExpression(options.vendingSchedule);
      logger.debug({ nextDate: parsed.getNextDate(new Date()) });
    }

    const users = options.users.split(",");

    updateSpinnerText("Authenticating");
    const { idToken: token, cached: idCached, region } = await getIdToken(logger);
    updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
    spinnerSuccess();

    updateSpinnerText("Sharing token");
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    const bdAccount = new BDAccount({ logger, authToken: token });
    await bdAccount.shareToken(
      `${options.lifetime}` ?? "1h",
      options.vendingSchedule,
      users,
      options.name,
      options.sql,
    );
    spinnerSuccess();
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli account sts-token-share")
  .addOption(new cmd.Option("--users <boilingUsers>", "Comma separated list of Boiling users").makeOptionMandatory())
  .addOption(new cmd.Option("--name <shareName>", "Friendly name for the share").makeOptionMandatory())
  .addOption(
    new cmd.Option(
      "--sql <sql>",
      "Target user will have access to a named view of the results of this SQL.",
    ).makeOptionMandatory(),
  )
  .addOption(
    new cmd.Option(
      "--lifetime <lifetime>",
      "Token expiration lifetime, in string format. Defaults to '1h' (see https://github.com/vercel/ms)",
    ),
  )
  .addOption(
    new cmd.Option(
      "--vending-schedule <cronExpression>",
      "Cron start times, when the shared token can be vended. Defaults to '* * * * * *' (at any time)\n" +
        "\tPleases see https://www.npmjs.com/package/cron-schedule as format for the cron expression.\n" +
        "\tGiven as a cron expression with the accuracy of the <lifetime> parameter.\n" +
        "\tIf at any time the next cron runtime is in the range of current time + lifetime time range (default 1h),\n" +
        "\tthen token vending is allowed, otherwise not. This is checked at runtime when the token is requested\n" +
        "\tby the user to whom the token was shared to.",
    ),
  )
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
