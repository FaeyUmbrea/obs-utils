/* eslint-disable no-console */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as process from 'node:process';
import * as readline from 'node:readline';

// Default location of Foundry VTT's `Config/options.json` per platform.
function defaultOptionsPath() {
	const home = os.homedir();
	if (process.platform === 'win32') {
		const localAppData = process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
		return path.join(localAppData, 'FoundryVTT', 'Config', 'options.json');
	}
	if (process.platform === 'darwin') {
		return path.join(home, 'Library', 'Application Support', 'FoundryVTT', 'Config', 'options.json');
	}
	// Linux and other Unix-likes.
	return path.join(home, '.local', 'share', 'FoundryVTT', 'Config', 'options.json');
}

// A single shared readline interface with a line queue. Buffering lines as they
// arrive keeps prompts working for both interactive and piped/non-interactive
// stdin (a per-prompt interface drops buffered lines and hangs on EOF).
let sharedRl = null;
const lineQueue = [];
const waiters = [];

function ensureReadline() {
	if (sharedRl) return;
	sharedRl = readline.createInterface({ input: process.stdin });
	sharedRl.on('line', (line) => {
		const waiter = waiters.shift();
		if (waiter) waiter(line);
		else lineQueue.push(line);
	});
	sharedRl.on('close', () => {
		// At EOF, resolve any pending prompts with the empty (default) answer.
		while (waiters.length) waiters.shift()('');
	});
}

function askQuestion(query) {
	ensureReadline();
	process.stdout.write(query);
	if (lineQueue.length) return Promise.resolve(lineQueue.shift());
	return new Promise(resolve => waiters.push(resolve));
}

function closeQuestions() {
	if (sharedRl) {
		sharedRl.close();
		sharedRl = null;
	}
}

async function foundryLink() {
	// Locate the project's module.json by walking up from the current directory.
	let projectRoot = '';
	let cwd = process.cwd();
	while (cwd) {
		if (fs.existsSync(path.join(cwd, 'module.json'))) {
			projectRoot = cwd;
			break;
		}
		const parent = path.resolve(cwd, '..');
		if (parent === cwd) break;
		cwd = parent;
	}
	if (!projectRoot) {
		throw new Error('This has to be run inside a module project (no module.json found).');
	}

	const name = JSON.parse(
		(await fs.promises.readFile(path.join(projectRoot, 'module.json'))).toString(),
	).id;

	// Resolve the Foundry data path: read it from options.json when available, else ask.
	let dataPath = '';
	const optionsPath = defaultOptionsPath();
	if (fs.existsSync(optionsPath)) {
		try {
			const options = JSON.parse(
				(await fs.promises.readFile(optionsPath)).toString(),
			);
			dataPath = options?.dataPath ?? '';
		} catch {
			dataPath = '';
		}
	}
	if (!dataPath) {
		dataPath = (await askQuestion(
			'Please enter the path to your Foundry data directory (the folder containing "Data"): ',
		)).trim();
	}
	if (!dataPath) {
		throw new Error('No Foundry data path provided.');
	}

	// `junction` is Windows-only; every other platform uses a directory symlink.
	const linkType = process.platform === 'win32' ? 'junction' : 'dir';
	const modulesDir = path.join(dataPath, 'Data', 'modules');
	const target = path.join(modulesDir, name);
	const desired = fs.realpathSync(projectRoot);

	// Inspect anything already at the target without following the link.
	let existing = null;
	try {
		existing = fs.lstatSync(target);
	} catch {
		existing = null;
	}

	if (existing) {
		if (!existing.isSymbolicLink()) {
			console.log('A non-symlink file or directory already occupies the target; leaving it untouched:');
			console.log(`  ${target}`);
			return;
		}

		// Resolve where the existing link currently points (null if broken).
		let currentTarget = null;
		try {
			currentTarget = fs.realpathSync(target);
		} catch {
			currentTarget = null;
		}

		if (currentTarget === desired) {
			console.log('Module is already linked correctly:');
			console.log(`  ${target} -> ${desired}`);
			return;
		}

		console.log('A link already exists but points elsewhere:');
		console.log(`  ${target} -> ${currentTarget ?? fs.readlinkSync(target)}`);
		const update = await askQuestion(
			`Update it to point to ${projectRoot}? Y/n: `,
		);
		if (update.trim() !== '' && !update.trim().toLowerCase().startsWith('y')) {
			console.log('Left the existing link unchanged.');
			return;
		}
		fs.rmSync(target, { force: true, recursive: true });
		fs.symlinkSync(projectRoot, target, linkType);
		console.log('Link updated:');
		console.log(`  ${target} -> ${projectRoot}`);
		return;
	}

	fs.mkdirSync(modulesDir, { recursive: true });
	fs.symlinkSync(projectRoot, target, linkType);

	console.log('All good! Your module is linked at:');
	console.log(`  ${target}`);
}

foundryLink()
	.catch((err) => {
		console.error(err.message ?? err);
		globalThis.process.exitCode = 1;
	})
	.finally(closeQuestions);
