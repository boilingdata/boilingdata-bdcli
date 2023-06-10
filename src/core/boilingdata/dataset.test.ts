import { getLogger } from "../../bdcli/utils/logger_util.js";
import { BDDataSetConfig } from "./dataset.js";

const logger = getLogger("data-set-config");

const exampleConfig = {
  datasets: [
    {
      name: "demo",
      type: "s3",
      bucket: "boilingdata-demo",
      permissions: ["read"],
      sessionStype: "sts",
    },
    {
      name: "demo2",
      bucket: "boilingdata-demo",
    },
    {
      name: "nyc",
      type: "s3",
      bucket: "isecurefi-dev-test",
      prefix: "nyc-tlc/trip_data/",
      permissions: ["read", "write"],
      sessionStype: "assume_role",
    },
  ],
};

describe("dataSetConfig - validate", () => {
  it("validates correct schema", () => {
    const dc = new BDDataSetConfig({ logger });
    expect(dc.isDataSetsConfig(exampleConfig)).toEqual(true);
  });
  it("gives false on invalid", () => {
    const dc = new BDDataSetConfig({ logger });
    expect(dc.isDataSetsConfig({ datasets: [{ name: "invalid" }] })).toEqual(false);
  });
  it("allow extra keys too", () => {
    const dc = new BDDataSetConfig({ logger });
    expect(dc.isDataSetsConfig({ datasets: [{ name: "invalid", bucket: "mybucket", extraKeyThatIsOk: 1 }] })).toEqual(
      true,
    );
  });
  it("check permissions values", () => {
    const dc = new BDDataSetConfig({ logger });
    expect(dc.isDataSetsConfig({ datasets: [{ name: "invalid", bucket: "mybucket", permissions: ["bad"] }] })).toEqual(
      false,
    );
  });
});
