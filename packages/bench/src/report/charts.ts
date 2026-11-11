import {
  type BenchReport,
  type Library,
  libraries,
  type SuiteResult,
  type VariantResult,
} from "../types";

// Renders benchmark results as self-contained SVG "cards". They're rendered as
// <img> on the docs site, so: no external fonts/CSS, explicit sizes, and a
// card background that reads well on both light and dark themes.

const WIDTH = 820;
const PAD = 32;
const FONT =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

type Theme = "dark" | "light";

// Charts paint with `var(--bench-*)`. On the docs site the variables come from
// packages/site/src/styles/custom.css (keep in sync), so one inline SVG
// follows the theme toggle. Viewed standalone, the SVG's own <style> applies.
const palettes = {
  dark: {
    bg: "#17171b",
    bgTop: "#1f1f25",
    border: "#2f2f37",
    grid: "#2a2a31",
    axis: "#5a5a66",
    text: "#f4f4f5",
    muted: "#a1a1aa",
    faint: "#71717a",
    yay: "#f2b632",
    yayDeep: "#c98a06",
    accent: "#f2b632",
    xstate: "#8b95a7",
    xstateDeep: "#5f6879",
    slower: "#e0786b",
    even: "#a1a1aa",
  },
  light: {
    bg: "#ffffff",
    bgTop: "#fafaf8",
    border: "#e4e4e7",
    grid: "#ececef",
    axis: "#a1a1aa",
    text: "#18181b",
    muted: "#52525b",
    faint: "#71717a",
    yay: "#f2b632",
    yayDeep: "#d99a0b",
    accent: "#876600",
    xstate: "#a3acbb",
    xstateDeep: "#6b7588",
    slower: "#c2410c",
    even: "#71717a",
  },
} as const satisfies Record<Theme, Record<string, string>>;

type ColorName = keyof (typeof palettes)["dark"];

