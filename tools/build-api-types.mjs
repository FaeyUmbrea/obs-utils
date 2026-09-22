import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

async function main() {
	const outputDirectory = path.resolve('.release/api-types/package');
	const sourcePackage = JSON.parse(await readFile('package.json', 'utf8'));
	const apiPackage = JSON.parse(await readFile('api-types/package.json', 'utf8'));
	const releaseChannel = process.env.RELEASE_CHANNEL ?? 'public';
	const releaseTag = process.env.RELEASE_TAG;
	if (releaseChannel !== 'public' && releaseChannel !== 'premium') {
		throw new Error('RELEASE_CHANNEL must be either public or premium');
	}
	if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(apiPackage.version)) {
		throw new Error(`API version must be plain semver, received ${apiPackage.version}`);
	}
	if (releaseChannel === 'premium' && !releaseTag) {
		throw new Error('RELEASE_TAG is required for premium API builds');
	}
	if (releaseTag && !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(releaseTag)) {
		throw new Error(`Release tag must be plain semver, received ${releaseTag}`);
	}

	await rm(path.dirname(outputDirectory), { recursive: true, force: true });
	await mkdir(outputDirectory, { recursive: true });

	const yarn = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
	const result = spawnSync(yarn, [
		'exec',
		'dts-bundle-generator',
		'--no-check',
		'--no-banner',
		'--project',
		'tsconfig.api-types.json',
		'--out-file',
		path.join(outputDirectory, 'public-api.d.ts'),
		'src/public-api.ts',
	], { stdio: 'inherit' });
	if (result.status !== 0) process.exit(result.status ?? 1);
	const peerDependencies = {};
	for (const dependency of [
		'svelte',
	]) peerDependencies[dependency] = sourcePackage.devDependencies[dependency];

	const artifactPackage = {
		...apiPackage,
		version: releaseChannel === 'premium'
			? `${apiPackage.version}-ea.${releaseTag}`
			: apiPackage.version,
		types: './public-api.d.ts',
		exports: {
			'.': {
				types: './public-api.d.ts',
			},
		},
		peerDependencies,
		sideEffects: false,
	};
	if (releaseChannel === 'premium' && process.env.GITHUB_REPOSITORY) {
		artifactPackage.repository = {
			type: 'git',
			url: `git+https://github.com/${process.env.GITHUB_REPOSITORY}.git`,
		};
	}

	await writeFile(
		path.join(outputDirectory, 'package.json'),
		`${JSON.stringify(artifactPackage, null, 2)}\n`,
	);
	await Promise.all([
		copyFile('LICENSE', path.join(outputDirectory, 'LICENSE')),
		copyFile('api-types/README.md', path.join(outputDirectory, 'README.md')),
	]);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
