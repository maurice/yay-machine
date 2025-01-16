import { cp, exists, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import hljs from "highlight.js";
import { Marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { markedHighlight } from "marked-highlight";
import { titleCase } from "title-case";

const docsDir = "docs";
const docsAssetsDir = `${docsDir}/assets`;
const pagesDir = "pages";
const pagesAssetsDir = `${pagesDir}/assets`;

const files = (await readdir(docsDir, { recursive: true, withFileTypes: true })).filter(
  (it) => it.isFile() && it.name.endsWith(".md"),
);

if (await exists(pagesDir)) {
  await rm(pagesDir, { recursive: true });
}

await mkdir(pagesAssetsDir, { recursive: true });
await cp(docsAssetsDir, pagesAssetsDir, { recursive: true });

const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang === "mermaid") {
        return `<pre class="mermaid">${code}</pre>`;
      }
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);

const nav = (await marked.parse((await readFile(`${docsDir}/README.md`)).toString())).replaceAll('.md"', '.html"');

marked.setOptions({
  gfm: true,
});

marked.use(gfmHeadingId());

const template = (await readFile(`${docsAssetsDir}/pages-template.html`)).toString();

for (const file of files) {
  if (file.name === "README.md") {
    continue;
  }
  const sourceFile = `${file.parentPath}/${file.name}`;
  const contents = (await readFile(sourceFile)).toString();
  let title: string = titleCase(file.name.slice(0, -3));
  if (contents.startsWith("#")) {
    const titleStart = contents.indexOf(" ");
    const titleEnd = contents.indexOf("\n");
    title = contents.slice(titleStart, titleEnd).replace(/[*`]/g, "");
  }
  title = file.parentPath
    .split("/")
    .slice(1)
    .map((it) => titleCase(it))
    .toSpliced(0, 0, title)
    .join(" - ")
    .trim();

  const destFile = `${sourceFile.substring(5).replace(".md", ".html")}`;
  const depth = destFile.split("/").length - 1;
  const relativeRoot = `${depth === 0 ? "./" : "../".repeat(depth)}`;
  const assetsPath = `${relativeRoot}assets`;

  const pageNav = nav
    .replace("about.html", "")
    .replace(`<a href="./${destFile}">`, `<a class="menu-selected" href="./${destFile}">`)
    .replaceAll('href="./', `href="${relativeRoot}`);

  let html = await marked.parse(contents);
  html = html.replace(/href="[^"]+.md"/g, (match) => {
    const [, link] = /href="([^"]+).md"/.exec(match)!;
    return `href="${link}.html"`;
  });

  html = html.replace(/<h[12345] id="[^"]+">(.+)<\/h[12345]>/g, (match) => {
    const [, level, id, title] = /<h([12345]) id="([^"]+)">(.+)<\/h[12345]>/.exec(match)!;
    return `<h${level} id="${id}">${title}<a class="header-anchor" href="#${id}">#</a></h${level}>`;
  });

  const guidedPathNavigationStart = html.indexOf("<!-- GUIDED PATH NAVIGATION -->");
  if (guidedPathNavigationStart !== -1) {
    const ulStart = html.indexOf("<ul>", guidedPathNavigationStart);
    html = `${html.slice(0, ulStart)}<ul class="guided-path-navigation">${html.slice(ulStart + 4)}`;
    html = html.replace("Previous page:", '<p class="prev-next">Previous page</p>');
    html = html.replace("Next page:", '<p class="prev-next">Next page</p>');
  }

  const variables = {
    title,
    assetsPath,
    pageNav,
    html,
  };

  let page = template;
  for (const [name, value] of Object.entries(variables)) {
    page = page.replaceAll(`{{ ${name} }}`, value);
  }

  const destDir = dirname(destFile);
  await mkdir(`pages/${destDir}`, { recursive: true });
  await writeFile(`pages/${destFile}`, page);
}

await cp("assets", pagesAssetsDir, { recursive: true });
const highlightStylesDir = `${pagesAssetsDir}/highlight_js`;
await mkdir(highlightStylesDir, { recursive: true });
await cp("./node_modules/highlight.js/styles", highlightStylesDir, { recursive: true });
await rename(`${pagesDir}/about.html`, `${pagesDir}/index.html`);
