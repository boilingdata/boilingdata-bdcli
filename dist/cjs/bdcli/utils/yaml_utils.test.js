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
const js_yaml_1 = __importDefault(require("js-yaml"));
const yaml_utils_js_1 = require("./yaml_utils.js");
const yaml = __importStar(require("js-yaml"));
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
        const contents = js_yaml_1.default.load(ex1);
        (0, yaml_utils_js_1.updateNestedKeys)(contents, { token: "VALID" });
        expect(yaml.dump(contents)).toMatchSnapshot();
    });
    it("can add token if it does not exist", () => {
        const contents = js_yaml_1.default.load(ex2);
        (0, yaml_utils_js_1.updateNestedKeys)(contents, { token: "VALID" });
        expect(yaml.dump(contents)).toMatchSnapshot();
    });
    it("can add tokens, nested, multiple profiles", () => {
        const contents = js_yaml_1.default.load(ex3);
        (0, yaml_utils_js_1.updateNestedKeys)(contents, { token: "VALID" });
        expect(yaml.dump(contents)).toMatchSnapshot();
    });
});
