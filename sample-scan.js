#!/usr/bin/env node
const path = require('path');
const fs   = require('fs');
const mm   = require('music-metadata');
const walk = require('./common').walk

const usage = `sample-scan [search-dir=.] [outfile.js]

sample-scan recursively searches "search-dir" for audio files, and generates a
common.js file containing meta data about the files.

The metadata for each file includes a ".path" property which will be specified
relative to the current working directory.
`

console.warn(usage);

// getAndHandleReport requests audio file information from music-metadata, and
// adds them to the `results` object.
const cwd     = process.cwd();
const results = {}
const getAndHandleReport = async (filename) => {
  try {
    const metadata     = await mm.parseFile(filename);
    const relativePath = path.relative(cwd, filename);
    const key          = path.basename(filename);

    if (results.hasOwnProperty(key)) {
      console.warn(`WARNING: omitting non-unique (${key}) filename: ${relativePath}`);
    } else {
      results[key] = { path: relativePath, info: metadata.format };
      console.warn('FOUND:', relativePath);
    }
  } catch(e) {
    console.error(e);
  }
}

const args      = process.argv.slice(2);
const arg       = args[0] || '.';
const inputPath = path.isAbsolute(arg) ? arg : path.join(cwd, arg);
const stats     = fs.lstatSync(inputPath);
const writer    = args[1] ? fs.createWriteStream(args[1]) : process.stdout;
if (args[1]) console.log(`Writing to: ${args[1]}`);

let promise;

if (stats.isDirectory()) {
  console.warn('found directory:', inputPath);
  promise = walk(inputPath, getAndHandleReport);
} else if (stats.isFile()) {
  console.warn('found file:', inputPath);
  promise = getAndHandleReport(inputPath);
} else {
  console.error(`ERROR: "${arg}" is not a file or directory`);
  process.kill();
}

promise.then(() => {
  writer.write('module.exports = ');
  writer.write(JSON.stringify(results, null, 2));
  writer.write('\n');
}).catch((e) => {
  throw e;
}).finally(() => {
  console.warn('COMPLETE');
});
