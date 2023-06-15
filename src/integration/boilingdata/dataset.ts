import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import DataSetInterfaceTI from "./dataset.interface-ti.js"; // run "yarn prebuild" to generate this file
import { ILogger } from "../../bdcli/utils/logger_util.js";
import { IDataSources } from "./dataset.interface.js";
import { createCheckers } from "ts-interface-checker";

export interface IBDDataSetConfig {
  logger: ILogger;
}

export class BDDataSetConfig {
  private logger: ILogger;
  private _dataSourcesConfig?: IDataSources;

  constructor(private params: IBDDataSetConfig) {
    this.logger = this.params.logger;
  }

  public async getUniqueNamePart(): Promise<string> {
    if (!this._dataSourcesConfig) throw new Error("Set datasources config first");
    const uniqName = this._dataSourcesConfig.dataSources
      .map(src => src.dataSets.map(dataset => dataset.url))
      .flat()
      .join("-");
    this.logger.debug({ uniqName });
    return uniqName;
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

  public async readConfig(filename: string): Promise<IDataSources> {
    if (this._dataSourcesConfig) return this._dataSourcesConfig;
    const dataSourcesConfig = <object>yaml.load(await fs.readFile(filename, "utf8"));
    this.logger.debug({ dataSourcesConfig });
    // all required keys?
    if (!this.isDataSetsConfig(dataSourcesConfig)) throw new Error("datasources config schema not validated");
    // valid enum types?

    this._dataSourcesConfig = dataSourcesConfig;
    return this._dataSourcesConfig;
  }

  public get dataSetConfig(): IDataSources {
    if (!this._dataSourcesConfig) throw new Error("datasets config file not read yet, please call readConfig()");
    return this._dataSourcesConfig;
  }
}
