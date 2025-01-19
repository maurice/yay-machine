import { copyFile, exists, mkdir, readFile, readdir, rename, rm, watch, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import hljs from "highlight.js";
import { Marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { markedHighlight } from "marked-highlight";
import { titleCase } from "title-case";
import { renderMermaid } from "./render-mermaid";

const recursiveCopy = async (fromDir: string, toDir: string) => {
  const files = (await readdir(fromDir, { recursive: true, withFileTypes: true })).filter((it) => it.isFile());
  for (const file of files) {
    const relativePath = file.parentPath.slice(fromDir.length + 1);
    const destDir = [toDir, relativePath].join("/");
    if (!(await exists(destDir))) {
      process.stdout.write(`mkdir: ${destDir}`);
    }
    const sourceFile = `${file.parentPath}/${file.name}`;
    process.stdout.write(`cp: ${sourceFile} -> ${destDir}\n`);
    if (!(await exists(destDir))) {
      await mkdir(destDir, { recursive: true });
    }
    await copyFile(sourceFile, `${destDir}/${file.name}`);
  }
};

const docsDir = "docs";
const docsAssetsDir = `${docsDir}/assets`;
const pagesDir = "pages";
const pagesAssetsDir = `${pagesDir}/assets`;

if (await exists(pagesDir)) {
  await rm(pagesDir, { recursive: true });
}

const highlightStylesDir = `${pagesAssetsDir}/highlight_js`;
await recursiveCopy("./node_modules/highlight.js/styles", highlightStylesDir);

const files = (await readdir(docsDir, { recursive: true, withFileTypes: true })).filter(
  (it) => it.isFile() && it.name.endsWith(".md"),
);

process.stdout.write(`mkdir: ${pagesAssetsDir}\n`);
await mkdir(pagesAssetsDir, { recursive: true }).catch(() => true);

async function buildPages() {
  await recursiveCopy(docsAssetsDir, pagesAssetsDir);
  await recursiveCopy("assets", pagesAssetsDir);

  const marked = new Marked(
    markedHighlight({
      emptyLangClass: "hljs",
      langPrefix: "hljs language-",
      highlight(code, lang) {
        // if (lang === "mermaid") {
        //   return `<pre class="mermaid">${code}</pre>`;
        // }
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

  const template = (await readFile("assets/pages-template.hb")).toString();

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
    process.stdout.write(`transform: ${sourceFile} -> ${destFile}\n`);
    const depth = destFile.split("/").length - 1;
    const relativeRoot = `${depth === 0 ? "./" : "../".repeat(depth)}`;
    const assetsPath = `${relativeRoot}assets`;

    const headingMarked = new Marked();
    const sourceMarkdown = (await readFile(sourceFile)).toString();
    const headings = sourceMarkdown
      .split("\n")
      .filter((it) => it.startsWith("##"))
      .map((it) => {
        const level = it.indexOf(" ");
        const heading = it.slice(level + 1);
        const headingHtml = (headingMarked.parse(heading) as string).slice(3, -5);
        const slug = heading
          .toLocaleLowerCase()
          .replaceAll(/[`,:()/.']/g, "")
          .replaceAll(" ", "-");
        return `<li class="level-${level}"><a class="jump-to-section" href="./${destFile}#${slug}">${headingHtml}</a></li>`;
      })
      .join("\n");

    const pageNavStart = nav.indexOf(`<a href="./${destFile}">`);
    const pageNavEnd = nav.indexOf("</li>", pageNavStart);
    let pageNav = [nav.slice(0, pageNavEnd + 5), headings, nav.slice(pageNavEnd + 5)].join("");

    pageNav = pageNav
      .replace(`<a href="./${destFile}">`, `<a class="menu-selected" href="./${destFile}">`)
      .replaceAll("/about.html", "/")
      .replaceAll('href="./', `href="${relativeRoot}`);

    let html = await marked.parse(contents);

    let mermaidNum = 0;
    let mermaidEnd = 0;
    while (true) {
      const mermaidStart = html.indexOf('<pre><code class="hljs language-mermaid">', mermaidEnd);
      if (mermaidStart === -1) {
        break;
      }
      mermaidEnd = html.indexOf("</code></pre>", mermaidStart);
      const mermaidText = html
        .slice(mermaidStart + 41, mermaidEnd)
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">");
      const svgFileName = `${file.name.slice(0, -3)}-${++mermaidNum}.svg`;
      await renderMermaid(mermaidText, `${pagesAssetsDir}/${svgFileName}`);
      html = `${html.slice(0, mermaidStart)}
<img src="${assetsPath}/${svgFileName}" />
${html.slice(mermaidEnd + 13)}`;
    }

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
    await mkdir(`pages/${destDir}`, { recursive: true }).catch(() => true);
    await writeFile(`pages/${destFile}`, page);
  }

  await rename(`${pagesDir}/about.html`, `${pagesDir}/index.html`);
}

await buildPages();

const args = process.argv.slice(2);

const watchMode = args.includes("--watch");
if (!watchMode) {
  process.exit(0);
}

process.on("SIGINT", () => {
  // close watcher when Ctrl-C is pressed
  process.stdout.write("Closing watcher...\n");

  process.exit(0);
});

async function watchDir(dir: string) {
  for await (const info of watch(dir, { recursive: true })) {
    process.stdout.write(`file change: ${dir}/${info.filename}\n`);
    await buildPages();
  }
}

watchDir("docs");
watchDir("assets");
watchDir(docsAssetsDir);
