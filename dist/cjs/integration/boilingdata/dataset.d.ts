import { ILogger } from "../../bdcli/utils/logger_util.js";
import { IDataSources } from "./dataset.interface.js";
export interface IBDDataSourceConfig {
    logger: ILogger;
}
export declare class BDDataSourceConfig {
    private params;
    private logger;
    private _dataSourcesConfig?;
    constructor(params: IBDDataSourceConfig);
    getUniqueNamePart(): Promise<string>;
    isDataSetsConfig(dataSourcesConfig: unknown): dataSourcesConfig is IDataSources;
    hasValidUrlPrefixes(_dataSourcesConfig: IDataSources): boolean;
    getDatasourcesConfig(): IDataSources;
    readConfig(filename: string): Promise<IDataSources>;
}
