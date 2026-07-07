import { strToU8, zipSync, type Zippable } from "fflate";

/**
 * Programmatic .pptx fixtures for parser/converter tests and the e2e smoke.
 * Builds real OOXML ZIP packages from compact slide descriptions.
 */

export const EMU_16x9 = { cx: 12_192_000, cy: 6_858_000 };
export const EMU_4x3 = { cx: 9_144_000, cy: 6_858_000 };

/** 1×1 transparent PNG. */
export const TINY_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

const NS = {
  p: "http://schemas.openxmlformats.org/presentationml/2006/main",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
};

export type FixtureRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string; // hex without #
  sizePt?: number;
  font?: string;
};

export type FixtureParagraph = {
  runs: FixtureRun[];
  align?: "l" | "ctr" | "r";
  bullet?: "char" | "autoNum" | "none";
};

export type FixtureElement =
  | {
      kind: "text";
      x: number;
      y: number;
      cx: number;
      cy: number;
      paragraphs: FixtureParagraph[];
      ph?: "title" | "ctrTitle" | "body";
      noXfrm?: boolean;
      fill?: string;
      preset?: string;
    }
  | { kind: "image"; x: number; y: number; cx: number; cy: number; alt?: string; ext?: string }
  | {
      kind: "shape";
      x: number;
      y: number;
      cx: number;
      cy: number;
      preset: string;
      fill?: string;
      /** Fill alpha in thousandths of a percent (e.g. 50000 = 50% opaque). */
      fillAlpha?: number;
      lineColor?: string;
      lineWidthEmu?: number;
    }
  | { kind: "line"; x: number; y: number; cx: number; cy: number; color?: string }
  | { kind: "table"; x: number; y: number; cx: number; cy: number; rows: string[][] }
  | { kind: "chart"; x: number; y: number; cx: number; cy: number }
  | { kind: "smartart"; x: number; y: number; cx: number; cy: number }
  | { kind: "group"; x: number; y: number; cx: number; cy: number; chX: number; chY: number; chCx: number; chCy: number; children: FixtureElement[] };

export type FixtureSlide = {
  elements: FixtureElement[];
  background?: string; // hex without #
  notes?: string;
};

export type FixtureDeck = {
  title?: string;
  slideSize?: { cx: number; cy: number };
  slides: FixtureSlide[];
};

function runXml(run: FixtureRun): string {
  const props: string[] = [];
  if (run.sizePt) props.push(`sz="${run.sizePt * 100}"`);
  if (run.bold) props.push('b="1"');
  if (run.italic) props.push('i="1"');
  const u = run.underline ? ' u="sng"' : "";
  const fill = run.color
    ? `<a:solidFill><a:srgbClr val="${run.color}"/></a:solidFill>`
    : "";
  const latin = run.font ? `<a:latin typeface="${run.font}"/>` : "";
  return `<a:r><a:rPr lang="en-US" ${props.join(" ")}${u}>${fill}${latin}</a:rPr><a:t>${escapeXml(run.text)}</a:t></a:r>`;
}

