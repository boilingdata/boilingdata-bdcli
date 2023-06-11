import { ILogger } from "../bdcli/utils/logger_util.js";
import { BDIamRole } from "./aws/iam_roles.js";
import { BDAccount } from "./boilingdata/config.js";
import { BDDataSetConfig } from "./boilingdata/dataset.js";

export interface IBDIntegration {
  logger: ILogger;
  bdAccount: BDAccount;
  bdRole: BDIamRole;
  bdDataSets: BDDataSetConfig;
}

export class BDIntegration {
  private logger: ILogger;
  private account: BDAccount;
  private role: BDIamRole;
  private datasets: BDDataSetConfig;

  constructor(private params: IBDIntegration) {
    this.logger = this.params.logger;
    this.account = this.params.bdAccount;
    this.role = this.params.bdRole;
    this.datasets = this.params.bdDataSets;
    this.logger.debug({ account: this.account, role: this.role, datasets: this.datasets });
  }

  public getPolicyDocument(): string {
    return JSON.stringify({});
  }
}
