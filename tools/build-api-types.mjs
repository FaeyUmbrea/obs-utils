import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

async function main() {
	const outputDirectory = path.resolve('.release/api-types/package');
	const sourcePackage = JSON.parse(await readFile('package.json', 'utf8'));
	const version = (process.env.API_TYPES_VERSION ?? sourcePackage.version).replace(/^v/, '');

	await rm(path.dirname(outputDirectory), { recursive: true, force: true });
	await mkdir(outputDirectory, { recursive: true });

	const yarn = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
	const result = spawnSync(yarn, ['exec', 'tsc', '-p', 'tsconfig.api-types.json'], { stdio: 'inherit' });
	if (result.status !== 0) process.exit(result.status ?? 1);

	const artifactPackage = {
		name: '@faeyumbrea/obs-utils-api-types',
		version,
		private: true,
		types: './public-api.d.ts',
		exports: {
			'.': {
				types: './public-api.d.ts',
			},
		},
		peerDependencies: {
			'fvtt-types': sourcePackage.devDependencies['fvtt-types'],
			'svelte': sourcePackage.devDependencies.svelte,
		},
	};

	await writeFile(
		path.join(outputDirectory, 'package.json'),
		`${JSON.stringify(artifactPackage, null, 2)}\n`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
