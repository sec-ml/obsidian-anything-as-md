# Anything as md

Obsidian is great at markdown... that's what it does. But sometimes markdown &ne; `.md`.

There are a few plugins that add support for specfic extensions (`.mdx` probably being the most common), but `Anything as .md` allows you to enter a list of extensions that you want Obsidian to recognise as markdown syntax.

## What extensions are supported?

Well... any! But I guess for findability reasons, I'll list some:

- .mdx
- .svx
- .rmd
- .qmd
- .mdown
- .mkdn
- .mkd
- .mdwn
- .mdtxt
- .mdtext
- .myst
- .markua
- .pdc
- .pandoc

...you get the idea.

## Will Obsidian read my files correctly?

Markdown syntax will be understood and rendered correctly. I have no idea how other elements (jsx blocks, R code blocks, etc.) will fare. This plugin is solely for enabling visibility of the file, anything beyond that is up to you.

## How to contribute to this plugin

1. **Fork and clone**
   - [Fork this repo](https://github.com/sec-ml/anything-as-md/fork).
   - Clone your fork:
   ```bash
   git clone https://github.com/<your username>/anything-as-md.git
   cd anything-as-md
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   Node.js 16+ is required (`node --version`).

3. **Build the plugin**
   ```bash
   npm run build
   ```
   This compiles TypeScript to `main.js` (and runs type-checking).

4. **Copy into the test vault (for local testing)**
   ```bash
   npm run test-copy
   ```
   This copies `main.js`, `manifest.json`, and `styles.css` into `test-vault/.obsidian/plugins/anything-as-md/`.

5. **Try it in Obsidian**
   - Open the `test-vault` folder in this repo as a vault in Obsidian.
   - Go to **Settings → Community plugins** and enable **Anything as Markdown**.

6. **Develop**
   - Edit source in `src/` (e.g. `main.ts`, `settings.ts`).
   - Run `npm run build` then `npm run test-copy` to refresh the test vault, or use `npm run dev` for watch mode (rebuilds on save; run `npm run test-copy` when you want to update the test vault).
   - Run `npm run lint` to check code style.

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` from the latest release to your vault `VaultFolder/.obsidian/plugins/anything-as-md/`.