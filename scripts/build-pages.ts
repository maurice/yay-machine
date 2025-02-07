import { copyFile, exists, mkdir, readFile, readdir, rename, rm, watch, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Marked, type RendererObject } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { createHighlighter } from "shiki";
import { titleCase } from "title-case";

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

const files = (await readdir(docsDir, { recursive: true, withFileTypes: true })).filter(
  (it) => it.isFile() && it.name.endsWith(".md"),
);

process.stdout.write(`mkdir: ${pagesAssetsDir}\n`);
await mkdir(pagesAssetsDir, { recursive: true }).catch(() => true);

// setup a custom renderer for code blocks
const highlighter = await createHighlighter({
  themes: ["snazzy-light"],
  langs: ["sh", "typescript"],
});

const DECORATIONS_ANNOTATION = "// @decorations:";

const renderer: RendererObject = {
  code({ text, lang }) {
    if (lang === "mermaid") {
      return `<pre class="mermaid">${text}</pre>`;
    }
    return highlighter.codeToHtml(text, {
      lang: lang!,
      theme: "snazzy-light",
      transformers: [
        {
          preprocess(code, options) {
            if (!code.startsWith(DECORATIONS_ANNOTATION)) {
              return code;
            }

            const firstEol = code.indexOf("\n");
            const decorations = JSON.parse(code.slice(DECORATIONS_ANNOTATION.length, firstEol));

            options.decorations ||= [];
            options.decorations.push(...decorations);

            const newCode = code.slice(firstEol + 1);
            return newCode;
          },
        },
      ],
    });
  },
} as const;

async function buildPages() {
  await recursiveCopy(docsAssetsDir, pagesAssetsDir);
  await recursiveCopy("assets", pagesAssetsDir);

  const marked = new Marked();
  marked.use({ renderer });
  marked.setOptions({ gfm: true });
  marked.use(gfmHeadingId());

  const template = (await readFile("assets/pages-template.hbs")).toString();

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
    const slugNum: Record<string, number> = {};
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
        if (slug in slugNum) {
          slugNum[slug] += 1;
        } else {
          slugNum[slug] = 0;
        }
        return `<li class="level-${level}"><a class="jump-to-section" href="./${destFile}#${slug}${slugNum[slug] ? `-${slugNum[slug]}` : ""}">${headingHtml}</a></li>`;
      })
      .join("\n");

    const nav = (await marked.parse((await readFile(`${docsDir}/README.md`)).toString())).replaceAll('.md"', '.html"');

    const pageNavStart = nav.indexOf(`<a href="./${destFile}">`);
    const pageNavEnd = nav.indexOf("</li>", pageNavStart);
    let pageNav = [nav.slice(0, pageNavEnd + 5), headings, nav.slice(pageNavEnd + 5)].join("");

    pageNav = pageNav
      .replace(`<a href="./${destFile}">`, `<a class="menu-selected" href="./${destFile}">`)
      .replaceAll("/about.html", "/")
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
    process.stdout.write("waiting for changes...\n");
  }
}

watchDir("docs");
watchDir("assets");
watchDir(docsAssetsDir);
