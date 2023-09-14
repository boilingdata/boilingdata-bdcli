import deepmerge from "deepmerge";
import * as fs from "fs/promises";
import * as yaml from "js-yaml";
export function updateNestedKeys(obj, newKeyValue, siblingToFind = "module", siblingValue = "boilingdata", keyToUpdate = "config") {
    if (typeof obj !== "object")
        return;
    // We find object with "siblingToFind": "siblingValue" and deepmerge keyToUpdate with newKeyValue
    if (Object.keys(obj).includes(siblingToFind) && obj[siblingToFind] == siblingValue) {
        obj[keyToUpdate] = deepmerge(obj[keyToUpdate] ?? {}, newKeyValue);
    }
    Object.keys(obj).forEach(k => updateNestedKeys(obj[k], newKeyValue, siblingToFind, siblingValue, keyToUpdate));
}
export async function updateBoilingToken(filePath, newKeyValue, keyToUpdate = "config", siblingToFind = "module", siblingValue = "boilingdata") {
    const fileContents = await fs.readFile(filePath, "utf-8");
    const yamlObject = yaml.load(fileContents);
    updateNestedKeys(yamlObject, newKeyValue, siblingToFind, siblingValue, keyToUpdate);
    const updatedYaml = yaml.dump(yamlObject);
    await fs.writeFile(filePath, updatedYaml, "utf-8");
}
