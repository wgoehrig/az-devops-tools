import chalk from "chalk";

const locale: any = {
  "Commands:": chalk.cyan`Command Groups:`,
  "Options:": chalk.cyan`Options:`,
  "Examples:": chalk.cyan`Examples:`,
  "Positionals:": chalk.cyan`Positionals:`,
  "boolean": chalk.green`boolean`,
  "count": chalk.green`count`,
  "string": chalk.green`string`,
  "number": chalk.green`number`,
  "array": chalk.green`array`,
  "required": chalk.yellow`required`,
  "default": chalk.green`default`,
  "default:": chalk.blue`default:`,
  "choices:": chalk.blue`choices:`,
  "aliases:": chalk.blue`aliases:`,
  "generated-value": chalk.green`generated-value`,
  "Not enough non-option arguments: got %s, need at least %s": {
    "one": chalk.bold.red`Not enough non-option arguments: got %s, need at least %s`,
    "other": chalk.bold.red`Not enough non-option arguments: got %s, need at least %s`
  },
  "Too many non-option arguments: got %s, maximum of %s": {
    "one": chalk.bold.red`Too many non-option arguments: got %s, maximum of %s`,
    "other": chalk.bold.red`Too many non-option arguments: got %s, maximum of %s`
  },
  "Missing argument value: %s": {
    "one": chalk.bold.red`Missing argument value: %s`,
    "other": chalk.bold.red`Missing argument values: %s`
  },
  "Missing required argument: %s": {
    "one": chalk.bold.red`Missing required argument: %s`,
    "other": chalk.bold.red`Missing required arguments: %s`
  },
  "Unknown argument: %s": {
    "one": chalk.bold.red`Unknown argument: %s`,
    "other": chalk.bold.red`Unknown arguments: %s`
  },
  "Invalid values:": chalk.bold.red`Invalid values:`,
  "Argument: %s, Given: %s, Choices: %s": chalk.bold.red`Argument: %s, Given: %s, Choices: %s`,
  "Argument check failed: %s": chalk.bold.red`Argument check failed: %s`,
  "Implications failed:": chalk.bold.red`Missing dependent arguments:`,
  "Not enough arguments following: %s": chalk.bold.red`Not enough arguments following: %s`,
  "Invalid JSON config file: %s": chalk.bold.red`Invalid JSON config file: %s`,
  "Path to JSON config file": chalk`Path to JSON config file`,
  "Show help": chalk`Show help`,
  "Show version number": chalk`Show version number`,
  "Did you mean %s?": chalk.bold.red`Did you mean %s?`,
  "Arguments %s and %s are mutually exclusive" : chalk.bold.red`Arguments %s and %s are mutually exclusive`,
  "command": chalk.bold.red`command`,
  "deprecated": chalk.bold.red`deprecated`,
  "deprecated: %s": chalk.bold.red`deprecated: %s`
};

export function fixYargsColors(yargs: import("yargs").Argv) {
  yargs.updateLocale(locale);
}