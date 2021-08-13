import { getBorderCharacters, table } from "table";
import yargs = require("yargs");
import { VarGroupCollection } from "../vargroups/VarGroupCollection";
import chalk = require("chalk");

function sum(x: number[]) {
  return x.reduce((a, b) => a + b, 0);
}

function splitTable(data: string[][], widths: number[]): any[] {
  if (sum(widths) + 3 * widths.length + 4 <= yargs.terminalWidth())
    return [data];

  const tables: any[] = [];

  let curWidth = 4 + widths[0] + 3 + widths[1];
  let startIdx = 1;
  let endIdx = 2;

  const pushTable = () => {
    tables.push(data.map((row) => [row[0], ...row.slice(startIdx, endIdx)]));
    startIdx = endIdx;
    curWidth = 4 + widths[0] + 3 + widths[startIdx];
  };

  while (endIdx < widths.length) {
    curWidth += 3 + widths[endIdx];
    if (curWidth > yargs.terminalWidth())
      pushTable();

    endIdx++;
  }
  pushTable();
  return tables;
}

export function printTable(data: VarGroupCollection) {
  const rows = new Array(data.varNames.length + 1);
  rows[0] = ["  ", ...data.aliases.map((v) => chalk.bold(v))];
  let i = 1;

  const maxColWidth = Math.floor(Math.max(yargs.terminalWidth() / 10, 36));
  const maxWidths = new Array(data.aliases.length + 1).fill(5);
  maxWidths[0] = Math.max(...data.varNames.map((v) => v.length));
  const aliases = data.aliases;

  for (const varName of data.varNames) {
    const values: string[] = aliases.map((a) => data.getDisplayValue(a, varName));

    for (let j = aliases.length - 1; j >= 0; j--) {
      if (j > 0 && values[j] === values[j - 1]) {
        maxWidths[j + 1] = Math.max(maxWidths[j + 1], Math.min(maxColWidth, values[j].length));
        const trunc = (values[j].length > maxColWidth) ? values[j].substring(0, maxColWidth - 3) + "..." : values[j];
        values[j] = chalk.gray(trunc);
      } else {
        maxWidths[j + 1] = Math.max(maxWidths[j + 1], (values[j] || "").length);
      }
    }

    rows[i] = [chalk.bold(varName), ...values];
    i++;
  }

  const tables = splitTable(rows, maxWidths);
  for (const t of tables) {
    console.log(table(t, {
      border: {
        ...getBorderCharacters("void"),
        bodyJoin: "│",
        joinBody: "─",
        joinJoin: "┼",
      },
      drawHorizontalLine: (i) => i === 1,
    }));
  }
}
