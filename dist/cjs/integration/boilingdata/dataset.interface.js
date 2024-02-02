"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILE_TYPE = exports.GRANT_PERMISSION = void 0;
var GRANT_PERMISSION;
(function (GRANT_PERMISSION) {
    GRANT_PERMISSION["G_WRITE"] = "write";
    GRANT_PERMISSION["G_READ"] = "read";
})(GRANT_PERMISSION || (exports.GRANT_PERMISSION = GRANT_PERMISSION = {}));
var FILE_TYPE;
(function (FILE_TYPE) {
    FILE_TYPE["PARQUET"] = "parquet";
    FILE_TYPE["JSON"] = "json";
    FILE_TYPE["CSV"] = "csv";
})(FILE_TYPE || (exports.FILE_TYPE = FILE_TYPE = {}));
