import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import DataSetInterfaceTI from "./dataset.interface-ti.js"; // run "yarn prebuild" to generate this file
import { ILogger } from "../../bdcli/utils/logger_util.js";
import { IDataSources } from "./dataset.interface.js";
import { createCheckers } from "ts-interface-checker";

export interface IBDDataSourceConfig {
  logger: ILogger;
}

export class BDDataSourceConfig {
  private logger: ILogger;
  private _dataSourcesConfig?: IDataSources;

  constructor(private params: IBDDataSourceConfig) {
    this.logger = this.params.logger;
  }

  public isDataSetsConfig(dataSourcesConfig: unknown): dataSourcesConfig is IDataSources {
    try {
      const { IDataSources } = createCheckers(DataSetInterfaceTI);
      IDataSources?.check(dataSourcesConfig);
      return true;
    } catch (err) {
      this.logger.error({ err });
      return false;
    }
  }

  public hasValidUrlPrefixes(_dataSourcesConfig: IDataSources): boolean {
    // TOOD: Validate URL prefixes.
    return true;
  }

  public getDatasourcesConfig(): IDataSources {
    if (!this._dataSourcesConfig) throw new Error("Please read the configuration file first with readConfig()");
    return { ...this._dataSourcesConfig }; // make copy
  }

  public async readConfig(filename: string): Promise<IDataSources> {
    if (this._dataSourcesConfig) return this._dataSourcesConfig;
    try {
      const dataSourcesConfig = <object>yaml.load(await fs.readFile(filename, "utf8"));
      // all required keys and values?
      if (!this.isDataSetsConfig(dataSourcesConfig)) throw new Error("datasources config schema not validated");
      // valid urlPrefixes?
      if (!this.hasValidUrlPrefixes(dataSourcesConfig)) {
        throw new Error("datasources config URL prefixes mismatch between policy and data sets");
      }

      this._dataSourcesConfig = dataSourcesConfig;
      this.logger.debug({ dataSourcesConfig: this._dataSourcesConfig });
      return this._dataSourcesConfig;
    } catch (err: any) {
      if (err?.code == "ENOENT") {
        throw new Error(`Configuration file does not exist ${filename}`);
      }
      throw err;
    }
  }
}
