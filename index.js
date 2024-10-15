#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCLUDE_DIRS = ['node_modules', '.git'];

function hasInvalidCharacters(fileName) {
  return /[\b\u0008]/.test(fileName);
}

function removeInvalidCharacters(fileName) {
  return fileName.replace(/[\b\u0008]/g, '');
}

function collectFiles(dir, allFiles = []) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    console.error(`Cannot read directory: ${dir}\nError: ${err.message}`);
    return allFiles;
  }

  files.forEach(file => {
    const fullPath = path.join(dir, file);

    if (EXCLUDE_DIRS.includes(file)) {
      return;
    }

    let stats;
    try {
      stats = fs.statSync(fullPath);
    } catch (err) {
      console.error(`Cannot get file stats: ${fullPath}\nError: ${err.message}`);
      return;
    }

    if (stats.isDirectory()) {
      collectFiles(fullPath, allFiles);
    } else {
      allFiles.push(fullPath);
    }
  });

  return allFiles;
}

function escapeSpecialChars(str) {
  return str.replace(/[\b]/g, '\\b');
}

function isFix(arg) {
  return ['--fix', '-fix', 'fix'].includes(arg.toLowerCase());
}

async function checkAndFixFiles(files, fix = false) {
  let totalFiles = 0;
  let invalidFiles = 0;
  let invalidFileList = [];
  let fixedFiles = [];

  console.log(chalk.cyan('\n🔄 Starting bsck - ') + 
    '\x1b]8;;https://github.com/love1ace\x07' +
    chalk.cyan.underline('Developed by love1ace') +
    '\x1b]8;;\x07');
  console.log();

  for (const file of files) {
    const fileName = path.basename(file);
    totalFiles++;

    if (hasInvalidCharacters(fileName)) {
      invalidFiles++;
      invalidFileList.push(file);

      if (fix) {
        const newFileName = removeInvalidCharacters(fileName);
        const newFullPath = path.join(path.dirname(file), newFileName);

        if (fs.existsSync(newFullPath)) {
          console.error(chalk.red(`Cannot rename due to filename conflict: "${fileName}" -> "${newFileName}"`));
          continue;
        }

        try {
          fs.renameSync(file, newFullPath);
          fixedFiles.push({ old: file, new: newFullPath });
        } catch (err) {
          console.error(chalk.red(`Cannot rename file: ${file}\nError: ${err.message}`));
        }
      }
    }
  }

  console.log((`Total files checked: ${totalFiles}`));
  console.log(chalk.yellow(`Files with invalid characters: ${invalidFiles}`));
  console.log();

  if (fix) {
    if (fixedFiles.length > 0) {
      console.log(chalk.green('Fixed files:'));
      fixedFiles.forEach(f => console.log(`${chalk.red(escapeSpecialChars(f.old))} -> ${chalk.green(f.new)}`));
    } else {
      console.log(chalk.green('No files needed fixing.'));
    }
  } else {
    if (invalidFiles > 0) {
      console.log(chalk.yellow('Paths of files with invalid characters:'));
      invalidFileList.forEach(f => console.log(chalk.red(escapeSpecialChars(f))));
    } else {
      console.log(chalk.green('No files with invalid characters found.'));
    }
  }
  console.log();
}

const args = process.argv.slice(2);
const fix = args.some(isFix);

const allFiles = collectFiles(process.cwd());
checkAndFixFiles(allFiles, fix);
