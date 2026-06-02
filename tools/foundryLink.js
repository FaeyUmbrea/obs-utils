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
		const localAppData
			= process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
		return path.join(localAppData, 'FoundryVTT', 'Config', 'options.json');
	}
	if (process.platform === 'darwin') {
		return path.join(
			home,
			'Library',
			'Application Support',
			'FoundryVTT',
			'Config',
			'options.json',
		);
	}
	// Linux and other Unix-likes.
	return path.join(
		home,
		'.local',
		'share',
		'FoundryVTT',
		'Config',
		'options.json',
	);
}

function askQuestion(query) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise(resolve =>
		rl.question(query, (ans) => {
			rl.close();
			resolve(ans);
		}),
	);
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
		throw new Error(
			'This has to be run inside a module project (no module.json found).',
		);
	}

	const name = JSON.parse(
		(
			await fs.promises.readFile(path.join(projectRoot, 'module.json'))
		).toString(),
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
		dataPath = (
			await askQuestion(
				'Please enter the path to your Foundry data directory (the folder containing "Data"): ',
			)
		).trim();
	}
	if (!dataPath) {
		throw new Error('No Foundry data path provided.');
	}

	// `junction` is Windows-only; every other platform uses a directory symlink.
	const linkType = process.platform === 'win32' ? 'junction' : 'dir';
	const modulesDir = path.join(dataPath, 'Data', 'modules');
	let target = path.join(modulesDir, name);

	if (fs.existsSync(target)) {
		console.log('A module is already present at the detected location:');
		console.log(target);
		const otherDir = await askQuestion(
			'Do you want to link to a different directory instead? y/N: ',
		);
		if (otherDir.trim().toLowerCase().startsWith('y')) {
			target = (
				await askQuestion('Please enter the full path you want to link to: ')
			).trim();
			fs.symlinkSync(projectRoot, target, linkType);
		}
	} else {
		fs.mkdirSync(modulesDir, { recursive: true });
		fs.symlinkSync(projectRoot, target, linkType);
	}

	console.log('All good! Your module is linked at:');
	console.log(target);
}

foundryLink().then();
