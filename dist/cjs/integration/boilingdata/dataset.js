"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BDDataSourceConfig = void 0;
const fs = __importStar(require("fs/promises"));
const yaml = __importStar(require("js-yaml"));
const dataset_interface_ti_js_1 = __importDefault(require("./dataset.interface-ti.js")); // run "yarn prebuild" to generate this file
const ts_interface_checker_1 = require("ts-interface-checker");
class BDDataSourceConfig {
    params;
    logger;
    _dataSourcesConfig;
    constructor(params) {
        this.params = params;
        this.logger = this.params.logger;
    }
    isDataSetsConfig(dataSourcesConfig) {
        try {
            const { IDataSources } = (0, ts_interface_checker_1.createCheckers)(dataset_interface_ti_js_1.default);
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
exports.BDDataSourceConfig = BDDataSourceConfig;
