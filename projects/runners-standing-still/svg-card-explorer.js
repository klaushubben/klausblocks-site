const SVG_NS = "http://www.w3.org/2000/svg";

const els = {
  wrap: document.querySelector("[data-card-wrap]"),
  controls: document.querySelector("[data-controls]"),
  readout: document.querySelector("[data-readout]"),
  randomHash: document.querySelector("[data-random-hash]"),
};

const controls = Object.fromEntries(
  [...document.querySelectorAll("[data-control]")].map((el) => [el.dataset.control, el]),
);

const LEON_DIGITS = {
  "0": { w: 1.0645, d: "M0.375,0C0.375,0.2761 0.2072,0.5 0,0.5C-0.2072,0.5 -0.375,0.2761 -0.375,0C-0.375,-0.2761 -0.2072,-0.5 0,-0.5C0.2072,-0.5 0.375,-0.2761 0.375,0" },
  "1": { w: 0.6129, d: "M-0.1056,-0.3472L0.0972,-0.4889L0.1056,-0.4889L0.1056,0.4889" },
  "2": { w: 0.9355, d: "M-0.2808,-0.3033C-0.2453,-0.4139 -0.1411,-0.4858 -0.0189,-0.4939C0.13,-0.5036 0.2875,-0.3881 0.2608,-0.2164C0.2558,-0.1839 0.2539,-0.0989 -0.0097,0.1589C-0.26,0.4033 -0.2917,0.4861 -0.2917,0.4861L-0.2917,0.4861L-0.2917,0.4944L0.2917,0.4944" },
  "3": { w: 0.9355, d: "M-0.2787,-0.3158C-0.2774,-0.32 -0.276,-0.3242 -0.2743,-0.3283C-0.2368,-0.4281 -0.1293,-0.5 -0.0026,-0.5C0.1554,-0.5 0.2835,-0.3881 0.2835,-0.25C0.2835,-0.1119 0.1554,0 -0.0026,-0.0003L-0.0304,-0.0003L-0.0026,0C0.1693,0 0.3085,0.1119 0.3085,0.25C0.3085,0.3881 0.1693,0.5 -0.0026,0.5C-0.1504,0.5 -0.274,0.4172 -0.3057,0.3064" },
  "4": { w: 0.9613, d: "M0.1583,0.4889L0.1583,-0.4889L0.15,-0.4889L-0.3278,0.2694L-0.3278,0.2778L0.3278,0.2778" },
  "5": { w: 0.9613, d: "M-0.2896,0.3269C-0.2471,0.4328 -0.1446,0.495 -0.0187,0.4944C0.1524,0.4936 0.2829,0.3581 0.2896,0.1744C0.2963,-0.0114 0.1624,-0.1589 -0.0187,-0.1456C-0.1246,-0.1378 -0.2188,-0.0894 -0.274,-0.0044L-0.274,-0.0044L-0.2824,-0.0044L-0.2576,-0.4944L0.2479,-0.4944" },
  "6": { w: 0.9613, d: "M-0.2786,0.2564C-0.2819,0.2383 -0.2836,0.2197 -0.2836,0.2006C-0.2836,0.035 -0.1531,-0.0994 0.0081,-0.0994C0.1689,-0.0994 0.2997,0.035 0.2997,0.2006C0.2997,0.3664 0.1689,0.5 0.0081,0.5C-0.1344,0.5 -0.2531,0.3956 -0.2786,0.2567C-0.2786,0.2567 -0.4222,-0.4756 0.0397,-0.4994C0.16,-0.5058 0.2386,-0.4417 0.2894,-0.3433" },
  "7": { w: 0.871, d: "M-0.2958,-0.4889L0.2958,-0.4889L0.2958,-0.4886L-0.0939,0.4889" },
  "8": { w: 0.9613, d: "M0,0C-0.1719,0 -0.3111,0.1119 -0.3111,0.25C-0.3111,0.3881 -0.1719,0.5 0,0.5C0.1719,0.5 0.3111,0.3881 0.3111,0.25C0.3111,0.1119 0.1719,0 0,0C-0.1581,0 -0.2861,-0.1119 -0.2861,-0.25C-0.2861,-0.3881 -0.1581,-0.5 0,-0.5C0.1581,-0.5 0.2861,-0.3881 0.2861,-0.25C0.2861,-0.1119 0.1581,0 0,0" },
  "9": { w: 0.9613, d: "M0.2786,-0.2556C0.2819,-0.2375 0.2836,-0.2189 0.2836,-0.2C0.2836,-0.0344 0.1531,0.1 -0.0081,0.1C-0.1692,0.1 -0.2997,-0.0344 -0.2997,-0.2C-0.2997,-0.3656 -0.1692,-0.5 -0.0081,-0.5C0.1344,-0.5 0.2531,-0.395 0.2786,-0.2561C0.2786,-0.2561 0.4219,0.4761 -0.04,0.5C-0.16,0.5064 -0.2389,0.4422 -0.2897,0.3439" },
  "E": { w: 0.8387, d: "M0.2667,-0.4889L-0.2667,-0.4889L-0.2667,0.4889L0.2667,0.4889M-0.2667,-0.0333L0.2333,-0.0333" },
  "N": { w: 1.1629, d: "M-0.3472,0.4889L-0.3472,-0.4889L-0.3389,-0.4889L0.3389,0.4861L0.3472,0.4861L0.3472,-0.4889" },
  "R": { w: 1.0226, d: "M-0.3222,0.0278L0.0639,0.0278C0.2067,0.0278 0.3222,-0.0878 0.3222,-0.2306C0.3222,-0.3733 0.2067,-0.4889 0.0639,-0.4889L-0.3222,-0.4889L-0.3222,0.4889M0.0639,0.0278L0.3222,0.4889" },
  "U": { w: 1.1484, d: "M0.3472,-0.4931L0.3472,0.1486C0.3472,0.3403 0.1917,0.4958 0,0.4958C-0.1917,0.4958 -0.3472,0.3403 -0.3472,0.1486L-0.3472,-0.4931" },
};

