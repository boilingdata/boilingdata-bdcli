import { ILogger } from "../bdcli/utils/logger_util.js";
import { BDIamRole } from "./aws/iam_roles.js";
import { BDAccount } from "./boilingdata/config.js";
import { BDDataSetConfig } from "./boilingdata/dataset.js";

export interface IBDAccess {
  logger: ILogger;
  bdAccount: BDAccount;
  bdRole: BDIamRole;
  bdDataSets: BDDataSetConfig;
}

export class BDAccess {
  private logger: ILogger;
  private account: BDAccount;
  private role: BDIamRole;
  private datasets: BDDataSetConfig;

  constructor(private params: IBDAccess) {
    this.logger = this.params.logger;
    this.account = this.params.bdAccount;
    this.role = this.params.bdRole;
    this.datasets = this.params.bdDataSets;
    // this.logger.debug({ account: this.account, role: this.role, datasets: this.datasets });
  }

  public async check(): Promise<object> {
    return {};
  }
}