const cssVar = (name: ColorName) =>
  `--bench-${name.replaceAll(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

const color = Object.fromEntries(
  Object.keys(palettes.dark).map((name) => [
    name,
    `var(${cssVar(name as ColorName)})`,
  ]),
) as Record<ColorName, string>;

export const themeVars = (theme: Theme) =>
  Object.entries(palettes[theme]).map(
    ([name, value]) => [cssVar(name as ColorName), value] as const,
  );

const cssVars = (theme: Theme) =>
  themeVars(theme)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");

// `svg:root` only matches when the SVG is the document, not when inlined
const standaloneStyle = () => `
  <style>svg:root{${cssVars("dark")}}@media (prefers-color-scheme:light){svg:root{${cssVars("light")}}}</style>`;

// Inline SVGs share the page's id namespace, so ids are per-chart.
// Set by the exported render functions.
let idPrefix = "bench";
const id = (name: string) => `${idPrefix}-${name}`;
const ref = (name: string) => `url(#${id(name)})`;

// `var()` in presentation attributes isn't reliably supported, so move
// custom-property paints into a style attribute
const varsToStyle = (svg: string) =>
  svg.replaceAll(/<[a-zA-Z]+\b[^>]*>/g, (tag) => {
    const styles: string[] = [];
    const rest = tag.replaceAll(
      / (fill|stroke|stop-color)="(var\(--[\w-]+\))"/g,
      (_, property: string, value: string) => {
        styles.push(`${property}:${value}`);
        return "";
      },
    );
    return styles.length === 0
      ? rest
      : rest.replace(/\s*(\/?)>$/, ` style="${styles.join(";")}"$1>`);
  });

const escape = (content: string) =>
  content
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const round = (n: number) => Math.round(n * 10) / 10;

const wrap = (content: string, maxChars: number) => {
  const lines: string[] = [];
  let line = "";
  for (const word of content.split(" ")) {
    if (line && line.length + word.length + 1 > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  return line ? [...lines, line] : lines;
};

export const formatNumber = (n: number) => {
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ];
  for (const [size, suffix] of units) {
    if (n >= size) {
      const scaled = n / size;
      return `${scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0)}${suffix}`;
    }
  }
  return n.toFixed(n < 10 ? 2 : 0);
};

export const formatBytes = (n: number) =>
  n >= 1024 ? `${(n / 1024).toFixed(2)} KiB` : `${Math.round(n)} B`;

/** >1 means yay-machine is better (faster, or uses less memory) */
export const advantage = (variant: VariantResult) => {
  const { xstate, "yay-machine": yay } = variant.results;
  return variant.higherIsBetter
    ? yay.value / xstate.value
    : xstate.value / yay.value;
};

export const formatRatio = (ratio: number) =>
  `${ratio.toFixed(ratio < 10 ? 1 : 0)}×`;

const verdict = (variant: VariantResult) => {
  const ratio = advantage(variant);
  if (ratio >= 0.95 && ratio <= 1.05) {
    return { text: "≈ even", fill: color.even };
  }
  const better = variant.higherIsBetter ? "faster" : "less memory";
  const worse = variant.higherIsBetter ? "slower" : "more memory";
  return ratio > 1
    ? { text: `${formatRatio(ratio)} ${better}`, fill: color.accent }
    : { text: `${formatRatio(1 / ratio)} ${worse}`, fill: color.slower };
};

const defs = () => `
  <defs>
    <linearGradient id="${id("card")}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color.bgTop}"/>
      <stop offset="1" stop-color="${color.bg}"/>
    </linearGradient>
    <linearGradient id="${id("yay")}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${color.yayDeep}"/>
      <stop offset="1" stop-color="${color.yay}"/>
    </linearGradient>
    <linearGradient id="${id("xstate")}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${color.xstateDeep}"/>
      <stop offset="1" stop-color="${color.xstate}"/>
    </linearGradient>
  </defs>`;

interface TextOptions {
  readonly size?: number;
  readonly fill?: string;
  readonly weight?: number;
  readonly anchor?: "start" | "middle" | "end";
  readonly family?: string;
}

const text = (
  x: number,
  y: number,
  content: string,
  {
    size = 13,
    fill = color.text,
    weight = 400,
    anchor = "start",
    family = FONT,
  }: TextOptions = {},
) =>
  `<text x="${round(x)}" y="${round(y)}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escape(content)}</text>`;

const legend = (right: number, y: number) =>
  [
    `<rect x="${right - 186}" y="${y - 10}" width="12" height="12" rx="3" fill="${ref("yay")}"/>`,
    text(right - 168, y, "yay-machine", { size: 12, fill: color.muted }),
    `<rect x="${right - 64}" y="${y - 10}" width="12" height="12" rx="3" fill="${ref("xstate")}"/>`,
    text(right, y, "XState", { size: 12, fill: color.muted, anchor: "end" }),
  ].join("");

// `git describe` output, eg "v1.5.0-12-gabc1234-dirty" -> "v1.5.0+12 (abc1234*)"
const formatGitVersion = (version: string) => {
  const match = /^(v?[\d.]+)-(\d+)-g([\da-f]+)(-dirty)?$/.exec(version);
  return match
    ? `${match[1]}+${match[2]} (${match[3]}${match[4] ? "*" : ""})`
    : version;
};

const footerLines = (report: BenchReport) => [
  [
    `yay-machine ${formatGitVersion(report.packages["yay-machine"])}`,
    `xstate ${report.packages.xstate}`,
    report.environment.runtime,
    report.generatedAt.slice(0, 10),
  ].join("  ·  "),
  [
    `${report.environment.cpu}, ${report.environment.cores} cores, ${report.environment.memoryGb} GB`,
    report.environment.os
      .replace(/ \S*microsoft\S*/i, " (WSL2)")
      .replace(/ \d[\d.]*\S*/, ""),
    ...(report.quick ? ["QUICK RUN: indicative only"] : []),
  ].join("  ·  "),
];

const FOOTER_HEIGHT = 58;

const SUBTITLE_TOP = 68;
const SUBTITLE_LINE = 18;

/** y coordinate where the body of a card can start */
const bodyTop = (subtitleLines: number) =>
  SUBTITLE_TOP + (subtitleLines - 1) * SUBTITLE_LINE + 40;

const card = ({
  height,
  title,
  subtitle,
  body,
  report,
  description,
  showLegend = true,
}: {
  height: number;
  title: string;
  subtitle: readonly string[];
  body: string;
  report: BenchReport;
  description: string;
  showLegend?: boolean;
}) =>
  varsToStyle(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-labelledby="${id("title")} ${id("desc")}">
  <title id="${id("title")}">${escape(title)}</title>
  <desc id="${id("desc")}">${escape(description)}</desc>${standaloneStyle()}${defs()}
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="14" fill="${ref("card")}" stroke="${color.border}"/>
  <rect x="${PAD}" y="0.5" width="64" height="3" rx="1.5" fill="${ref("yay")}"/>
  ${text(PAD, 44, title, { size: 21, weight: 650 })}
  ${subtitle.map((line, i) => text(PAD, SUBTITLE_TOP + i * SUBTITLE_LINE, line, { size: 13, fill: color.muted })).join("\n  ")}
  ${showLegend ? legend(WIDTH - PAD, 40) : ""}
  ${body}
  <line x1="${PAD}" y1="${height - FOOTER_HEIGHT + 4}" x2="${WIDTH - PAD}" y2="${height - FOOTER_HEIGHT + 4}" stroke="${color.grid}"/>
  ${footerLines(report)
    .map((line, i) =>
      text(PAD, height - 32 + i * 15, line, { size: 10.5, fill: color.faint }),
    )
    .join("\n  ")}
</svg>
`);

const describeVariant = (suite: SuiteResult, variant: VariantResult) => {
  const { xstate, "yay-machine": yay } = variant.results;
  const fmt = variant.higherIsBetter
    ? (n: number) => `${formatNumber(n)} ${variant.unit}`
    : (n: number) => `${formatBytes(n)} per instance`;
  return `${suite.title}, ${variant.label}: yay-machine ${fmt(yay.value)}, XState ${fmt(xstate.value)}; ${verdict(variant).text}.`;
};

// ---------------------------------------------------------------------------
// Overview: one row per variant, showing yay-machine's advantage on a log axis

const niceTicks = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];

export const renderOverview = (report: BenchReport) => {
  idPrefix = "bench-overview";
  const groups = [
    {
      title: "Realistic workloads",
      suites: report.suites.filter((s) => s.category === "workload"),
    },
    {
      title: "Feature micro-benchmarks",
      suites: report.suites.filter((s) => s.category === "micro"),
    },
  ].filter((group) => group.suites.length);

  const ratios = report.suites.flatMap((s) => s.variants.map(advantage));
  const lo =
    niceTicks.toReversed().find((t) => t <= Math.min(1, ...ratios) * 0.9) ??
    niceTicks[0];
  const hi =
    niceTicks.find((t) => t >= Math.max(1, ...ratios) * 1.15) ??
    niceTicks.at(-1)!;
  const ticks = niceTicks.filter((t) => t >= lo && t <= hi);

  const subtitle = [
    "How many times faster (or leaner) yay-machine is than XState for each benchmark.",
    "Log scale · 1× = parity · bars left of 1× would mean XState is ahead",
  ];
  const labelWidth = 300;
  const x0 = PAD + labelWidth;
  const x1 = WIDTH - PAD - 64;
  const scale = (v: number) =>
    x0 +
    ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * (x1 - x0);

  const rowHeight = 38;
  const rowsStart = bodyTop(subtitle.length) + 8;
  let y = rowsStart;
  const parts: string[] = [];

  groups.forEach((group, groupIndex) => {
    if (groupIndex > 0) {
      y += 18;
    }
    parts.push(
      `<rect x="${PAD}" y="${y - 2}" width="${WIDTH - PAD * 2}" height="22" rx="6" fill="${color.yay}" fill-opacity="0.06"/>`,
      text(PAD + 10, y + 13, group.title.toUpperCase(), {
        size: 11,
        weight: 700,
        fill: color.accent,
      }),
    );
    y += 26;
    for (const suite of group.suites) {
      for (const variant of suite.variants) {
        const ratio = advantage(variant);
        const cy = y + rowHeight / 2;
        const barStart = scale(Math.min(1, ratio));
        const barEnd = scale(Math.max(1, ratio));
        const ahead = ratio >= 1;
        const label = `${formatRatio(ratio)}${variant.higherIsBetter ? "" : " less memory"}`;
        parts.push(
          text(PAD, cy - 2, suite.title, { size: 13, weight: 600 }),
          text(PAD, cy + 14, variant.label, { size: 11.5, fill: color.muted }),
          `<rect x="${round(barStart)}" y="${round(cy - 8)}" width="${round(Math.max(2, barEnd - barStart))}" height="16" rx="4" fill="${ahead ? ref("yay") : color.slower}"/>`,
          text(ahead ? barEnd + 8 : barStart - 8, cy + 4.5, label, {
            size: 12.5,
            weight: 700,
            family: MONO,
            anchor: ahead ? "start" : "end",
            fill: ahead ? color.text : color.slower,
          }),
        );
        y += rowHeight;
      }
    }
  });
  const rowsEnd = y + 4;

  const grid = ticks
    .map((t) => {
      const x = round(scale(t));
      const isOne = t === 1;
      return [
        `<line x1="${x}" y1="${rowsStart + 22}" x2="${x}" y2="${rowsEnd}" stroke="${isOne ? color.axis : color.grid}" stroke-width="${isOne ? 1.5 : 1}"${isOne ? "" : ' stroke-dasharray="2 4"'}/>`,
        text(x, rowsEnd + 16, `${t}×`, {
          size: 11,
          fill: isOne ? color.text : color.faint,
          anchor: "middle",
          family: MONO,
        }),
      ].join("");
    })
    .join("");

  return card({
    height: rowsEnd + 30 + FOOTER_HEIGHT,
    title: "yay-machine vs XState: all benchmarks",
    showLegend: false,
    subtitle,
    body: grid + parts.join(""),
    report,
    description: report.suites
      .flatMap((suite) =>
        suite.variants.map((variant) => describeVariant(suite, variant)),
      )
      .join(" "),
  });
};

// ---------------------------------------------------------------------------
// Suite detail: absolute values for both libraries, per variant

const valueLabel = (variant: VariantResult, library: Library) => {
  const result = variant.results[library];
  return variant.higherIsBetter
    ? `${formatNumber(result.value)} ${variant.unit} ±${result.rme.toFixed(1)}%`
    : `${formatBytes(result.value)} ±${result.rme.toFixed(1)}%`;
};

export const renderSuite = (report: BenchReport, suite: SuiteResult) => {
  idPrefix = `bench-${suite.id}`;
  const subtitle = wrap(suite.description, 104);
  const labelWidth = 220;
  const pillWidth = 164;
  // monospace glyphs at 11.5px are ~0.6em wide
  const valueWidth = Math.max(
    ...suite.variants.flatMap((v) =>
      libraries.map((library) => valueLabel(v, library).length * 6.9),
    ),
  );
  const x0 = PAD + labelWidth;
  const x1 = Math.max(x0 + 120, WIDTH - PAD - pillWidth - 16 - 8 - valueWidth);
  const max = Math.max(
    ...suite.variants.flatMap((v) => [
      v.results.xstate.value,
      v.results["yay-machine"].value,
    ]),
  );
  const scale = (v: number) => (v / max) * (x1 - x0);

  const top = bodyTop(subtitle.length);
  const barHeight = 18;
  // label column is ~208px: ~26 bold 13px chars, or ~32 muted 11.5px chars
  const groups = suite.variants.map((variant) => {
    const labelLines = wrap(variant.label, 26);
    const noteLines = wrap(
      variant.op ? `1 op = ${variant.op}` : `${variant.unit}, lower is better`,
      32,
    );
    const height = Math.max(
      72,
      labelLines.length * 16 + noteLines.length * 14 + 28,
    );
    return { variant, labelLines, noteLines, height };
  });
  const parts: string[] = [];

  let y = top;
  groups.forEach(({ variant, labelLines, noteLines, height }, index) => {
    if (index > 0) {
      parts.push(
        `<line x1="${PAD}" y1="${y - 14}" x2="${WIDTH - PAD}" y2="${y - 14}" stroke="${color.grid}" stroke-dasharray="2 4"/>`,
      );
    }
    parts.push(
      ...labelLines.map((line, i) =>
        text(PAD, y + 14 + i * 16, line, { size: 13, weight: 600 }),
      ),
      ...noteLines.map((line, i) =>
        text(PAD, y + 14 + labelLines.length * 16 + i * 14, line, {
          size: 11.5,
          fill: color.muted,
        }),
      ),
    );
    (["yay-machine", "xstate"] as const).forEach((library, row) => {
      const result = variant.results[library];
      const by = y + row * (barHeight + 8);
      const width = Math.max(2, scale(result.value));
      parts.push(
        `<rect x="${x0}" y="${by}" width="${round(x1 - x0)}" height="${barHeight}" rx="5" fill="${color.grid}" fill-opacity="0.5"/>`,
        `<rect x="${x0}" y="${by}" width="${round(width)}" height="${barHeight}" rx="5" fill="${ref(library === "xstate" ? "xstate" : "yay")}"/>`,
        text(x0 + width + 8, by + 13.5, valueLabel(variant, library), {
          size: 11.5,
          family: MONO,
          fill: color.muted,
        }),
      );
    });
    const v = verdict(variant);
    const px = WIDTH - PAD - pillWidth;
    parts.push(
      `<rect x="${px}" y="${y + 6}" width="${pillWidth}" height="30" rx="15" fill="${v.fill}" fill-opacity="0.12" stroke="${v.fill}" stroke-opacity="0.55"/>`,
      text(px + pillWidth / 2, y + 26, v.text, {
        size: 13,
        weight: 700,
        fill: v.fill,
        anchor: "middle",
      }),
    );
    y += height;
  });

  const kind = suite.category === "workload" ? "Workload" : "Micro-benchmark";
  return card({
    height: y - 10 + FOOTER_HEIGHT,
    title: `${kind}: ${suite.title}`,
    subtitle,
    body: parts.join(""),
    report,
    description: `${suite.description} ${suite.variants.map((variant) => describeVariant(suite, variant)).join(" ")}`,
  });
};
