"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILE_TYPE = exports.LAYOUT = exports.SESSION_TYPE = exports.GRANT_PERMISSION = exports.EDataSetType = void 0;
var EDataSetType;
(function (EDataSetType) {
    EDataSetType["S3"] = "s3";
})(EDataSetType || (exports.EDataSetType = EDataSetType = {}));
var GRANT_PERMISSION;
(function (GRANT_PERMISSION) {
    GRANT_PERMISSION["G_WRITE"] = "write";
    GRANT_PERMISSION["G_READ"] = "read";
})(GRANT_PERMISSION || (exports.GRANT_PERMISSION = GRANT_PERMISSION = {}));
var SESSION_TYPE;
(function (SESSION_TYPE) {
    SESSION_TYPE["STS"] = "sts";
    SESSION_TYPE["ASSUME_ROLE"] = "assume_role";
})(SESSION_TYPE || (exports.SESSION_TYPE = SESSION_TYPE = {}));
var LAYOUT;
(function (LAYOUT) {
    LAYOUT["HIVE"] = "hive";
    LAYOUT["FOLDER"] = "folder";
    LAYOUT["FILE"] = "file";
})(LAYOUT || (exports.LAYOUT = LAYOUT = {}));
var FILE_TYPE;
(function (FILE_TYPE) {
    FILE_TYPE["PARQUET"] = "parquet";
    FILE_TYPE["JSON"] = "json";
    FILE_TYPE["CSV"] = "csv";
})(FILE_TYPE || (exports.FILE_TYPE = FILE_TYPE = {}));
