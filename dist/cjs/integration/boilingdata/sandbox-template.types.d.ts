export declare enum EModelFormat {
    NDJSON = "ndjson",
    AVRO = "avro",
    CSV = "csv"
}
export declare enum EPermission {
    READ = "read",
    WRITE = "write"
}
export interface ITemplateStorage {
    name: string;
    permissions: Array<{
        urlPrefix: string;
        accessRights?: EPermission[];
    }>;
}
export interface ITemplateTap {
    name: string;
    models?: Array<{
        name: string;
        model?: string[];
        format?: EModelFormat;
    }>;
}
export interface ITemplatePipe {
    name: string;
    input: string;
    keys?: string[];
    transformSql?: string;
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
    id: string;
    environment: string;
    region: string;
    resources: {
        storage: ITemplateStorage;
        taps?: ITemplateTap[];
        pipes?: ITemplatePipe[];
        shares?: ITemplateShare[];
    };
}
