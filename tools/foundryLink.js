/* eslint-disable no-console */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import * as readline from 'node:readline';

async function foundryLink() {
	const winPath = `${process.env.LOCALAPPDATA}/FoundryVTT/Config/options.json`;
	const distDir = '/';
	const moduleDir = '/Data/modules/';
	const moduleJsonPath = '/module.json';

	let moduleJsonPathFull = '';
	let cwd = process.cwd();
	while (cwd) {
		if (fs.existsSync(cwd + moduleJsonPath)) {
			moduleJsonPathFull = cwd + moduleJsonPath;
			break;
		}
		const newcwd = path.resolve(`${cwd}/..`);
		if (newcwd === cwd) cwd = '';
		cwd = newcwd;
	}
	if (!moduleJsonPathFull) throw new Error('This has to be run in a project');
	const name = JSON.parse(
		(await fs.promises.readFile(moduleJsonPathFull)).toString(),
	).id;

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

	let dataPath = '';
	if (process.platform === 'win32') {
		if (!fs.existsSync(winPath)) {
			dataPath = await askQuestion(
				'Please enter the path to your Foundry Modules Directory \n',
			);
		} else {
			const options = JSON.parse(
				(await fs.promises.readFile(winPath)).toString(),
			);
			dataPath = options?.dataPath;
		}
	} else {
		dataPath = await askQuestion(
			'Please enter the path to your Foundry modules directory',
		);
	}
	if (dataPath) {
		if (fs.existsSync(dataPath + moduleDir + name)) {
			console.log(
				'The file is already present in the detected modules directory:',
			);
			console.log(dataPath + moduleDir + name);
			const otherDir = await askQuestion(
				'Do you want to write to a different directory? Y/N (Default:N)',
			);
			if (otherDir === 'y' || otherDir === 'Y') {
				dataPath = await askQuestion(
					'Please enter the full path you want to link to \n',
				);
				fs.symlinkSync(
					cwd + distDir,
					dataPath,
					process.platform === 'win32' ? 'junction' : 'dir',
				);
			}
		} else {
			fs.symlinkSync(cwd + distDir, dataPath + moduleDir + name, 'junction');
		}
	}
	console.log('All good! You seem to be set up correctly!');
}

foundryLink();
