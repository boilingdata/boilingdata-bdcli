import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import DataSetInterfaceTI from "./dataset.interface-ti.js"; // run "yarn prebuild" to generate this file
import { ILogger } from "../../bdcli/utils/logger_util.js";
import { EDataSetType, EPermission, IDataSets } from "./dataset.interface.js";
import { createCheckers } from "ts-interface-checker";

export interface IBDDataSetConfig {
  logger: ILogger;
}

export class BDDataSetConfig {
  private logger: ILogger;

  constructor(private params: IBDDataSetConfig) {
    this.logger = this.params.logger;
  }

  public async getUniqueNamePart(): Promise<string> {
    return "";
  }

  public isDataSetsConfig(dataSetConfig: unknown): dataSetConfig is IDataSets {
    try {
      const { IDataSets } = createCheckers(DataSetInterfaceTI);
      IDataSets?.check(dataSetConfig);
      return true;
    } catch (err) {
      return false;
    }
  }

  public async readConfig(filename: string): Promise<IDataSets> {
    const dataSetConfig = <object>yaml.load(await fs.readFile(filename, "utf8"));
    this.logger.debug({ dataSetConfig });
    if (!this.isDataSetsConfig(dataSetConfig)) throw new Error("datasets config not validated");
    return {
      datasets: dataSetConfig.datasets.map(dataset => ({
        ...dataset,
        type: dataset.type ?? EDataSetType.S3,
        permissions: dataset.permissions ?? [EPermission.READ],
      })),
    };
  }
}
