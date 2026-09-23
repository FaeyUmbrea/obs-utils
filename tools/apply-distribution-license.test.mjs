import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
// eslint-disable-next-line test/no-import-node-test
import test from 'node:test';
import { applyDistributionLicense } from './apply-distribution-license.mjs';

async function fixture() {
	const directory = await mkdtemp(path.join(tmpdir(), 'distribution-license-'));
	const manifestPath = path.join(directory, 'module.json');
	const licensePath = path.join(directory, 'LICENSE');
	await writeFile(manifestPath, `${JSON.stringify({
		authors: [{ name: 'Test Author' }],
		license: 'AGPL-3.0-only',
	}, null, 2)}\n`);
	await writeFile(licensePath, 'public license\n');
	return { directory, manifestPath, licensePath };
}

test('leaves public distribution licensing unchanged', async (context) => {
	const files = await fixture();
	context.after(() => rm(files.directory, { force: true, recursive: true }));

	await applyDistributionLicense('public', files.manifestPath, files.licensePath);

	assert.equal(await readFile(files.licensePath, 'utf8'), 'public license\n');
	assert.equal(JSON.parse(await readFile(files.manifestPath, 'utf8')).license, 'AGPL-3.0-only');
});

test('applies the proprietary license to premium distributions', async (context) => {
	const files = await fixture();
	context.after(() => rm(files.directory, { force: true, recursive: true }));

	await applyDistributionLicense('premium', files.manifestPath, files.licensePath);

	assert.equal(JSON.parse(await readFile(files.manifestPath, 'utf8')).license, 'All Rights Reserved');
	assert.match(await readFile(files.licensePath, 'utf8'), /^Copyright Test Author\. All rights reserved\./);
});

test('rejects unknown release channels', async (context) => {
	const files = await fixture();
	context.after(() => rm(files.directory, { force: true, recursive: true }));

	await assert.rejects(
		applyDistributionLicense('preview', files.manifestPath, files.licensePath),
		/RELEASE_CHANNEL must be either public or premium/,
	);
});
