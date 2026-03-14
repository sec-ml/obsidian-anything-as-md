import { Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS, parseExtensionsList } from "./settings";
import type { AnythingAsMdSettings } from "./settings";
import { AnythingAsMdSettingTab } from "./settings";

// Previous behaviour:
// - Read a comma separated list of extensions from settings.
// - Call this.registerExtensions so Obsidian can see those files/open using Markdown view.
//
// How naive I was, to think this would be enough to make Obsidian treat those
// files as "first class" notes... Obsidian still only treated real .md files as
// proper notes, i.e. created a metadata cache (frontmatter, headings, etc.).
//
// Highly experimental (& dangerous?) feature now:
// 1. Tells Obsidian that a file is .md to force it to be indexed.
// 2. Overrides getMarkdownFiles() to include these files
// 3. Adds extension labels in the sidebar (like Obsidian default non-md pill). We clear
// Obsidian's default pill and show ours so it's obvious the file isn't a real .md.

export default class AnythingAsMdPlugin extends Plugin {
	settings: AnythingAsMdSettings;

	// Previously: only parsed extensions from settings to call registerExtensions(extensions, "markdown").
	// Now: store list here and refresh on load/save (so getMarkdownFiles, metadata
	// cache, label pills etc. all use the same list).
	private extraExtensions: string[] = [];

	// Sketchy. Track functions to revert everything that was overridden. Restore is called in onunload.
	private revertFuncs: Array<() => void> = [];

	async onload() {
		await this.loadSettings();

		// update list of extra supported extensions.
		this.refreshExtraExtensions();

		// Register extra extensions so Obsidian opens them in the Markdown view.
		// Original plugin behaviour. Now probably the safest bit...
		if (this.extraExtensions.length > 0) {
			this.registerExtensions(this.extraExtensions, "markdown");
		}

		// Trigger experimental features, but locked behind the toggle setting.
		// This is dangerous. Overrides Obsidian's internal logic, and will
		// probably break at some point.
		if (this.settings.indexLikeMarkdown) {
			this.patchGetMarkdownFiles();
			this.patchMetadataCache();
			this.registerMetadataRefreshHooks();
			this.registerPillHooks();
		}

		this.addSettingTab(new AnythingAsMdSettingTab(this.app, this));
	}

	// Call when plugin is disabled or Obsidian is shutting down
	onunload() {
		// Run all reversion functions so we restore Obsidian to normal
		while (this.revertFuncs.length > 0) {
			const undo = this.revertFuncs.pop();
			try {
				if (undo) undo();
			} catch {
				// Ignore potential (lol) errors.
			}
		}
	}