const labels = {
  sourceMode: { g4: "gradient-4pt", rs: "rich stripes", gs: "grayscale" },
  paletteMode: { div: "diverging", split: "split complement" },
  ditherPattern: { b4: "bayer-4", b8: "bayer-8", line: "line" },
  backgroundMode: { black: "black", dark: "palette dark", light: "palette light" },
};

function init() {
  controls.hash.value = randomHash();
  els.controls.addEventListener("input", render);
  els.randomHash.addEventListener("click", () => {
    controls.hash.value = randomHash();
    render();
  });
  render();
}

function render() {
  const hash = normalizeHash(controls.hash.value);
  controls.hash.value = hash;

  const tokenId = Math.max(1, Math.min(999, Number(controls.tokenId.value || 1)));
  const traits = deriveTraits(hash);
  const selected = {
    sourceMode: valueOrAuto("sourceMode", traits.sourceMode),
    paletteMode: valueOrAuto("paletteMode", traits.paletteMode),
    ditherPattern: valueOrAuto("ditherPattern", traits.ditherPattern),
    backgroundMode: valueOrAuto("backgroundMode", traits.backgroundMode),
  };
  const palette = paletteFor(hash, selected.paletteMode);
  const background = backgroundFor(selected.backgroundMode, palette);
  const svg = buildCardSvg({ hash, tokenId, traits: selected, palette, background });

  els.wrap.replaceChildren(svg);
  renderReadout({ hash, tokenId, traits: selected });
}

