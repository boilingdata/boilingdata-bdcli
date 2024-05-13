import { FunctionConfiguration, LambdaClient } from "@aws-sdk/client-lambda";
import { ILogger } from "../bdcli/utils/logger_util.js";
import { BDAccount } from "./boilingdata/account.js";
import { STSClient } from "@aws-sdk/client-sts";
import { getAllLambdaFunctions } from "./aws/lambda.js";

export interface ILambdaLayerOpts {
  prefix: string; // Lambda Function name prefix
}

export interface IBoilingLambdaFunctions {
  logger: ILogger;
  lambdaClient: LambdaClient;
  bdAccount?: BDAccount;
  stsClient?: STSClient;
}

export class BoilingLambdaFunctions {
  private logger: ILogger;
  private lambda: LambdaClient;
  // private bdAccount: BDAccount;
  // private stsClient: STSClient;
  private allLambdas: FunctionConfiguration[] = [];
  private boilingLambdas: string[] = [];
  private boilingLambdasCachedPrefix = "";

  constructor(private params: IBoilingLambdaFunctions) {
    this.logger = this.params.logger;
    this.logger.debug(params);
    this.lambda = this.params.lambdaClient;
    // this.bdAccount = this.params.bdAccount;
    // this.stsClient = this.params.stsClient;
  }

  private async populateLambdaFunctionsCache(prefix: string): Promise<void> {
    this.logger.debug(prefix);
    if (
      (this.boilingLambdasCachedPrefix === "" || this.boilingLambdasCachedPrefix != prefix) &&
      Array.isArray(this.allLambdas) &&
      this.allLambdas.length <= 0
    ) {
      this.allLambdas = await getAllLambdaFunctions(this.lambda, this.logger);
    }
    this.boilingLambdas = <string[]>this.allLambdas
      .filter(f => f.FunctionName?.startsWith(prefix))
      .map(f => f.FunctionName)
      .filter(f => !!f);
    this.boilingLambdasCachedPrefix = prefix;
    this.logger.debug(this.boilingLambdas);
  }

  public async removeLambdaLayers(opts: ILambdaLayerOpts): Promise<void> {
    await this.populateLambdaFunctionsCache(opts.prefix);
  }

  public async upgradeLambdaLayers(opts: ILambdaLayerOpts): Promise<void> {
    await this.populateLambdaFunctionsCache(opts.prefix);
  }

  public async denyCWLogging(opts: ILambdaLayerOpts): Promise<void> {
    this.logger.debug(opts);
  }

  public async removeCWLogs(opts: ILambdaLayerOpts): Promise<void> {
    await this.populateLambdaFunctionsCache(opts.prefix);
  }
}
