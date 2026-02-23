import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, parseExtensionsList } from "./settings";
import type { AnythingAsMdSettings } from "./settings";
import { AnythingAsMdSettingTab } from "./settings";

export default class AnythingAsMdPlugin extends Plugin {
	settings: AnythingAsMdSettings;

	async onload() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<AnythingAsMdSettings>
		);

		const extensions = parseExtensionsList(this.settings.extensionsList);
		if (extensions.length > 0) {
			this.registerExtensions(extensions, "markdown");
		}

		this.addSettingTab(new AnythingAsMdSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<AnythingAsMdSettings>
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