function buildCardSvg({ hash, tokenId, traits, palette, background }) {
  const svg = el("svg", {
    viewBox: "0 0 1000 1000",
    role: "img",
    "aria-label": `Runners Standing Still SVG card for iteration ${tokenId}`,
  });
  const defs = el("defs");
  const cardId = hash.slice(2, 10);
  const gradientId = `field-${cardId}`;
  const stripeId = `stripes-${cardId}`;
  const ditherId = `dither-${cardId}`;
  const clipId = `plate-${cardId}`;
  const ditherClipId = `dither-plate-${cardId}`;
  const platePoints = visiblePlatePoints();
  const ditherClipPoints = insetPolygon(platePoints, ditherInset(traits.ditherPattern));

  defs.append(
    linearGradient(gradientId, palette),
    stripePattern(stripeId, palette, traits.sourceMode),
    el("clipPath", { id: clipId }, [
      el("polygon", { points: polygonPointString(platePoints) }),
    ]),
    el("clipPath", { id: ditherClipId }, [
      el("polygon", { points: polygonPointString(ditherClipPoints) }),
    ]),
  );
  if (traits.ditherPattern === "line") {
    defs.append(ditherPattern(ditherId, traits.ditherPattern));
  }

  svg.append(defs);
  svg.append(el("rect", { width: 1000, height: 1000, fill: background }));

  const plate = el("g", { "clip-path": `url(#${clipId})` });
  if (traits.sourceMode === "rs") {
    plate.append(richStripeLayer(gradientId, palette));
  } else {
    plate.append(el("rect", {
      x: -120,
      y: 180,
      width: 1240,
      height: 520,
      fill: `url(#${gradientId})`,
      transform: "rotate(-18 500 500)",
    }));
  }
  svg.append(plate);
  svg.append(ditherLayer(traits.ditherPattern, ditherId, ditherClipId, ditherClipPoints));
  svg.append(el("polygon", {
    points: polygonPointString(platePoints),
    fill: "none",
    stroke: "#000000",
    "stroke-width": 1,
    "stroke-linejoin": "miter",
  }));

  if (controls.showBorder.checked) {
    svg.append(el("rect", {
      x: 40,
      y: 40,
      width: 920,
      height: 920,
      fill: "none",
      stroke: contrastColor(background),
      "stroke-width": 2,
      opacity: 0.48,
    }));
  }

  svg.append(numberLayer(tokenId, background));

  if (controls.showTraits.checked) {
    svg.append(traitLayer(traits, background));
  }

  return svg;
}

function visiblePlatePoints() {
  const rotated = rotatedRectPoints({
    x: -120,
    y: 180,
    width: 1240,
    height: 520,
    angle: -18,
    cx: 500,
    cy: 500,
  });
  const clipped = clipPolygonToRect(rotated, {
    minX: 96,
    minY: 152,
    maxX: 904,
    maxY: 772,
  });
  return clipped.map((point) => ({
    x: Number(point.x.toFixed(2)),
    y: Number(point.y.toFixed(2)),
  }));
}

function rotatedRectPoints({ x, y, width, height, angle, cx, cy }) {
  const radians = angle * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ].map((point) => {
    const dx = point.x - cx;
    const dy = point.y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  });
}

function clipPolygonToRect(points, rect) {
  return [
    {
      inside: (point) => point.x >= rect.minX,
      intersect: (a, b) => intersectVertical(a, b, rect.minX),
    },
    {
      inside: (point) => point.x <= rect.maxX,
      intersect: (a, b) => intersectVertical(a, b, rect.maxX),
    },
    {
      inside: (point) => point.y >= rect.minY,
      intersect: (a, b) => intersectHorizontal(a, b, rect.minY),
    },
    {
      inside: (point) => point.y <= rect.maxY,
      intersect: (a, b) => intersectHorizontal(a, b, rect.maxY),
    },
  ].reduce((polygon, edge) => clipPolygonEdge(polygon, edge), points);
}

function clipPolygonEdge(points, edge) {
  if (!points.length) return points;
  const clipped = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[(index + points.length - 1) % points.length];
    const currentInside = edge.inside(current);
    const previousInside = edge.inside(previous);
    if (currentInside) {
      if (!previousInside) clipped.push(edge.intersect(previous, current));
      clipped.push(current);
    } else if (previousInside) {
      clipped.push(edge.intersect(previous, current));
    }
  }
  return clipped;
}

function intersectVertical(a, b, x) {
  const t = (x - a.x) / (b.x - a.x);
  return { x, y: a.y + (b.y - a.y) * t };
}

function intersectHorizontal(a, b, y) {
  const t = (y - a.y) / (b.y - a.y);
  return { x: a.x + (b.x - a.x) * t, y };
}

function polygonPointString(points) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function insetPolygon(points, amount) {
  if (!amount) return points;
  const center = points.reduce((sum, point) => ({
    x: sum.x + point.x / points.length,
    y: sum.y + point.y / points.length,
  }), { x: 0, y: 0 });
  return points.map((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.hypot(dx, dy) || 1;
    const scale = Math.max(0, (distance - amount) / distance);
    return {
      x: center.x + dx * scale,
      y: center.y + dy * scale,
    };
  });
}

