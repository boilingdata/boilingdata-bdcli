"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spinnerInfo = exports.spinnerSuccess = exports.spinnerError = exports.spinnerWarn = exports.stopSpinner = exports.resumeSpinner = exports.updateSpinnerText = exports.enableSpinner = exports.disableSpinner = void 0;
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const error = chalk_1.default.bold.red;
const success = chalk_1.default.green;
const blue = chalk_1.default.blue;
const warning = chalk_1.default.hex("#FFA500"); // Orange color
const spinner = (0, ora_1.default)({ spinner: "dots" });
let isEnabled = true;
function disableSpinner() {
    isEnabled = false;
}
exports.disableSpinner = disableSpinner;
function enableSpinner() {
    isEnabled = true;
}
exports.enableSpinner = enableSpinner;
function updateSpinnerText(message) {
    if (!isEnabled)
        return;
    spinner.text = blue(message);
    if (spinner.isSpinning)
        return;
    spinner.start();
}
exports.updateSpinnerText = updateSpinnerText;
function resumeSpinner() {
    if (!isEnabled)
        return;
    if (!spinner.text)
        return; // error?
    spinner.start();
}
exports.resumeSpinner = resumeSpinner;
function stopSpinner() {
    if (!isEnabled)
        return;
    if (spinner.isSpinning)
        spinner.stop();
}
exports.stopSpinner = stopSpinner;
function spinnerWarn(message) {
    if (!isEnabled)
        return;
    spinner.warn(message ? warning(message) : warning(spinner.text));
}
exports.spinnerWarn = spinnerWarn;
function spinnerError(message) {
    if (isEnabled)
        spinner.fail(message ? error(message) : undefined);
    process.exit(1); // error
}
exports.spinnerError = spinnerError;
function spinnerSuccess(message) {
    if (!isEnabled)
        return;
    spinner.succeed(message ? success(message) : undefined);
}
exports.spinnerSuccess = spinnerSuccess;
function spinnerInfo(message) {
    if (!isEnabled)
        return;
    spinner.info(blue(message));
}
exports.spinnerInfo = spinnerInfo;
