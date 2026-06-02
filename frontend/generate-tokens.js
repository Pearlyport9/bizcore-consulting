const fs = require("fs");
const path = require("path");

const tokens = JSON.parse(
  fs.readFileSync(path.join(__dirname, "color tokens.json"), "utf-8")
);

const errorPalette = {
  "0": "hsl(0, 0%, 0%)",
  "10": "hsl(0, 74%, 12%)",
  "20": "hsl(0, 74%, 22%)",
  "30": "hsl(0, 74%, 32%)",
  "40": "hsl(0, 74%, 42%)",
  "50": "hsl(0, 74%, 52%)",
  "60": "hsl(0, 74%, 62%)",
  "70": "hsl(0, 74%, 72%)",
  "80": "hsl(0, 78%, 78%)",
  "90": "hsl(0, 78%, 90%)",
  "95": "hsl(0, 78%, 95%)",
  "99": "hsl(0, 78%, 99%)",
  "100": "hsl(0, 0%, 100%)",
};

const interpolated = {
  neutral: {
    "4": { from: "0", to: "10", weight: 0.4 },
    "6": { from: "0", to: "10", weight: 0.6 },
    "12": { from: "10", to: "20", weight: 0.2 },
    "17": { from: "10", to: "20", weight: 0.7 },
    "22": { from: "20", to: "30", weight: 0.2 },
    "24": { from: "20", to: "30", weight: 0.4 },
  },
};

function hslToObj(hsl) {
  const m = hsl.match(/hsl\(\s*(\d+),\s*(\d+)%,\s*(\d+)%\s*\)/);
  return m ? { h: +m[1], s: +m[2], l: +m[3] } : null;
}

function lerpHsl(a, b, t) {
  return `hsl(${Math.round(a.h + (b.h - a.h) * t)}, ${Math.round(a.s + (b.s - a.s) * t)}%, ${Math.round(a.l + (b.l - a.l) * t)}%)`;
}

function getPaletteValue(palette, tone) {
  if (tone === "key") return palette;
  const pal = tokens.color.palette[palette];
  if (pal && pal[tone]) return pal[tone];
  if (palette === "error" && errorPalette[tone]) return errorPalette[tone];
  if (pal && interpolated[palette] && interpolated[palette][tone]) {
    const { from, to, weight } = interpolated[palette][tone];
    const fromHSL = hslToObj(pal[from]);
    const toHSL = hslToObj(pal[to]);
    if (fromHSL && toHSL) return lerpHsl(fromHSL, toHSL, weight);
  }
  return null;
}

function resolveReference(ref) {
  const m = ref.match(/^{color\.(key|palette)\.([^.}+)\.?([^}]+)?}$/);
  if (!m) return ref;
  const [, type, palette, tone] = m;
  if (type === "key") {
    return tokens.color.key[palette] || ref;
  }
  if (type === "palette") {
    return getPaletteValue(palette, tone) || ref;
  }
  return ref;
}

function kebabCase(str) {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

function toCssVarName(segment) {
  return `--color-${segment.replace(/\./g, "-").replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

function toKebab(str) {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

const lines = [];
lines.push(":root {");

// palette vars
const paletteMap = tokens.color.palette;
for (const [palName, palValues] of Object.entries(paletteMap)) {
  for (const [tone, value] of Object.entries(palValues)) {
    const varName = toCssVarName(`${palName}.${tone}`);
    lines.push(`  ${varName}: ${value};`);
  }
}

// error palette
for (const [tone, value] of Object.entries(errorPalette)) {
  const varName = toCssVarName(`error.${tone}`);
  lines.push(`  ${varName}: ${value};`);
}

// key colors
for (const [name, value] of Object.entries(tokens.color.key)) {
  const varName = toCssVarName(`key.${name}`);
  lines.push(`  ${varName}: ${value};`);
}

lines.push("");

// role colors - light
const lightRoles = tokens.color.role.light;
for (const [role, ref] of Object.entries(lightRoles)) {
  const resolved = resolveReference(ref);
  const varName = toCssVarName(role);
  lines.push(`  ${varName}: ${resolved};`);
}

lines.push("}");
lines.push("");

// role colors - dark
const darkRoles = tokens.color.role.dark;
lines.push('[data-theme="dark"],');
lines.push(".dark {");
for (const [role, ref] of Object.entries(darkRoles)) {
  const resolved = resolveReference(ref);
  const varName = toCssVarName(role);
  lines.push(`  ${varName}: ${resolved};`);
}
lines.push("}");
lines.push("");

// media query fallback
lines.push("@media (prefers-color-scheme: dark) {");
lines.push("  :root:not([data-theme='light']) {");
for (const [role, ref] of Object.entries(darkRoles)) {
  const resolved = resolveReference(ref);
  const varName = toCssVarName(role);
  lines.push(`    ${varName}: ${resolved};`);
}
lines.push("  }");
lines.push("}");

const output = lines.join("\n");
fs.writeFileSync(path.join(__dirname, "tokens.css"), output, "utf-8");
console.log("Generated tokens.css");