function numberLayer(tokenId, background) {
  const mode = controls.numberMode.value;
  const placement = controls.numberPlacement.value;
  const size = Number(controls.numberSize.value);
  const padded = String(tokenId).padStart(3, "0");
  const text = mode === "runner" ? `RUNNER ${padded}` : padded;
  const color = contrastColor(background);
  const pos = numberPosition(placement);
  const group = el("g", { opacity: 0.95 });

  if (controls.useLeonDigits.checked) {
    group.append(leonText(text, pos.x, pos.y, size, color, pos.anchor));
  } else {
    group.append(el("text", {
      x: pos.x,
      y: pos.y,
      fill: color,
      "font-family": "Arial, Helvetica, sans-serif",
      "font-size": size,
      "font-weight": 700,
      "letter-spacing": mode === "runner" ? 3 : 1,
      "text-anchor": pos.anchor,
      "dominant-baseline": "middle",
    }, text));
  }
  return group;
}

function traitLayer(traits, background) {
  const color = contrastColor(background);
  const muted = color === "#050505" ? "rgba(5,5,5,.62)" : "rgba(247,247,242,.62)";
  const rows = [
    ["source", labels.sourceMode[traits.sourceMode]],
    ["palette", labels.paletteMode[traits.paletteMode]],
    ["dither", labels.ditherPattern[traits.ditherPattern]],
    ["background", labels.backgroundMode[traits.backgroundMode]],
  ];
  const group = el("g", { "font-family": "Arial, Helvetica, sans-serif", "font-size": 22 });
  rows.forEach(([name, value], index) => {
    const y = 840 + index * 30;
    group.append(el("text", { x: 96, y, fill: muted }, name));
    group.append(el("text", { x: 250, y, fill: color }, value));
  });
  return group;
}

function leonText(text, x, y, size, stroke, anchor) {
  const gap = size * 0.26;
  const width = [...text].reduce((sum, ch) => {
    if (ch === " ") return sum + size * 0.7;
    return sum + (LEON_DIGITS[ch]?.w || 1) * size + gap;
  }, -gap);
  const start = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  const group = el("g", {
    fill: "none",
    stroke,
    "stroke-width": 0.065,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    transform: `translate(${start} ${y})`,
  });
  let cursor = 0;
  [...text].forEach((ch) => {
    if (ch === " ") {
      cursor += size * 0.7;
      return;
    }
    const glyph = LEON_DIGITS[ch] || LEON_DIGITS["0"];
    group.append(el("g", {
      transform: `translate(${cursor + (glyph.w * size) / 2} 0)`,
    }, [
      el("path", {
        d: glyph.d,
        transform: `scale(${size})`,
      }),
    ]));
    cursor += glyph.w * size + gap;
  });
  return group;
}

function numberPosition(placement) {
  if (placement === "top-left") return { x: 96, y: 96, anchor: "start" };
  if (placement === "bottom-right") return { x: 904, y: 862, anchor: "end" };
  if (placement === "center") return { x: 500, y: 500, anchor: "middle" };
  return { x: 96, y: 862, anchor: "start" };
}

function deriveTraits(hash) {
  const rand = prng(hash);
  return {
    sourceMode: weighted(rand, [["g4", 4], ["rs", 3], ["gs", 1]]),
    paletteMode: choice(rand, ["div", "split"]),
    ditherPattern: choice(rand, ["b4", "b8", "line"]),
    backgroundMode: choice(rand, ["black", "dark", "light"]),
  };
}

function paletteFor(hash, paletteMode) {
  const rand = prng(`${hash.slice(2)}${paletteMode}`);
  const hue = rand() * 360;
  if (paletteMode === "split") {
    return [
      oklch(hue - 16, 0.84, 0.07),
      oklch(hue - 5, 0.66, 0.12),
      oklch(hue + 180, 0.76, 0.055),
      oklch(hue + 196, 0.58, 0.13),
      oklch(hue + 8, 0.38, 0.1),
    ];
  }
  return [
    oklch(hue - 82, 0.38, 0.14),
    oklch(hue - 54, 0.58, 0.12),
    oklch(hue, 0.86, 0.04),
    oklch(hue + 54, 0.58, 0.12),
    oklch(hue + 82, 0.38, 0.14),
  ];
}

