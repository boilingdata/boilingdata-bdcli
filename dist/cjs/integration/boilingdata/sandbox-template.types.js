"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EPermission = exports.EModelFormat = void 0;
var EModelFormat;
(function (EModelFormat) {
    EModelFormat["NDJSON"] = "ndjson";
    EModelFormat["AVRO"] = "avro";
    EModelFormat["CSV"] = "csv";
})(EModelFormat || (exports.EModelFormat = EModelFormat = {}));
var EPermission;
(function (EPermission) {
    EPermission["READ"] = "read";
    EPermission["WRITE"] = "write";
})(EPermission || (exports.EPermission = EPermission = {}));
