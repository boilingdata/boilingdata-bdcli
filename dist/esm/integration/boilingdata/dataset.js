import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import DataSetInterfaceTI from "./dataset.interface-ti.js"; // run "yarn prebuild" to generate this file
import { createCheckers } from "ts-interface-checker";
export class BDDataSourceConfig {
    params;
    logger;
    _dataSourcesConfig;
    constructor(params) {
        this.params = params;
        this.logger = this.params.logger;
    }
    isDataSetsConfig(dataSourcesConfig) {
        try {
            const { IDataSources } = createCheckers(DataSetInterfaceTI);
            IDataSources?.check(dataSourcesConfig);
            return true;
        }
        catch (err) {
            this.logger.error({ err });
            return false;
        }
    }
    hasValidUrlPrefixes(_dataSourcesConfig) {
        // TOOD: Validate URL prefixes.
        return true;
    }
    getDatasourcesConfig() {
        if (!this._dataSourcesConfig)
            throw new Error("Please read the configuration file first with readConfig()");
        return { ...this._dataSourcesConfig }; // make copy
    }
    withConfig(config) {
        if (!this.isDataSetsConfig(config))
            throw new Error("datasources config schema not validated");
        this._dataSourcesConfig = config;
    }
    async readConfig(filename) {
        if (this._dataSourcesConfig)
            return this._dataSourcesConfig;
        try {
            const dataSourcesConfig = yaml.load(await fs.readFile(filename, "utf8"));
            // all required keys and values?
            if (!this.isDataSetsConfig(dataSourcesConfig))
                throw new Error("datasources config schema not validated");
            // valid urlPrefixes?
            if (!this.hasValidUrlPrefixes(dataSourcesConfig)) {
                throw new Error("datasources config URL prefixes mismatch between policy and data sets");
            }
            this._dataSourcesConfig = dataSourcesConfig;
            this.logger.debug({ dataSourcesConfig: this._dataSourcesConfig });
            return this._dataSourcesConfig;
        }
        catch (err) {
            if (err?.code == "ENOENT") {
                throw new Error(`Configuration file does not exist ${filename}`);
            }
            throw err;
        }
    }
}
