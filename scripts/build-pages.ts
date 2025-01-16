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

  html = `
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${title} - yay-machine</title>
    <!-- todo extract this from metadata -->
    <meta name="description" content="yay-machine" />
    <link rel="icon" href="${assetsPath}/icon.png" />
    <link href="${assetsPath}/styles.css" rel="stylesheet" />
    <link href="${assetsPath}/highlight_js/rose-pine-dawn.css" rel="stylesheet" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet" />
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true });
</script>
  </head>
  <body>
    <header>
      <a href="https://maurice.github.io/yay-machine/"><img src="${assetsPath}/yay-machine.png" alt="Logo" width="300px"></a>
      <aside>
        <a href="https://github.com/maurice/yay-machine" title="GitHub"><img src="${assetsPath}/github-logo.svg" class="icon-link"></a>
        <a href="https://www.npmjs.com/package/yay-machine" title="NPM"><img src="${assetsPath}/package.svg" class="icon-link"></a>
      </aside>
    </header>
    <section>
      <nav>
        <div class="nav-spacer"></div>
        <div class="menu">
        ${pageNav}
        </div>
      </nav>
      <div class="body-content">
        <article>
          ${html}
        </article>
      </div>
    </section>
  </body>
</html>
`;
  const destDir = dirname(destFile);
  await mkdir(`pages/${destDir}`, { recursive: true });
  await writeFile(`pages/${destFile}`, html);
}

await cp("assets", pagesAssetsDir, { recursive: true });
const highlightStylesDir = `${pagesAssetsDir}/highlight_js`;
await mkdir(highlightStylesDir, { recursive: true });
await cp("./node_modules/highlight.js/styles", highlightStylesDir, { recursive: true });
await rename(`${pagesDir}/about.html`, `${pagesDir}/index.html`);
