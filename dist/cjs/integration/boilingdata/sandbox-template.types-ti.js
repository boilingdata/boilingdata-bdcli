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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITemplate = exports.ITemplateShare = exports.ITemplatePipe = exports.ITemplateTap = exports.ITemplateStorage = exports.EPermission = exports.EModelFormat = void 0;
/**
 * This module was automatically generated by `ts-interface-builder`
 */
const t = __importStar(require("ts-interface-checker"));
// tslint:disable:object-literal-key-quotes
exports.EModelFormat = t.enumtype({
    "NDJSON": "ndjson",
    "AVRO": "avro",
    "CSV": "csv",
});
exports.EPermission = t.enumtype({
    "READ": "read",
    "WRITE": "write",
});
exports.ITemplateStorage = t.iface([], {
    "name": "string",
    "permissions": t.array(t.iface([], {
        "urlPrefix": "string",
        "accessRights": t.opt(t.array("EPermission")),
    })),
});
exports.ITemplateTap = t.iface([], {
    "name": "string",
    "models": t.opt(t.array(t.iface([], {
        "name": "string",
        "model": t.opt(t.array("string")),
        "format": t.opt("EModelFormat"),
    }))),
});
exports.ITemplatePipe = t.iface([], {
    "name": "string",
    "input": "string",
    "keys": t.opt(t.array("string")),
    "transformSql": t.opt("string"),
    "output": t.opt(t.union("string", t.array("string"))),
    "errors": t.opt("string"),
});
exports.ITemplateShare = t.iface([], {
    "name": "string",
    "users": t.array("string"),
    "sql": t.opt("string"),
    "source": t.opt("string"),
    "target": t.opt("string"),
});
exports.ITemplate = t.iface([], {
    "version": t.union("string", "number"),
    "id": "string",
    "region": "string",
    "resources": t.iface([], {
        "storage": "ITemplateStorage",
        "taps": t.opt(t.array("ITemplateTap")),
        "pipes": t.opt(t.array("ITemplatePipe")),
        "shares": t.opt(t.array("ITemplateShare")),
    }),
});
const exportedTypeSuite = {
    EModelFormat: exports.EModelFormat,
    EPermission: exports.EPermission,
    ITemplateStorage: exports.ITemplateStorage,
    ITemplateTap: exports.ITemplateTap,
    ITemplatePipe: exports.ITemplatePipe,
    ITemplateShare: exports.ITemplateShare,
    ITemplate: exports.ITemplate,
};
exports.default = exportedTypeSuite;
