import ora from "ora";
import chalk from "chalk";

const error = chalk.bold.red;
const success = chalk.green;
const blue = chalk.blue;
// const warning = chalk.hex("#FFA500"); // Orange color
const spinner = ora({ spinner: "dots" });

export const updateSpinnerText = (message: string): void => {
  if (spinner.isSpinning) {
    spinner.text = blue(message);
    return;
  }
  spinner.start(blue(message));
};

export const stopSpinner = (): void => {
  if (spinner.isSpinning) spinner.stop();
};

export const spinnerError = (message?: string): void => {
  if (spinner.isSpinning) spinner.fail(error(message));
};

export const spinnerSuccess = (message?: string): void => {
  if (spinner.isSpinning) spinner.succeed(message ? success(message) : undefined);
};

export const spinnerInfo = (message: string): void => {
  spinner.info(blue(message));
};
