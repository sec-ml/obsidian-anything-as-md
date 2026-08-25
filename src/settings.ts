import { App, Notice, PluginSettingTab } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type AnythingAsMdPlugin from "./main";

const PLUGIN_ID = "anything-as-md";

// Available settings:
// - extensionsList: raw user string, e.g. "mdx, svx, rmd"
// - indexLikeMarkdown: enable the experimental metadata/indexing bodge
export interface AnythingAsMdSettings {
	extensionsList: string;
	indexLikeMarkdown: boolean;
}

export const DEFAULT_SETTINGS: AnythingAsMdSettings = {
	extensionsList: "mdx, svx, rmd",
	indexLikeMarkdown: true,
};

// Parse extensions string from settings into array. Lowercase, strip leading dots.
export function parseExtensionsList(raw: string) {
	return raw
		.split(/[\s,]+/)
		.map((s) => s.replace(/^\./, "").toLowerCase().trim())
		.filter(Boolean);
}

export class AnythingAsMdSettingTab extends PluginSettingTab {
	plugin: AnythingAsMdPlugin;
	// show when extensions are changed. Clear when settings tab is reopened.
	private reloadHintEl: HTMLDivElement | null = null;
	private reloadHintVisible = false;

	constructor(app: App, plugin: AnythingAsMdPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// https://docs.obsidian.md/plugins/guides/migrate-declarative-settings
	getSettingDefinitions(): SettingDefinitionItem[] {
		this.reloadHintEl = null;
		this.reloadHintVisible = false;

		return [
			// Which extensions to add support for (whether just markdown view, or experimental full-md support)
			{
				name: "File extensions to open as Markdown",
				desc: "Comma-separated extensions to open as Markdown (e.g. Mdx, svx, rmd, qmd)",
				control: {
					type: "text",
					key: "extensionsList",
					placeholder: "E.g. Mdx, svx, rmd",
				},
			},
			// Experimental: treat these files like first-class .md notes
			{
				name: "Index non-Markdown files like notes (experimental)",
				// Fix lint error: Don't set innerHTML. Build description with DOM elements.
				desc: createFragment((frag) => {
					frag.createEl("strong", { text: "Dangerous, experimental. " });
					frag.createSpan({
						text: "Makes these files behave like normal .md notes. Tricks Obsidian into thinking they are .md files/caching them. May (probably will) break on future Obsidian versions. ",
					});
					frag.createEl("strong", { text: "Use at your own risk." });
				}),
				control: {
					type: "toggle",
					key: "indexLikeMarkdown",
				},
			},
			// Not a real setting, just a hidden hint div
			{
				name: "",
				searchable: false,
				visible: () => this.reloadHintVisible,
				render: (setting) => {
					setting.settingEl.empty();
					setting.settingEl.addClass("anything-as-md-reload-hint");
					this.reloadHintEl = setting.settingEl as HTMLDivElement;
				},
			},
		];
	}

	// save with plugin.saveSettings() and show reload hint
	async setControlValue(key: string, value: unknown): Promise<void> {
		await super.setControlValue(key, value);
		await this.plugin.saveSettings();
		this.reloadHintVisible = true;
		this.showReloadHint(key === "indexLikeMarkdown");
		this.refreshDomState();
	}

	// Show hint under settings: reload needed. Pass true to show warning when experimental toggle changed.
	private showReloadHint(showLabelsWarning: boolean): void {
		if (!this.reloadHintEl) return;
		this.reloadHintEl.empty();
		this.reloadHintEl.createSpan({
			text: "Reload the plugin to apply changes.",
			cls: "anything-as-md-reload-text",
		});

		// When experimental toggle changed: warn that labels behaviour might be bad until app restart
		if (showLabelsWarning) {
			const callout = this.reloadHintEl.createDiv({
				cls: "callout",
			});
			callout.setAttribute("data-callout", "warning");
			const content = callout.createDiv({ cls: "callout-content" });
			content.setText("Labels may not update correctly until Obsidian is restarted.");
		}

		const btn = this.reloadHintEl.createEl("button", {
			text: "Reload the plugin",
			cls: "mod-cta anything-as-md-reload-btn",
		});
		btn.addEventListener("click", () => this.reloadPlugin());
	}

	// Toggle plugin off then on so changes apply. Uses Obsidian's plugin manager.
	private reloadPlugin(): void {
		const app = this.app;
		const plugins = (app as { plugins?: { disablePlugin?: (id: string) => void; enablePlugin?: (id: string) => Promise<void> } }).plugins;
		if (!plugins?.disablePlugin || !plugins?.enablePlugin) {
			new Notice("Reload not supported: toggle this plugin off and on in community plugins.");
			return;
		}
		// schedule re-enable for after plugin disable
		window.setTimeout(() => {
			plugins
				.enablePlugin?.(PLUGIN_ID)
				?.then(() => {
					new Notice("Anything as Markdown reloaded.");
				})
				.catch(() => {});
		}, 0);
		plugins.disablePlugin(PLUGIN_ID);
	}
}
