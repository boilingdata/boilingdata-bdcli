import deepmerge from "deepmerge";
import * as fs from "fs/promises";
import * as yaml from "js-yaml";

export function updateNestedKeys(
  obj: any,
  newKeyValue: object,
  siblingToFind = "module",
  siblingValue = "boilingdata",
  keyToUpdate = "config",
): any {
  if (typeof obj !== "object") return;
  // We find object with "siblingToFind": "siblingValue" and deepmerge keyToUpdate with newKeyValue
  if (Object.keys(obj).includes(siblingToFind) && obj[siblingToFind] == siblingValue) {
    obj[keyToUpdate] = deepmerge(obj[keyToUpdate] ?? {}, newKeyValue);
  }
  Object.keys(obj).forEach(k => updateNestedKeys(obj[k], newKeyValue, siblingToFind, siblingValue, keyToUpdate));
}

export async function updateBoilingToken(
  filePath: string,
  newKeyValue: object,
  keyToUpdate = "config",
  siblingToFind = "module",
  siblingValue = "boilingdata",
): Promise<void> {
  const fileContents = await fs.readFile(filePath, "utf-8");
  const yamlObject = yaml.load(fileContents);
  updateNestedKeys(yamlObject, newKeyValue, siblingToFind, siblingValue, keyToUpdate);
  const updatedYaml = yaml.dump(yamlObject);
  await fs.writeFile(filePath, updatedYaml, "utf-8");
}
