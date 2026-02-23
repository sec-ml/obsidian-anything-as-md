import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type AnythingAsMdPlugin from "./main";

const PLUGIN_ID = "anything-as-md";

export interface AnythingAsMdSettings {
	/** comma-separated list of file extensions to treat as markdown (e.g. mdx, svx, rmd) */
	extensionsList: string;
}

export const DEFAULT_SETTINGS: AnythingAsMdSettings = {
	extensionsList: "mdx, svx, rmd",
};

/**
 * parse and normalise extensions from saved string: lowercase (checked that casing is
 * ignored by Obsidian), no leading dot, non-empty.
 * Used for both registration and display.
 */
export function parseExtensionsList(raw: string): string[] {
	return raw
		.split(/[\s,]+/)
		.map((s) => s.replace(/^\./, "").toLowerCase().trim())
		.filter(Boolean);
}

export class AnythingAsMdSettingTab extends PluginSettingTab {
	plugin: AnythingAsMdPlugin;
	/** show when extensions are changed. Clear when settings tab is reopened. */
	private reloadHintEl: HTMLDivElement | null = null;

	constructor(app: App, plugin: AnythingAsMdPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		this.reloadHintEl = null;

		new Setting(containerEl)
			.setName("File extensions to open as Markdown")
			.setDesc(
				"Comma-separated extensions to open as Markdown (e.g.: mdx, svx, rmd, qmd)"
			)
			.addText((text) =>
				text
					.setPlaceholder("E.g.: mdx, svx, rmd")
					.setValue(this.plugin.settings.extensionsList)
					.onChange(async (value) => {
						this.plugin.settings.extensionsList = value;
						await this.plugin.saveSettings();
						this.showReloadHint();
					})
			);

		this.reloadHintEl = containerEl.createDiv({ cls: "anything-as-md-reload-hint" });
		this.reloadHintEl.setCssProps({ display: "none" });
	}

	private showReloadHint(): void {
		if (!this.reloadHintEl) return;
		this.reloadHintEl.empty();
		this.reloadHintEl.setCssProps({ display: "block" });
		this.reloadHintEl.createSpan({
			text: "Reload the plugin to apply changes.",
			cls: "anything-as-md-reload-text",
		});
		const btn = this.reloadHintEl.createEl("button", {
			text: "Reload the plugin",
			cls: "mod-cta anything-as-md-reload-btn",
		});
		btn.addEventListener("click", () => this.reloadPlugin());
	}

	private reloadPlugin(): void {
		const app = this.app;
		const plugins = (app as { plugins?: { disablePlugin?: (id: string) => void; enablePlugin?: (id: string) => Promise<void> } }).plugins;
		if (!plugins?.disablePlugin || !plugins?.enablePlugin) {
			new Notice("Reload not supported: toggle this plugin off and on in community plugins.");
			return;
		}
		// schedule re-enable for after plugin disable
		setTimeout(() => {
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
