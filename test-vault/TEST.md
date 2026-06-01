This code tests which files in the test vault are viewable, and which can be indexed by Obsidian. It switches settings in the config and reloads the plugin multiple times, with output for each like:

| (index)    | actualExt | viewable | indexed | correct |
| ---------- | --------- | -------- | ------- | ------- |
| README.rmd | 'rmd'     | 'N'      | 'N'     | 'Y'     |
| README.svx | 'svx'     | 'Y'      | 'Y'     | 'Y'     |
| README.mdx | 'mdx'     | 'Y'      | 'Y'     | 'Y'     |
| README.md  | 'md'      | 'Y'      | 'Y'     | 'Y'     |
Open `Developer Tools` with `Command/Ctrl + Option + I` and paste the whole block below into Console:

```
(async () => {
    const ID = 'anything-as-md';
    const parseExts = str => str.split(',').map(s => s.trim()).filter(Boolean);

    async function reload() {
        await app.plugins.disablePlugin(ID);
        await app.plugins.enablePlugin(ID);
    }

    function showStatus(label) {
        const { extensionsList, indexLikeMarkdown } = app.plugins.plugins[ID].settings;
        const exts = parseExts(extensionsList);
        console.log(`=== ${label} ===`);
        console.log('Extensions:', exts, '| Experimental:', indexLikeMarkdown);
        const mdSet = new Set(app.vault.getMarkdownFiles().map(f => f.path));
        const rows = {};
        app.vault.getFiles().forEach(f => {
            const isConfigured = exts.includes(f.extension);
            const viewable = app.viewRegistry.typeByExtension[f.extension] === 'markdown';
            const indexed = mdSet.has(f.path);
            const correctViewable = f.extension === 'md' ? viewable : isConfigured === viewable;
            const correctIndexed = f.extension === 'md' ? indexed : (indexLikeMarkdown ? isConfigured === indexed : !indexed);
            rows[f.path] = {
                actualExt: f.extension,
                viewable: viewable ? 'Y' : 'N',
                indexed: indexed ? 'Y' : 'N',
                correct: correctViewable && correctIndexed ? 'Y' : 'N'
            };
        });
        console.table(rows);
    }

    const label = (exts, experimental) =>
        `svx: ${exts.includes('svx') ? 'enabled' : 'disabled'}, experimental: ${experimental ? 'enabled' : 'disabled'}`;

    async function applyAndShow(mutate) {
        const plugin = app.plugins.plugins[ID];
        mutate(plugin.settings);
        await plugin.saveSettings();
        await reload();
        const { extensionsList, indexLikeMarkdown } = app.plugins.plugins[ID].settings;
        showStatus(label(parseExts(extensionsList), indexLikeMarkdown));
    }

    const initial = { ...app.plugins.plugins[ID].settings };

    await applyAndShow(s => {
        const exts = parseExts(s.extensionsList);
        if (!exts.includes('svx')) exts.push('svx');
        s.extensionsList = exts.join(', ');
        s.indexLikeMarkdown = true;
    });

    await applyAndShow(s => {
        s.extensionsList = parseExts(s.extensionsList).filter(e => e !== 'svx').join(', ');
    });

    await applyAndShow(s => {
        s.indexLikeMarkdown = false;
    });

    await applyAndShow(s => {
        s.extensionsList = initial.extensionsList;
        s.indexLikeMarkdown = initial.indexLikeMarkdown;
    });
})();
```