function paragraphXml(p: FixtureParagraph): string {
  const bullet =
    p.bullet === "char"
      ? "<a:buChar char=\"•\"/>"
      : p.bullet === "autoNum"
        ? '<a:buAutoNum type="arabicPeriod"/>'
        : p.bullet === "none"
          ? "<a:buNone/>"
          : "";
  const algn = p.align ? ` algn="${p.align}"` : "";
  const pPr = bullet || p.align ? `<a:pPr${algn}>${bullet}</a:pPr>` : "";
  return `<a:p>${pPr}${p.runs.map(runXml).join("")}</a:p>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xfrmXml(e: { x: number; y: number; cx: number; cy: number }): string {
  return `<a:xfrm><a:off x="${e.x}" y="${e.y}"/><a:ext cx="${e.cx}" cy="${e.cy}"/></a:xfrm>`;
}

type SlideBuildContext = {
  rels: string[];
  relCount: number;
  media: Map<string, Uint8Array>;
  mediaCount: { value: number };
};

function elementXml(e: FixtureElement, ctx: SlideBuildContext): string {
  switch (e.kind) {
    case "text": {
      const ph = e.ph ? `<p:nvPr><p:ph type="${e.ph}"/></p:nvPr>` : "<p:nvPr/>";
      const geom = e.noXfrm ? "" : xfrmXml(e);
      const preset = e.preset ?? "rect";
      const fill = e.fill
        ? `<a:solidFill><a:srgbClr val="${e.fill}"/></a:solidFill>`
        : "";
      return `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Text"/><p:cNvSpPr/>${ph}</p:nvSpPr><p:spPr>${geom}<a:prstGeom prst="${preset}"><a:avLst/></a:prstGeom>${fill}</p:spPr><p:txBody><a:bodyPr/>${e.paragraphs.map(paragraphXml).join("")}</p:txBody></p:sp>`;
    }
    case "shape": {
      const alpha =
        e.fillAlpha != null ? `<a:alpha val="${e.fillAlpha}"/>` : "";
      const fill = e.fill
        ? `<a:solidFill><a:srgbClr val="${e.fill}">${alpha}</a:srgbClr></a:solidFill>`
        : "";
      const ln = e.lineColor
        ? `<a:ln w="${e.lineWidthEmu ?? 25_400}"><a:solidFill><a:srgbClr val="${e.lineColor}"/></a:solidFill></a:ln>`
        : "";
      return `<p:sp><p:nvSpPr><p:cNvPr id="3" name="Shape"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xfrmXml(e)}<a:prstGeom prst="${e.preset}"><a:avLst/></a:prstGeom>${fill}${ln}</p:spPr></p:sp>`;
    }
    case "line":
      return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="4" name="Line"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>${xfrmXml(e)}<a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="19050"><a:solidFill><a:srgbClr val="${e.color ?? "0F172A"}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>`;
    case "image": {
      ctx.mediaCount.value += 1;
      const n = ctx.mediaCount.value;
      const ext = e.ext ?? "png";
      const relId = `rIdImg${n}`;
      ctx.media.set(`ppt/media/image${n}.${ext}`, TINY_PNG);
      ctx.rels.push(
        `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${n}.${ext}"/>`,
      );
      const alt = e.alt ? ` descr="${escapeXml(e.alt)}"` : "";
      return `<p:pic><p:nvPicPr><p:cNvPr id="5" name="Picture"${alt}/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${relId}"/><a:stretch/></p:blipFill><p:spPr>${xfrmXml(e)}<a:prstGeom prst="rect"/></p:spPr></p:pic>`;
    }
    case "table": {
      const rows = e.rows
        .map(
          (row) =>
            `<a:tr h="370840">${row
              .map(
                (cell) =>
                  `<a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>${escapeXml(cell)}</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>`,
              )
              .join("")}</a:tr>`,
        )
        .join("");
      const grid = e.rows[0]
        ?.map(() => `<a:gridCol w="${Math.floor(e.cx / (e.rows[0]?.length || 1))}"/>`)
        .join("");
      return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="6" name="Table"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${e.x}" y="${e.y}"/><a:ext cx="${e.cx}" cy="${e.cy}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblGrid>${grid}</a:tblGrid>${rows}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
    }
    case "chart":
      return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="7" name="Chart"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${e.x}" y="${e.y}"/><a:ext cx="${e.cx}" cy="${e.cy}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rIdChartMissing"/></a:graphicData></a:graphic></p:graphicFrame>`;
    case "smartart":
      return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="8" name="Diagram"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${e.x}" y="${e.y}"/><a:ext cx="${e.cx}" cy="${e.cy}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/diagram"/></a:graphic></p:graphicFrame>`;
    case "group": {
      const inner = e.children.map((c) => elementXml(c, ctx)).join("");
      return `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="9" name="Group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="${e.x}" y="${e.y}"/><a:ext cx="${e.cx}" cy="${e.cy}"/><a:chOff x="${e.chX}" y="${e.chY}"/><a:chExt cx="${e.chCx}" cy="${e.chCy}"/></a:xfrm></p:grpSpPr>${inner}</p:grpSp>`;
    }
  }
}

function slideXml(slide: FixtureSlide, ctx: SlideBuildContext): string {
  const bg = slide.background
    ? `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${slide.background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`
    : "";
  const elements = slide.elements.map((e) => elementXml(e, ctx)).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="${NS.p}" xmlns:a="${NS.a}" xmlns:r="${NS.r}"><p:cSld>${bg}<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${elements}</p:spTree></p:cSld></p:sld>`;
}

function notesXml(notes: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:p="${NS.p}" xmlns:a="${NS.a}" xmlns:r="${NS.r}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:p><a:r><a:t>${escapeXml(notes)}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>`;
}

