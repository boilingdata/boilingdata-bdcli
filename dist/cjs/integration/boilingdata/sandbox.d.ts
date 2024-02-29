import { ILogger } from "../../bdcli/utils/logger_util.js";
import { ITemplate } from "./sandbox-template.types.js";
export interface IBDConfig {
    authToken: string;
    logger: ILogger;
}
export declare class BDSandbox {
    private params;
    private cognitoIdToken;
    private logger;
    private _tmpl;
    private tmplErrors;
    constructor(params: IBDConfig);
    get tmpl(): ITemplate;
    get region(): string | undefined;
    withTemplate(templateFilename: string): this;
    getSandboxTemplateErrors(): string;
    isSandboxConfig(sandboxTemplate: unknown): sandboxTemplate is ITemplate;
    destroySandbox(sandboxName: string, destroyAlsoInterfaces: boolean, finallyDeleteTemplate: boolean): Promise<any>;
    downloadTemplate(sandboxName: string, version: string, status?: string): Promise<string>;
    validateTemplateLocal(templateFilename: string): void;
    uploadTemplate(templateFilename: string, allowChangedFilename?: boolean): Promise<string>;
    validateTemplate(templateFilename: string, warningsAsErrors?: boolean): Promise<string>;
    listSandboxes(listDeleted: boolean, listVersions: boolean): Promise<Array<{
        name: string;
        status: string;
    }>>;
    planSandbox(sandboxName: string): Promise<any>;
    diffSandbox(sandboxName: string): Promise<any>;
    deploySandbox(sandboxName: string): Promise<any>;
    updateSandbox(sandboxName: string): Promise<any>;
    private _updateSandbox;
    private _uploadTemplate;
    private _deploySandbox;
}
