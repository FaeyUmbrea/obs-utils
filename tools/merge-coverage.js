#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import istanbul from 'istanbul-lib-coverage';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define paths
const projectRoot = resolve(__dirname, '..');
const coverageDir = join(projectRoot, 'test-results', 'coverage');
const vitestCoverageDir = join(coverageDir, 'vitest');
const playwrightCoverageDir = join(coverageDir, 'playwright');
const mergedCoverageDir = join(coverageDir, 'merged');
const nycOutputDir = join(projectRoot, '.nyc_output');

// Ensure directories exist
[coverageDir, mergedCoverageDir, nycOutputDir].forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

// Function to run a command and log output
function runCommand(command) {
	console.warn(`Running: ${command}`);
	try {
		const output = execSync(command, { cwd: projectRoot, stdio: 'inherit' });
		return output;
	} catch (error) {
		console.error(`Error executing command: ${command}`);
		console.error(error);
		process.exit(1);
	}
}

// Define coverage file paths
const vitestCoverageFile = join(vitestCoverageDir, 'coverage-final.json');
const playwrightCoverageFile = join(playwrightCoverageDir, 'coverage-final.json');

// Check if coverage files exist
const vitestCoverageExists = existsSync(vitestCoverageFile);
const playwrightCoverageExists = existsSync(playwrightCoverageFile);

if (!vitestCoverageExists && !playwrightCoverageExists) {
	console.error('No coverage files found. Run tests with coverage first.');
	process.exit(1);
}

// Collect all available coverage files
const coverageFiles = [];
if (vitestCoverageExists) {
	console.warn('Found Vitest coverage data...');
	coverageFiles.push(vitestCoverageFile);
}

if (playwrightCoverageExists) {
	console.warn('Found Playwright coverage data...');
	coverageFiles.push(playwrightCoverageFile);
}

// Merge coverage data using istanbul-lib-coverage
console.warn('Merging coverage data...');
const map = istanbul.createCoverageMap({});
coverageFiles.forEach((file) => {
	const json = readFileSync(file); // .toString().replaceAll('\\\\', '/').replaceAll((`${projectRoot}/`).replaceAll('\\', '/'), '');
	map.merge(JSON.parse(json));
});

// Write merged coverage to file
const mergedCoverageFile = join(nycOutputDir, 'merged-coverage.json');
writeFileSync(mergedCoverageFile, JSON.stringify(map));
console.warn(`Merged coverage written to ${mergedCoverageFile}`);

// Generate reports
console.warn('Generating coverage reports...');
// Capture text report output to a file
const textReportPath = join(mergedCoverageDir, 'text-report.txt');
runCommand(`nyc report --reporter=text --reporter=html --input-file=${mergedCoverageFile} --report-dir=${mergedCoverageDir} > ${textReportPath}`);

console.warn('Coverage reports generated successfully!');
console.warn(`- HTML report: ${join(mergedCoverageDir, 'index.html')}`);
console.warn(`- Text report: ${textReportPath}`);
