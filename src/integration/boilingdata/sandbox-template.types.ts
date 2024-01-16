export enum EModelFormat {
  NDJSON = "ndjson",
  AVRO = "avro",
  CSV = "csv",
}
export enum EPermission {
  READ = "read",
  WRITE = "write",
}

export interface ITemplateSandbox {
  name: string;
  urlPrefix: string;
  uniqNamePart?: string;
  permissions: EPermission[];
}

export interface ITemplateTap {
  name: string;
  models?: Array<{
    name: string;
    model?: string[];
    format?: EModelFormat;
  }>;
}

export interface ITemplateFlow {
  name: string;
  input: string | string[];
  keys?: string[];
  transformJs?: string;
  transformSql?: string;
  prefixFunc?: string;
  output?: string | string[];
  errors?: string;
}

export interface ITemplateShare {
  name: string;
  users: string[];
  sql?: string;
  source?: string;
  target?: string;
}

export interface ITemplate {
  version: string | number;
  name: string;
  environment: string;
  region: string;
  resources: {
    sandboxes?: ITemplateSandbox[];
    taps?: ITemplateTap[];
    flows?: ITemplateFlow[];
    shares?: ITemplateShare[];
  };
}