/** Build a complete .pptx as bytes. */
export function makePptx(deck: FixtureDeck): Uint8Array {
  const size = deck.slideSize ?? EMU_16x9;
  const files: Zippable = {};
  const media = new Map<string, Uint8Array>();
  const mediaCount = { value: 0 };

  const slideEntries: { part: string; relId: string }[] = [];
  deck.slides.forEach((slide, i) => {
    const n = i + 1;
    const part = `ppt/slides/slide${n}.xml`;
    const ctx: SlideBuildContext = { rels: [], relCount: 0, media, mediaCount };
    files[part] = strToU8(slideXml(slide, ctx));

    if (slide.notes) {
      files[`ppt/notesSlides/notesSlide${n}.xml`] = strToU8(notesXml(slide.notes));
      ctx.rels.push(
        `<Relationship Id="rIdNotes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${n}.xml"/>`,
      );
    }
    if (ctx.rels.length > 0) {
      files[`ppt/slides/_rels/slide${n}.xml.rels`] = strToU8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${ctx.rels.join("")}</Relationships>`,
      );
    }
    slideEntries.push({ part, relId: `rId${n + 10}` });
  });

  for (const [path, bytes] of media) {
    files[path] = bytes;
  }

  files["ppt/presentation.xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="${NS.p}" xmlns:a="${NS.a}" xmlns:r="${NS.r}"><p:sldIdLst>${slideEntries
      .map((s, i) => `<p:sldId id="${256 + i}" r:id="${s.relId}"/>`)
      .join("")}</p:sldIdLst><p:sldSz cx="${size.cx}" cy="${size.cy}"/></p:presentation>`,
  );

  files["ppt/_rels/presentation.xml.rels"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${slideEntries
      .map(
        (s) =>
          `<Relationship Id="${s.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="${s.part.replace("ppt/", "")}"/>`,
      )
      .join("")}</Relationships>`,
  );

  if (deck.title) {
    files["docProps/core.xml"] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(deck.title)}</dc:title></cp:coreProperties>`,
    );
  }

  files["[Content_Types].xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>`,
  );

  return zipSync(files);
}

/** Convenience: a small but representative deck used across tests. */
export function sampleDeck(): Uint8Array {
  return makePptx({
    title: "Wave Optics Review",
    slides: [
      {
        background: "F5F3FF",
        elements: [
          {
            kind: "text",
            ph: "title",
            x: 914_400,
            y: 457_200,
            cx: 9_144_000,
            cy: 1_143_000,
            paragraphs: [
              { runs: [{ text: "Wave Optics Review", sizePt: 40, bold: true }] },
            ],
          },
          {
            kind: "text",
            x: 914_400,
            y: 1_828_800,
            cx: 6_858_000,
            cy: 2_286_000,
            paragraphs: [
              {
                runs: [
                  { text: "Interference is ", sizePt: 18 },
                  { text: "constructive", bold: true, color: "652FF3" },
                  { text: " or destructive.", italic: true },
                ],
              },
              { runs: [{ text: "Path difference", underline: true }], bullet: "char" },
              { runs: [{ text: "Phase shift" }], bullet: "char" },
            ],
          },
          { kind: "image", x: 8_229_600, y: 1_828_800, cx: 2_743_200, cy: 2_057_400, alt: "Setup photo" },
          { kind: "shape", preset: "rect", x: 914_400, y: 4_572_000, cx: 2_286_000, cy: 1_143_000, fill: "EEF2FF", lineColor: "652FF3" },
          { kind: "line", x: 914_400, y: 6_000_750, cx: 6_858_000, cy: 0 },
        ],
        notes: "Mention the double-slit demo.",
      },
      {
        elements: [
          { kind: "chart", x: 914_400, y: 914_400, cx: 6_858_000, cy: 4_572_000 },
          { kind: "table", x: 8_001_000, y: 914_400, cx: 3_200_400, cy: 2_286_000, rows: [["n", "λ (nm)"], ["1", "650"], ["2", "325"]] },
        ],
      },
    ],
  });
}
