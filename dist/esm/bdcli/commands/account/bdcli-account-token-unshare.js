import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import ms from "ms";
import cron from "cron-validate";
import { parseCronExpression } from "cron-schedule";
import { BDAccount } from "../../../integration/boilingdata/account.js";
const logger = getLogger("bdcli-account-token-unshare");
async function show(options, _command) {
    try {
        logger.debug({ options });
        if (options.expires) {
            const lifetimeInMs = ms(`${options.expires}`);
            logger.debug({ lifetimeInMs });
            if (!lifetimeInMs || lifetimeInMs < 60000) {
                throw new Error("Invalid token expiration time span, please see https://github.com/vercel/ms for the format of the period");
            }
        }
        if (options.vendingWindow) {
            const cronResult = cron(options.vendingWindow, {
                preset: "npm-cron-schedule",
            });
            const isValid = cronResult.isValid();
            logger.debug({ isValid, cronResult });
            if (!isValid) {
                throw new Error(`Invalid token vending window cron expression: ${JSON.stringify(cronResult)}`);
            }
            logger.debug({ cronResultValue: cronResult.getValue() });
            const parsed = parseCronExpression(options.vendingWindow);
            logger.debug({ nextDate: parsed.getNextDate(new Date()) });
        }
        const users = options.users.split(",");
        updateSpinnerText("Authenticating");
        const { idToken: token, cached: idCached, region } = await getIdToken(logger);
        updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
        spinnerSuccess();
        updateSpinnerText("Unsharing token");
        if (!region)
            throw new Error("Pass --region parameter or set AWS_REGION env");
        const bdAccount = new BDAccount({ logger, authToken: token });
        await bdAccount.unshareToken(users);
        spinnerSuccess();
    }
    catch (err) {
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli account token-unshare")
    .addOption(new cmd.Option("--users <boilingUsers>", "Comma separated list of Boiling users").makeOptionMandatory())
    .action(async (options, command) => await show(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
