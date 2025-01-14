import { cp, exists, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import hljs from "highlight.js";
import { Marked } from "marked";
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
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);

for (const file of files) {
  const sourceFile = `${file.parentPath}/${file.name}`;
  const contents = (await readFile(sourceFile)).toString();
  let title: string = titleCase(file.name);
  if (contents.startsWith("#")) {
    const titleStart = contents.indexOf(" ");
    const titleEnd = contents.indexOf("\n");
    title = contents.slice(titleStart, titleEnd);
  }

  const destFile = `${pagesDir}/${sourceFile.substring(5).replace(".md", ".html")}`;
  const depth = destFile.split("/").length - 1;
  const assetsPath = `${depth === 1 ? "./" : "../".repeat(depth - 1)}assets`;

  let html = await marked.parse(contents);
  html = html.replace(/href="[^"]+.md"/g, (match) => {
    const [, link] = /href="([^"]+).md"/.exec(match)!;
    return `href="${link}.html"`;
  });

  const guidedPathNavigationStart = html.indexOf("<!-- GUIDED PATH NAVIGATION -->");
  if (guidedPathNavigationStart !== -1) {
    const ulStart = html.indexOf("<ul>", guidedPathNavigationStart);
    html = `${html.slice(0, ulStart)}<ul class="guided-path-navigation">${html.slice(ulStart + 4)}`;
  }

  html = `
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${title} - yay-machine</title>
    <!-- todo extract this from metadata -->
    <meta name="description" content="yay-machine" />
    <link href="${assetsPath}/styles.css" rel="stylesheet" />
    <link href="${assetsPath}/rose-pine-dawn.css" rel="stylesheet" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet" />
  </head>
  <body>
${html}
  </body>
</html>
`;
  const destDir = dirname(destFile);
  await mkdir(destDir, { recursive: true });
  await writeFile(destFile, html);
}

await cp("./node_modules/highlight.js/styles", pagesAssetsDir, { recursive: true });
await rename(`${pagesDir}/about.html`, `${pagesDir}/index.html`);
await rename(`${pagesDir}/reference/readme.html`, `${pagesDir}/reference/index.html`);
await writeFile(
  `${pagesAssetsDir}/styles.css`,
  `
* {
    box-sizing: border-box;
}
    
body {
  font-family: sans-serif;
  padding: 3em;
  color: #1f2e28;
  line-height: 1.5;
}

h1, h2, h3, h4, h5 {
  font-family: "Pacifico", serif;
  font-weight: 400;
  font-style: normal;
}

h1 {
  font-size: 2.8em;
}

h2 {
  font-size: 2em;
}

h3 {
  font-size: 1.5em;
}

h4 {
  font-size: 1.17em;
}

h5 {
  font-size: 1em;
}

h1, h2 {
  border-bottom: 1px solid #ffde59;
  padding-bottom: 0.1em;
}

blockquote {
  margin: 0;
  padding: 0 1em;
  border-left: 3px solid #ffde59;
}

hr {
  height: 1px;
  background-color: #ffde59;
  border: none;
}

code:not(.hljs) {
  background-color: #faf4ed; /* TODO sync with highlight.js theme */
  padding: 0 0.3em;
}

pre {
  line-height: 1.45;
}

ul:not(.guided-path-navigation) {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 1em;

  li+li {
    margin-top: .5em;
  }
}

a {
  color: chocolate;
}

img {
  max-width: 100%;
  height: auto;
}

ul.guided-path-navigation {
  list-style: none;
  display: flex;
  gap: 1em;
  justify-content: center;

  li {
    display: inline-block;

    a {
      padding: 0.4em;
      border: 1px solid #ffde59;
      border-radius: 4px;
      text-decoration: none;
      color: #1f2e28;
      transition: background 0.5s;
      
      &:hover {
        background: #ffde59;
      }
    }
  }
}
`,
);
