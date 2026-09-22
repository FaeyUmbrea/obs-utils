import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const packageDirectory = path.resolve(process.env.API_TYPES_PACKAGE_DIR ?? '.release/api-types/package');

function run(command, args, options = {}) {
	const result = spawnSync(command, args, { encoding: 'utf8', stdio: options.capture ? 'pipe' : 'inherit' });
	if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
	return result;
}

function versionParts(version) {
	const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
	if (!match) throw new Error(`API version must be plain semver, received ${version}`);
	return match.slice(1).map(Number);
}

function compareVersions(left, right) {
	const a = versionParts(left);
	const b = versionParts(right);
	for (let index = 0; index < a.length; index++) {
		if (a[index] !== b[index]) return a[index] - b[index];
	}
	return 0;
}

async function main() {
	const channel = process.env.RELEASE_CHANNEL;
	if (channel !== 'premium' && channel !== 'public') {
		throw new Error('RELEASE_CHANNEL must be either premium or public');
	}
	const manifest = JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf8'));
	const result = run('npm', ['view', manifest.name, 'dist-tags', '--json'], { capture: true });
	const currentTags = JSON.parse(result.stdout || '{}');
	const tags = channel === 'premium' ? ['latest', 'ea'] : ['public'];

	for (const tag of tags) {
		const current = currentTags[tag];
		if (current && compareVersions(current, manifest.version) > 0) {
			throw new Error(`Refusing to move ${manifest.name}@${tag} backwards from ${current} to ${manifest.version}`);
		}
		if (current === manifest.version) continue;
		run('npm', ['dist-tag', 'add', `${manifest.name}@${manifest.version}`, tag]);
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
