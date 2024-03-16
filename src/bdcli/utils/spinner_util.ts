import ora from "ora";
import chalk from "chalk";

const error = chalk.bold.red;
const success = chalk.green;
const blue = chalk.blue;
const warning = chalk.hex("#FFA500"); // Orange color
const spinner = ora({ spinner: "dots" });
let isEnabled = true;

export function disableSpinner(): void {
  isEnabled = false;
}

export function enableSpinner(): void {
  isEnabled = true;
}

export function updateSpinnerText(message: string): void {
  if (!isEnabled) return;
  spinner.text = blue(message);
  if (spinner.isSpinning) return;
  spinner.start();
}

export function resumeSpinner(): void {
  if (!isEnabled) return;
  if (!spinner.text) return; // error?
  spinner.start();
}

export function stopSpinner(): void {
  if (!isEnabled) return;
  if (spinner.isSpinning) spinner.stop();
}

export function spinnerWarn(message?: string): void {
  if (!isEnabled) return;
  spinner.warn(message ? warning(message) : warning(spinner.text));
}

export function spinnerError(message?: string, forceExit = true): void {
  // We show errors regardless whether the spinner is disabled
  spinner.fail(message ? error(message) : undefined);
  if (forceExit) process.exit(1); // error
}

export function spinnerSuccess(message?: string): void {
  if (!isEnabled) return;
  spinner.succeed(message ? success(message) : undefined);
}

export function spinnerInfo(message: string): void {
  if (!isEnabled) return;
  spinner.info(blue(message));
}
