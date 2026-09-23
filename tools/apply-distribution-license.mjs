import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

export function proprietaryLicense(author) {
	return `Copyright ${author}. All rights reserved.

This software is proprietary. An authorized recipient may install and use a copy obtained through an official distribution channel for its intended purpose. No other rights are granted.

Except as necessary for that installation and use, no part of this software may be copied, modified, redistributed, sublicensed, published, or sold without prior written permission from the copyright holder.
`;
}

export async function applyDistributionLicense(channel, manifestPath, licensePath) {
	if (channel !== 'public' && channel !== 'premium') {
		throw new Error('RELEASE_CHANNEL must be either public or premium');
	}
	if (channel === 'public') return;

	const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
	const author = manifest.authors?.[0]?.name;
	if (!author) throw new Error('The premium manifest must declare a primary author');

	manifest.license = 'All Rights Reserved';
	await Promise.all([
		writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
		writeFile(licensePath, proprietaryLicense(author), 'utf8'),
	]);
}

async function main() {
	const [manifestPath, licensePath] = process.argv.slice(2);
	if (!manifestPath || !licensePath) {
		throw new Error('Usage: node tools/apply-distribution-license.mjs MANIFEST LICENSE');
	}
	await applyDistributionLicense(process.env.RELEASE_CHANNEL ?? 'public', manifestPath, licensePath);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
