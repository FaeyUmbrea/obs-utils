import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const packageDirectory = path.resolve(process.env.API_TYPES_PACKAGE_DIR ?? '.release/api-types/package');

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd,
		env: options.env ?? process.env,
		encoding: 'utf8',
		stdio: options.capture ? 'pipe' : 'inherit',
	});
	if (result.status !== 0 && !options.allowFailure) {
		throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
	}
	return result;
}

async function listFiles(directory, prefix = '') {
	const files = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const relative = path.posix.join(prefix, entry.name);
		if (entry.isDirectory()) files.push(...await listFiles(path.join(directory, entry.name), relative));
		else if (entry.isFile()) files.push(relative);
	}
	return files.sort();
}

async function fingerprint(directory, { ignoreVersion = false } = {}) {
	const hash = createHash('sha256');
	for (const relative of await listFiles(directory)) {
		let contents = await readFile(path.join(directory, relative));
		if (ignoreVersion && relative === 'package.json') {
			const manifest = JSON.parse(contents.toString('utf8'));
			delete manifest.version;
			contents = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
		}
		hash.update(relative);
		hash.update('\0');
		hash.update(contents);
		hash.update('\0');
	}
	return hash.digest('hex');
}

function isMissingPackage(result) {
	return result.status !== 0 && /E404|not found/i.test(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
}

function viewVersion(spec, env) {
	const result = run('npm', ['view', spec, 'version', '--json'], { capture: true, allowFailure: true, env });
	if (result.status === 0) return JSON.parse(result.stdout);
	if (isMissingPackage(result)) return undefined;
	process.stderr.write(result.stderr ?? '');
	throw new Error(`Could not query ${spec} from npm`);
}

async function packedDirectory(spec, workspace, label, env) {
	const archiveDirectory = path.join(workspace, `${label}-archive`);
	const extractDirectory = path.join(workspace, `${label}-extract`);
	await mkdir(archiveDirectory, { recursive: true });
	await mkdir(extractDirectory, { recursive: true });
	const result = run('npm', ['pack', spec, '--ignore-scripts', '--json', '--pack-destination', archiveDirectory], {
		capture: true,
		env,
	});
	const [{ filename }] = JSON.parse(result.stdout);
	run('tar', ['-xzf', path.join(archiveDirectory, filename), '-C', extractDirectory]);
	return path.join(extractDirectory, 'package');
}

async function emit(status, manifest) {
	const result = { status, name: manifest.name, version: manifest.version };
	process.stdout.write(`${JSON.stringify(result)}\n`);
	if (process.env.GITHUB_OUTPUT) {
		await writeFile(
			process.env.GITHUB_OUTPUT,
			`api_status=${status}\napi_name=${manifest.name}\napi_version=${manifest.version}\n`,
			{ flag: 'a' },
		);
	}
}

async function main() {
	const manifest = JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf8'));
	const workspace = await mkdtemp(path.join(os.tmpdir(), 'api-package-check-'));
	try {
		const npmEnvironment = { ...process.env, npm_config_cache: path.join(workspace, 'npm-cache') };
		const local = await packedDirectory(packageDirectory, workspace, 'local', npmEnvironment);
		const exactVersion = viewVersion(`${manifest.name}@${manifest.version}`, npmEnvironment);
		if (exactVersion) {
			const published = await packedDirectory(`${manifest.name}@${manifest.version}`, workspace, 'published', npmEnvironment);
			if (await fingerprint(local) !== await fingerprint(published)) {
				throw new Error(`${manifest.name}@${manifest.version} already exists with different contents; bump the API version`);
			}
			await emit('existing', manifest);
			return;
		}

		const latestVersion = viewVersion(`${manifest.name}@latest`, npmEnvironment);
		if (latestVersion) {
			const latest = await packedDirectory(`${manifest.name}@${latestVersion}`, workspace, 'latest', npmEnvironment);
			if (await fingerprint(local, { ignoreVersion: true }) === await fingerprint(latest, { ignoreVersion: true })) {
				throw new Error(`${manifest.name}@${manifest.version} changes only the version; remove the empty API bump`);
			}
		}

		await emit('new', manifest);
	} finally {
		await rm(workspace, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
