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
const yaml = __importStar(require("js-yaml"));
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_util_js_1 = require("../../bdcli/utils/logger_util.js");
const dataset_js_1 = require("./dataset.js");
const logger = (0, logger_util_js_1.getLogger)("data-set-config");
logger.setLogLevel(logger_util_js_1.ELogLevel.DEBUG);
const exampleConfigValid = yaml.load(fs.readFileSync(path_1.default.join(__dirname, "fixtures/datasources_valid.test.yaml")).toString());
const exampleConfigExtraKeys = yaml.load(fs.readFileSync(path_1.default.join(__dirname, "fixtures/datasources_extra.test.yaml")).toString());
const exampleConfigBadValues = yaml.load(fs.readFileSync(path_1.default.join(__dirname, "fixtures/datasources_bad.test.yaml")).toString());
describe("dataSetConfig - validate", () => {
    it("validates correct schema", () => {
        const dc = new dataset_js_1.BDDataSourceConfig({ logger });
        expect(dc.isDataSetsConfig(exampleConfigValid)).toEqual(true);
    });
    it("gives false on invalid", () => {
        const dc = new dataset_js_1.BDDataSourceConfig({ logger });
        expect(dc.isDataSetsConfig({ datasets: [{ name: "invalid" }] })).toEqual(false);
    });
    it("allow extra keys too", () => {
        const dc = new dataset_js_1.BDDataSourceConfig({ logger });
        expect(dc.isDataSetsConfig(exampleConfigExtraKeys)).toEqual(true);
    });
    it("check permissions values", () => {
        const dc = new dataset_js_1.BDDataSourceConfig({ logger });
        expect(dc.isDataSetsConfig(exampleConfigBadValues)).toEqual(false);
    });
});
