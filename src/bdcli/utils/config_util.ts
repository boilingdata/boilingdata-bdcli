import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import * as os from "os";

const configFile = `${os.homedir()}/.bdcli.yaml`;

export interface IConfig {
  credentials: {
    email?: string;
    password?: string;
  };
}

export async function updateConfig(updates: IConfig): Promise<void> {
  let config = {};
  try {
    await fs.statfs(configFile);
    config = <object>yaml.load(await fs.readFile(configFile, "utf8"));
  } catch (err: any) {
    if (err?.code != "ENOENT") throw err;
  }
  await fs.writeFile(configFile, yaml.dump({ ...config, ...updates }), {
    encoding: "utf8",
    flag: "w",
    mode: 0o600,
  });
}

export async function getConfig(): Promise<IConfig> {
  return <IConfig>yaml.load(await fs.readFile(configFile, "utf8"));
}

export async function getCredentials(): Promise<{ Username: string; Password: string }> {
  const { credentials } = await getConfig();
  const { email: Username, password: Password } = credentials;
  if (!Username || !Password) throw new Error("Could not get credentials");
  return { Username, Password };
}
