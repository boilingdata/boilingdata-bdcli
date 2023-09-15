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
exports.updateBoilingToken = exports.updateNestedKeys = void 0;
const deepmerge_1 = __importDefault(require("deepmerge"));
const fs = __importStar(require("fs/promises"));
const yaml = __importStar(require("js-yaml"));
function updateNestedKeys(obj, newKeyValue, siblingToFind = "module", siblingValue = "boilingdata", keyToUpdate = "config") {
    if (typeof obj !== "object")
        return;
    // We find object with "siblingToFind": "siblingValue" and deepmerge keyToUpdate with newKeyValue
    if (Object.keys(obj).includes(siblingToFind) && obj[siblingToFind] == siblingValue) {
        obj[keyToUpdate] = (0, deepmerge_1.default)(obj[keyToUpdate] ?? {}, newKeyValue);
    }
    Object.keys(obj).forEach(k => updateNestedKeys(obj[k], newKeyValue, siblingToFind, siblingValue, keyToUpdate));
}
exports.updateNestedKeys = updateNestedKeys;
async function updateBoilingToken(filePath, newKeyValue, keyToUpdate = "config", siblingToFind = "module", siblingValue = "boilingdata") {
    const fileContents = await fs.readFile(filePath, "utf-8");
    const yamlObject = yaml.load(fileContents);
    updateNestedKeys(yamlObject, newKeyValue, siblingToFind, siblingValue, keyToUpdate);
    const updatedYaml = yaml.dump(yamlObject);
    await fs.writeFile(filePath, updatedYaml, "utf-8");
}
exports.updateBoilingToken = updateBoilingToken;
