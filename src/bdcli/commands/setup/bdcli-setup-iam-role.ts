import * as iam from "@aws-sdk/client-iam";
import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { BDIamRole } from "../../../core/aws/iam_roles.js";
import { BDAccount } from "../../../core/boilingdata/config.js";
import { BDDataSetConfig } from "../../../core/boilingdata/dataset.js";

const logger = getLogger("bdcli-setup-iam-role");

async function iamrole(options: any, _command: cmd.Command): Promise<void> {
  try {
    logger.debug({ options });

    updateSpinnerText("Authenticating");
    const token = await getIdToken();
    spinnerSuccess();

    updateSpinnerText(`Creating IAM Role "${options?.name}"`);
    const region = options.region ?? process.env["AWS_REGION"];
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    const bdconf = new BDAccount({ logger, authToken: token });
    const role = new BDIamRole({
      ...options,
      logger,
      iamClient: new iam.IAMClient({ region }),
      datasets: new BDDataSetConfig({ logger }).readConfig(options.config),
      assumeAwsAccount: bdconf.getAssumeAwsAccount(),
      assumeCondExternalId: bdconf.getExtId(),
    });
    await role.createRoleIfNotExists();
    spinnerSuccess();

    updateSpinnerText(`Registering IAM Role "${options?.name}"`);
    await bdconf.setIamRole();
    spinnerSuccess();
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli setup iam-role")
  .addOption(new cmd.Option("-c, --config <filepath>", "IAM Role conf").makeOptionMandatory())
  .addOption(new cmd.Option("-r, --region <region>", "AWS region"))
  .action(async (options, command) => await iamrole(options, command));

addGlobalOptions(program, logger);

(async () => await program.parseAsync(process.argv))();
