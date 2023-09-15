import * as yaml from "js-yaml";
import * as fs from "fs";
import path from "path";
import { ELogLevel, getLogger } from "../../bdcli/utils/logger_util.js";
import { BDDataSourceConfig } from "./dataset.js";
const logger = getLogger("data-set-config");
logger.setLogLevel(ELogLevel.DEBUG);
const exampleConfigValid = yaml.load(fs.readFileSync(path.join(__dirname, "fixtures/datasources_valid.test.yaml")).toString());
const exampleConfigExtraKeys = yaml.load(fs.readFileSync(path.join(__dirname, "fixtures/datasources_extra.test.yaml")).toString());
const exampleConfigBadValues = yaml.load(fs.readFileSync(path.join(__dirname, "fixtures/datasources_bad.test.yaml")).toString());
describe("dataSetConfig - validate", () => {
    it("validates correct schema", () => {
        const dc = new BDDataSourceConfig({ logger });
        expect(dc.isDataSetsConfig(exampleConfigValid)).toEqual(true);
    });
    it("gives false on invalid", () => {
        const dc = new BDDataSourceConfig({ logger });
        expect(dc.isDataSetsConfig({ datasets: [{ name: "invalid" }] })).toEqual(false);
    });
    it("allow extra keys too", () => {
        const dc = new BDDataSourceConfig({ logger });
        expect(dc.isDataSetsConfig(exampleConfigExtraKeys)).toEqual(true);
    });
    it("check permissions values", () => {
        const dc = new BDDataSourceConfig({ logger });
        expect(dc.isDataSetsConfig(exampleConfigBadValues)).toEqual(false);
    });
});
