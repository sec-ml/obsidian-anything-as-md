#!/usr/bin/env node
/* global process */
/**
 * Copy plugin files needed to run in test vault.
 * Call with `npm run test-copy` after build.
 */

import { copyFile, mkdir, access } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PLUGIN_ID = "anything-as-md";
const DEST = join(ROOT, "test-vault", ".obsidian", "plugins", PLUGIN_ID);

const files = [
	["main.js", "main.js"],
	["manifest.json", "manifest.json"],
];

async function copyToTestVault() {
	await mkdir(DEST, { recursive: true });

	for (const [src, destName] of files) {
		const srcPath = join(ROOT, src);
		const destPath = join(DEST, destName);
		await copyFile(srcPath, destPath);
		console.log(`Copied ${src} -> test-vault/.../${PLUGIN_ID}/${destName}`);
	}

	const stylesDest = join(DEST, "styles.css");
	try {
		await access(join(ROOT, "styles.css"));
		await copyFile(join(ROOT, "styles.css"), stylesDest);
	} catch {
		await copyFile(join(ROOT, "src", "styles.css"), stylesDest);
	}
	console.log(`Copied styles -> test-vault/.../${PLUGIN_ID}/styles.css`);
}

copyToTestVault().catch((err) => {
	console.error(err);
	process.exit(1);
});