	// Load settings (fallback: defults)
	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<AnythingAsMdSettings>
		);
	}

	// Save settings
	async saveSettings() {
		await this.saveData(this.settings);
		// Rebuild extension list when settings change
		this.refreshExtraExtensions();
	}

    // read extensionsList string from settings and turn it into (lowercase/normalised) array
	private refreshExtraExtensions() {
		const rawExtensions = parseExtensionsList(this.settings.extensionsList);
		this.extraExtensions = rawExtensions
			.map((ext) => ext.trim().toLowerCase())
			.filter(Boolean);
	}

	// helper: check whether a file is one of our Franken-down files. Check file.extension
	// to get actual (on-disk) extension.
	private isExtraMarkdownFile(file: TFile) {
		return this.extraExtensions.includes(file.extension.toLowerCase());
	}

	// DANGEROUS OBSIDIAN OVERRIDE #1
	// Obsidian's getMarkdownFiles() only returns .md files. Override it so the
	// list also includes our extra extensions (graph, search, backlinks use this).
	private patchGetMarkdownFiles() {
		// Fix lint error: use minimal type cast instead of any so we can assign to getMarkdownFiles.
		const vault = this.app.vault as { getMarkdownFiles?: () => TFile[] };
		if (typeof vault.getMarkdownFiles !== "function") {
			return;
		}

		// Save original function so we can restore if plugin is disabled.
		// Fix lint error: bind result already has a type.
		const originalGetMarkdownFiles = vault.getMarkdownFiles.bind(vault);
		this.revertFuncs.push(() => {
			vault.getMarkdownFiles = originalGetMarkdownFiles;
		});

		// define new getMarkdownFiles
		vault.getMarkdownFiles = () => {
			// Get original list of .md files.
			const markdownFiles = originalGetMarkdownFiles();
			// Get list of our extra 'markdown' files
			const extras = this.app.vault
				.getFiles()
				.filter((file) => file instanceof TFile && this.isExtraMarkdownFile(file));

			// return if none
			if (extras.length === 0) return markdownFiles;

			// track files already seen to avoid double processing
			const seen = new Set(markdownFiles.map((f) => f.path));
			const merged = markdownFiles.slice();

			for (const file of extras) {
				if (!seen.has(file.path)) {
					merged.push(file);
					seen.add(file.path);
				}
			}

			// return the combined list. Other plugins (and Obsidian) will now use this
			// to find all 'markdown' files.
			return merged;
		};
	}

	// DANGEROUS OBSIDIAN OVERRIDES #2 & #3
	// Obsidian only indexes when file.extension is "md" and getCache() only returns data for .md paths.
	// Patch computeFileMetadataAsync (spoof extension to "md" during compute) and getCache (look up by hash for our extensions).
	private patchMetadataCache() {
		// Fix lint error: Doesn't like 'any' and unsafe member access. Use a minimal type for the
		// internal APIs we patch so we can assign/call without 'any'.
		type MetadataCachePatchable = {
			computeFileMetadataAsync?: (file: TFile) => Promise<unknown>;
			getCache?: (path: string) => unknown;
			fileCache?: Record<string, { hash?: string }>;
			metadataCache?: Record<string, unknown>;
		};
		const mc = this.app.metadataCache as MetadataCachePatchable;

		// #2: computeFileMetadataAsync
		// check mc.computeFileMetadataAsync is available (internal func, may change in future, etc.)
		if (typeof mc.computeFileMetadataAsync === "function") {
			const originalCompute = mc.computeFileMetadataAsync.bind(mc);
			this.revertFuncs.push(() => {
				mc.computeFileMetadataAsync = originalCompute;
			});

			mc.computeFileMetadataAsync = async (file: TFile) => {
				// real .md files just get processed as normal.
				if (!this.isExtraMarkdownFile(file)) {
					return await originalCompute(file);
				}

				// Remember the real extension of our 'markdown' file.
				const originalExtension = file.extension;

				try {
					// Lie to Obsidian: "It's an '.md' file, honest guv"
					// to allow indexing
					Object.defineProperty(file, "extension", {
						value: "md",
						configurable: true,
					});

					// ...and now run original indexing function.
					return await originalCompute(file);
				} finally {
					// Then restore the real ext.
					Object.defineProperty(file, "extension", {
						value: originalExtension,
						configurable: true,
					});
				}
			};
		}

		// #3: getCache
		// Like #2,check mc.getCache is available (internal func, may change in future, etc.)
		// and that fileCache and metadataCache are also available.
		if (typeof mc.getCache === "function" && mc.fileCache && mc.metadataCache) {
			const fileCache = mc.fileCache;
			const metadataCache = mc.metadataCache;
			const originalGetCache = mc.getCache.bind(mc);
			this.revertFuncs.push(() => {
				mc.getCache = originalGetCache;
			});

			mc.getCache = (path: string) => {
				const lowerPath = path.toLowerCase();

				// If this is a real .md file, use default function.
				if (lowerPath.endsWith(".md")) {
					return originalGetCache(path);
				}

				// If this is not one of our extra extensions, use default function.
				const dotIndex = lowerPath.lastIndexOf(".");
				const ext = dotIndex === -1 ? "" : lowerPath.slice(dotIndex + 1);
				if (!this.extraExtensions.includes(ext)) {
					return originalGetCache(path);
				}

				// For our fake markdown files, try to look up cached metadata by hash
				const fileEntry = fileCache[path];
				if (!fileEntry || !fileEntry.hash) return null;

				return metadataCache[fileEntry.hash] ?? null;
			};
		}
	}

    // Event hooks
	// When our files are created/modified/renamed, tell Obsidian to refresh their metadata.
	private registerMetadataRefreshHooks() {
		const vault = this.app.vault;

		this.registerEvent(
			vault.on("create", (file) => {
				if (file instanceof TFile && this.isExtraMarkdownFile(file)) {
					void this.refreshMetadataForFile(file, false);
				}
			})
		);

		this.registerEvent(
			vault.on("modify", (file) => {
				if (file instanceof TFile && this.isExtraMarkdownFile(file)) {
					void this.refreshMetadataForFile(file, false);
				}
			})
		);

		this.registerEvent(
			vault.on("rename", (file) => {
				if (file instanceof TFile && this.isExtraMarkdownFile(file)) {
					void this.refreshMetadataForFile(file, false);
				}
			})
		);
	}

	// Tell metadataCache to recompute metadata for this file. Prefer (override func) computeFileMetadataAsync but fallback to older internal methods.
	// Currently available functions for metadata cache refresh/triggering: computeFileMetadataAsync, onCreateOrModify, computeMetadataAsync.
	private async refreshMetadataForFile(file: TFile, showNoticeOnFailure: boolean) {
		// Fix lint error: Doesn't like 'any'. Add types for internal refresh methods.
		type MetadataCacheRefreshable = {
			computeFileMetadataAsync?: (file: TFile) => Promise<unknown>;
			onCreateOrModify?: (file: TFile) => Promise<unknown> | void;
			computeMetadataAsync?: (bytes: Uint8Array) => Promise<unknown>;
		};
		const metadataCache = this.app.metadataCache as MetadataCacheRefreshable;

		try {
			if (typeof metadataCache.computeFileMetadataAsync === "function") {
				await metadataCache.computeFileMetadataAsync(file);
				return true;
			}

			if (typeof metadataCache.onCreateOrModify === "function") {
				await metadataCache.onCreateOrModify(file);
				return true;
			}

			if (typeof metadataCache.computeMetadataAsync === "function") {
				const content = await this.app.vault.cachedRead(file);
				const bytes = new TextEncoder().encode(content);
				await metadataCache.computeMetadataAsync(bytes);
				return true;
			}

			// No compatible method for metadata cache refresh/triggering found
			if (showNoticeOnFailure) {
				new Notice(
					"Anything as Markdown: no compatible metadata refresh method found."
				);
			}

			// failed to refresh metadata
			return false;
		} catch (error) {
			console.error("Anything as Markdown: metadata refresh failed for", file.path, error);
			if (showNoticeOnFailure) {
				new Notice(
					`Anything as Markdown: failed to refresh metadata for ${file.path}. Check console for details.`
				);
			}
			return false;
		}
	}

	// Labels/pills in sidebar (like Obsidian's built-in non-md label). We add our own because
	// once we treat .mdx as markdown, Obsidian's built-in labels stop working.
	private registerPillHooks() {
		// Update pills when active file changes. Run in timeout callback so Obsidian updates DOM first.
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				setTimeout(() => this.updateLabels(), 0);
			})
		);

		// When files are renamed/changed, explorer rows may move. Run in timeout callback so DOM is updated.
		this.registerEvent(
			this.app.vault.on("rename", () => {
				setTimeout(() => this.updateLabels(), 0);
			})
		);

		// On load, Obsidian adds default labels. Run once onload to override.
		window.setTimeout(() => this.updateLabels(), 100);
	}

	// Remove Obsidian's default extension labels/pills so we don't show both.
	private removeDefaultExtensionPill(container: HTMLElement, extension: string) {
		const extUpper = extension.toUpperCase();
		const extLower = extension.toLowerCase();
		const dotUpper = `.${extUpper}`;
		const dotLower = `.${extLower}`;
		container.querySelectorAll("span, div").forEach((el) => {
			if (!(el instanceof HTMLElement) || el.classList.contains("anything-as-md-ext-label")) return;
			const text = (el.textContent || "").trim();
			if (text === extUpper || text === extLower || text === dotUpper || text === dotLower) {
				el.remove();
			}
		});
	}

	// Look through sidebar items (DOM, not files in vault) & add label for each row where extension is in our list.
	private updateLabels() {
		document
			.querySelectorAll(".nav-file .anything-as-md-ext-label")
			.forEach((el) => el.remove());

		document.querySelectorAll(".nav-file-title[data-path]").forEach((el) => {
			const titleEl = el as HTMLElement;
			const path = titleEl.getAttribute("data-path");
			if (!path) return;

			const lowerPath = path.toLowerCase();
			const dotIndex = lowerPath.lastIndexOf(".");
			const ext = dotIndex === -1 ? "" : lowerPath.slice(dotIndex + 1);
			if (!this.extraExtensions.includes(ext)) return;

			this.removeDefaultExtensionPill(titleEl, ext);
			const pill = titleEl.createSpan
				? titleEl.createSpan({
						text: ext.toUpperCase(),
						cls: "anything-as-md-ext-label",
				  })
				: titleEl.appendChild(document.createElement("span"));

			if (!(pill instanceof HTMLElement)) return;
		});
	}
}