function backgroundFor(mode, palette) {
  if (mode === "black") return "#050505";
  if (mode === "light") return mixHex(palette[2], "#f7f7f2", 0.82);
  return mixHex(palette[4], "#050505", 0.72);
}

function linearGradient(id, colors) {
  const gradient = el("linearGradient", { id, x1: "0", y1: "0", x2: "1", y2: "1" });
  colors.forEach((color, index) => {
    gradient.append(el("stop", {
      offset: `${(index / (colors.length - 1)) * 100}%`,
      "stop-color": color,
    }));
  });
  return gradient;
}

function stripePattern(id, colors, mode) {
  const pattern = el("pattern", {
    id,
    width: mode === "rs" ? 160 : 80,
    height: mode === "rs" ? 172 : 80,
    patternUnits: "userSpaceOnUse",
  });
  const stripeColors = mode === "rs"
    ? [
      mixHex(colors[4], "#050505", 0.84),
      mixHex(colors[2], "#f7f7f2", 0.86),
      mixHex(colors[0], "#101010", 0.78),
      mixHex(colors[1], "#efeee8", 0.8),
    ]
    : ["#101010", "#eeeeee", "#626262", "#f7f7f2"];
  const stripeHeights = mode === "rs" ? [43, 43, 43, 43] : [20, 20, 20, 20];
  let y = 0;
  stripeColors.forEach((color, index) => {
    pattern.append(el("rect", {
      x: 0,
      y,
      width: 120,
      height: stripeHeights[index],
      fill: color,
    }));
    y += stripeHeights[index];
  });
  return pattern;
}

function richStripeLayer(gradientId, colors) {
  const dark = mixHex(colors[4], "#050505", 0.84);
  const light = mixHex(colors[2], "#f7f7f2", 0.86);
  const group = el("g", { transform: "rotate(-18 500 500)" });
  const bandHeight = 520 / 3;
  [
    { y: 180, fill: dark },
    { y: 180 + bandHeight, fill: light },
    { y: 180 + bandHeight * 2, fill: `url(#${gradientId})`, opacity: 0.96 },
  ].forEach((band) => {
    group.append(el("rect", {
      x: -120,
      y: band.y,
      width: 1240,
      height: bandHeight,
      fill: band.fill,
      opacity: band.opacity || 1,
    }));
  });
  return group;
}

function ditherLayer(kind, ditherId, ditherClipId, ditherClipPoints) {
  if (kind === "line") {
    return el("g", { "clip-path": `url(#${ditherClipId})` }, [
      el("rect", {
        x: 0,
        y: 0,
        width: 1000,
        height: 1000,
        fill: `url(#${ditherId})`,
        opacity: ditherOpacity(kind),
      }),
    ]);
  }
  return bayerDotLayer(kind, ditherClipPoints);
}

function bayerDotLayer(kind, bounds) {
  const matrix = kind === "b8" ? BAYER_8 : BAYER_4;
  const step = kind === "b8" ? 36 : 50;
  const max = matrix.length * matrix.length - 1;
  const offset = ditherOffset(kind);
  const group = el("g", { opacity: ditherOpacity(kind) });
  let rowIndex = 0;

  for (let y = 180 + offset.y; y <= 700; y += step) {
    let colIndex = 0;
    for (let x = -120 + offset.x; x <= 1120; x += step) {
      const value = matrix[rowIndex % matrix.length][colIndex % matrix.length] / max;
      if (value < 0.72) {
        const center = rotatePoint({ x: x + step / 2, y: y + step / 2 }, -18, 500, 500);
        if (pointInPolygon(center, bounds)) {
          const radius = step * (kind === "b8" ? (0.14 + (1 - value) * 0.22) : (0.24 + (1 - value) * 0.18));
          group.append(el("circle", {
            cx: Math.round(center.x),
            cy: Math.round(center.y),
            r: Math.round(radius),
            fill: "#ffffff",
          }));
        }
      }
      colIndex += 1;
    }
    rowIndex += 1;
  }
  return group;
}

