import jsYaml from "js-yaml";
import { updateNestedKeys } from "./yaml_utils.js";
import * as yaml from "js-yaml";
const ex1 = `
myProfile:
  target: local
  outputs:
    local:
      type: duckdb
      path: /tmp/data.duckdb
      extensions:
        - httpfs
        - parquet
      plugins:
        - module: boilingdata
          config:
            token: EXPIRED
            something: else2
            like:
              nested: keys
      threads: 4
`;
const ex2 = `
myProfile:
  target: local
  outputs:
    local:
      type: duckdb
      path: /tmp/data.duckdb
      extensions:
        - httpfs
        - parquet
      plugins:
        - module: boilingdata
      threads: 4
`;
const ex3 = `
myProfile:
  target: local
  outputs:
    local:
      type: duckdb
      path: /tmp/data.duckdb
      extensions:
        - httpfs
        - parquet
      plugins:
        - module: boilingdata
          plugins:
          - module: boilingdata
            plugins:
            - module: boilingdata
      threads: 4
myProfile2:
  target: local
  outputs:
    local:
      type: duckdb
      path: /tmp/data.duckdb
      extensions:
        - httpfs
        - parquet
      plugins:
        - module: boilingdata
          plugins:
          - module: boilingdata
            plugins:
            - module: boilingdata
      threads: 4
`;
describe("yaml-util", () => {
    it("can update single existing token", () => {
        const contents = jsYaml.load(ex1);
        updateNestedKeys(contents, { token: "VALID" });
        expect(yaml.dump(contents)).toMatchSnapshot();
    });
    it("can add token if it does not exist", () => {
        const contents = jsYaml.load(ex2);
        updateNestedKeys(contents, { token: "VALID" });
        expect(yaml.dump(contents)).toMatchSnapshot();
    });
    it("can add tokens, nested, multiple profiles", () => {
        const contents = jsYaml.load(ex3);
        updateNestedKeys(contents, { token: "VALID" });
        expect(yaml.dump(contents)).toMatchSnapshot();
    });
});