function rotatePoint(point, angle, cx, cy) {
  const radians = angle * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - cx;
  const dy = point.y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index];
    const b = polygon[previous];
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function ditherPattern(id, kind) {
  return el("pattern", {
    id,
    width: 24,
    height: 24,
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(-42 500 500)",
  }, [
    el("rect", { width: 24, height: 24, fill: "transparent" }),
    el("rect", { x: 0, y: 0, width: 24, height: 3, fill: "#ffffff" }),
  ]);
}

function ditherInset(kind) {
  if (kind === "line") return 0;
  if (kind === "b8") return 36;
  return 28;
}

function ditherOffset(kind) {
  if (kind === "line") return { x: 0, y: 0 };
  if (kind === "b8") return { x: 18, y: 10 };
  return { x: 15, y: 18 };
}

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const BAYER_8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

init();

function ditherOpacity(kind) {
  if (kind === "line") return 0.32;
  if (kind === "b8") return 0.24;
  return 0.3;
}

function valueOrAuto(key, fallback) {
  const value = controls[key].value;
  return value === "auto" ? fallback : value;
}

function renderReadout({ hash, tokenId, traits }) {
  els.readout.replaceChildren(
    readoutRow("token", String(tokenId).padStart(3, "0")),
    readoutRow("source", labels.sourceMode[traits.sourceMode]),
    readoutRow("palette", labels.paletteMode[traits.paletteMode]),
    readoutRow("dither", labels.ditherPattern[traits.ditherPattern]),
    readoutRow("background", labels.backgroundMode[traits.backgroundMode]),
    readoutRow("hash", `${hash.slice(0, 10)}...${hash.slice(-8)}`),
  );
}

function readoutRow(name, value) {
  const fragment = document.createDocumentFragment();
  fragment.append(el("dt", {}, name), el("dd", {}, value));
  return fragment;
}

function el(name, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  });
  if (!Array.isArray(children)) children = [children];
  children.forEach((child) => {
    if (typeof child === "string") {
      node.append(document.createTextNode(child));
    } else if (child) {
      node.append(child);
    }
  });
  return node;
}

function randomHash() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function normalizeHash(value) {
  const clean = String(value || "").replace(/^0x/i, "").replace(/[^0-9a-f]/gi, "").padEnd(64, "0").slice(0, 64);
  return `0x${clean || randomHash().slice(2)}`;
}

function prng(hash) {
  const clean = normalizeHash(hash).slice(2);
  let a = parseInt(clean.slice(0, 8), 16) || 1;
  let b = parseInt(clean.slice(8, 16), 16) || 2;
  let c = parseInt(clean.slice(16, 24), 16) || 3;
  let d = parseInt(clean.slice(24, 32), 16) || 4;
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + t) >>> 0;
    return (t >>> 0) / 4294967296;
  };
}

function choice(rand, values) {
  return values[Math.floor(rand() * values.length)];
}

function weighted(rand, pairs) {
  const total = pairs.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = rand() * total;
  for (const [value, weight] of pairs) {
    cursor -= weight;
    if (cursor <= 0) return value;
  }
  return pairs[pairs.length - 1][0];
}

function oklch(h, l, c) {
  const color = oklchToRgb(l, c, h);
  return rgbToHex(color.r, color.g, color.b);
}

function oklchToRgb(l, c, h) {
  const hue = ((h % 360) + 360) % 360 * Math.PI / 180;
  const a = Math.cos(hue) * c;
  const b = Math.sin(hue) * c;
  const l1 = l + 0.3963377774 * a + 0.2158037573 * b;
  const m1 = l - 0.1055613458 * a - 0.0638541728 * b;
  const s1 = l - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l1 ** 3;
  const m3 = m1 ** 3;
  const s3 = s1 ** 3;
  return {
    r: srgb(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: srgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: srgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
  };
}

function srgb(value) {
  const corrected = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(corrected * 255)));
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(
    Math.round(ca.r + (cb.r - ca.r) * t),
    Math.round(ca.g + (cb.g - ca.g) * t),
    Math.round(ca.b + (cb.b - ca.b) * t),
  );
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function contrastColor(background) {
  const { r, g, b } = hexToRgb(background);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq > 145 ? "#050505" : "#f7f7f2";
}
