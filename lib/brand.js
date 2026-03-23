'use strict';

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, LevelFormat, ImageRun, Footer,
} = require('docx');

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  red:         'E10600',
  navy:        '2A3547',
  dark:        '1A1A2E',
  body:        '1F2937',
  muted:       '64748B',
  tblHdr:      '2A3547',
  tblShade:    'F4F6F8',
  tblInput:    'FFFFFF',
  border:      'DDE3EA',
  white:       'FFFFFF',
  placeholder: 'BBBBBB',
};

// ── Page geometry (A4) ────────────────────────────────────────────────────────
const PAGE_W  = 11906;
const PAGE_H  = 16838;
const MARGIN  = { top: 1000, bottom: 1000, left: 1100, right: 1100 };
const CW      = PAGE_W - MARGIN.left - MARGIN.right; // 9706 DXA

// ── Border helpers ────────────────────────────────────────────────────────────
const bSingle = (color, size) => ({ style: BorderStyle.SINGLE, size: size || 4, color, space: 1 });
const tblBorders = {
  top:    bSingle(C.border),
  bottom: bSingle(C.border),
  left:   bSingle(C.border),
  right:  bSingle(C.border),
};

// ── Text run ──────────────────────────────────────────────────────────────────
function r(text, opts) {
  opts = opts || {};
  return new TextRun({
    text:    String(text || ''),
    font:    'Arial',
    size:    Math.round((opts.pt || 10) * 2),
    bold:    opts.bold    || false,
    italics: opts.italic  || false,
    color:   opts.color   || C.body,
  });
}

// ── Paragraph factory ─────────────────────────────────────────────────────────
function p(runs, opts) {
  opts = opts || {};
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing:   { before: opts.before || 0, after: opts.after || 80 },
    border:    opts.border,
    numbering: opts.num,
    children:  Array.isArray(runs) ? runs : [runs],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 100 },
    border:  { bottom: bSingle(C.red, 8) },
    children: [r(text, { pt: 14, bold: true, color: C.red })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [r(text, { pt: 12, bold: true, color: C.navy })],
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [r(text, { pt: 10.5, bold: true, color: C.navy })],
  });
}

function body(text, opts) {
  opts = opts || {};
  return p([r(text, { pt: 10, color: opts.color || C.body, italic: opts.italic })],
    { before: 40, after: 80 });
}

function note(text) {
  return p([r(text, { pt: 9, color: C.muted, italic: true })], { before: 40, after: 60 });
}

function gap(pts) {
  return new Paragraph({ spacing: { before: pts || 120, after: 0 }, children: [] });
}

// ── Bullet lists ──────────────────────────────────────────────────────────────
const BULLETS = {
  config: [
    {
      reference: 'dash',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '\u2013',
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: { indent: { left: 480, hanging: 240 } },
          run: { font: 'Arial', color: C.red },
        },
      }],
    },
    {
      reference: 'dot',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '\u00B7',
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: { indent: { left: 840, hanging: 240 } },
          run: { font: 'Arial', color: C.muted },
        },
      }],
    },
  ],
};

function bullet(text, opts) {
  opts = opts || {};
  return new Paragraph({
    numbering: { reference: 'dash', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [r(text, { pt: 10, color: opts.color || C.body, bold: opts.bold })],
  });
}

function subbullet(text) {
  return new Paragraph({
    numbering: { reference: 'dot', level: 0 },
    spacing: { before: 20, after: 20 },
    children: [r(text, { pt: 9.5, color: C.muted })],
  });
}

// ── Table cell factories ──────────────────────────────────────────────────────
function hdrCell(text, w) {
  return new TableCell({
    borders: tblBorders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: C.tblHdr, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [p([r(text, { pt: 9.5, bold: true, color: C.white })])],
  });
}

function labelCell(text, w, opts) {
  opts = opts || {};
  return new TableCell({
    borders: tblBorders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: opts.dark ? C.navy : C.tblShade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [p([r(text, { pt: 9.5, bold: opts.bold, color: opts.dark ? C.white : C.body })])],
  });
}

function valueCell(text, w) {
  var isEmpty = !text || text === '—';
  return new TableCell({
    borders: tblBorders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: C.tblInput, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [p([r(isEmpty ? '—' : text, { pt: 9.5, color: isEmpty ? C.muted : C.body, italic: isEmpty })])],
  });
}

// ── N-column table ────────────────────────────────────────────────────────────
function nColTable(headers, colPcts, rows) {
  var total = colPcts.reduce(function(a, b) { return a + b; }, 0);
  var cols  = colPcts.map(function(pct) { return Math.round(CW * pct / total); });
  var used  = cols.slice(0, -1).reduce(function(a, b) { return a + b; }, 0);
  cols[cols.length - 1] = CW - used;

  var tableRows = [new TableRow({
    tableHeader: true,
    children: headers.map(function(h, i) { return hdrCell(h, cols[i]); }),
  })];

  rows.forEach(function(row) {
    tableRows.push(new TableRow({
      children: row.map(function(cell, i) {
        if (i === 0) return labelCell(Array.isArray(cell) ? cell[0] : cell, cols[i], { bold: true });
        return valueCell(cell, cols[i]);
      }),
    }));
  });

  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: cols, rows: tableRows });
}

// ── Must-gather block ─────────────────────────────────────────────────────────
function mustGatherBlock(item, collect, owner, drive, motion) {
  var c1 = Math.round(CW * 0.28);
  var c2 = CW - c1;
  var rows = [];

  rows.push(new TableRow({
    children: [new TableCell({
      borders: tblBorders,
      columnSpan: 2,
      width: { size: CW, type: WidthType.DXA },
      shading: { fill: C.navy, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [p([r(item, { pt: 10, bold: true, color: C.white })])],
    })],
  }));

  [['Collect from client', collect], ['Client owner', owner],
   ['Save in Google Drive', drive],  ['Update MotionAI', motion]
  ].forEach(function(pair) {
    rows.push(new TableRow({
      children: [labelCell(pair[0], c1, { bold: true }), valueCell(pair[1], c2)],
    }));
  });

  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [c1, c2], rows: rows });
}

// ── Answer block (label + value paragraph pair) ───────────────────────────────
function answerBlock(label, value) {
  var isEmpty = !value || value === '—';
  return [
    new Paragraph({ spacing: { before: 100, after: 20 }, children: [r(label, { pt: 9.5, bold: true, color: C.navy })] }),
    new Paragraph({ spacing: { before: 0, after: 80 },   children: [r(isEmpty ? '—' : value, { pt: 10, color: isEmpty ? C.muted : C.body, italic: isEmpty })] }),
  ];
}

// ── Cover block ───────────────────────────────────────────────────────────────
function coverBlock(logoData, docTypeLabel, title, clientName, date) {
  return [
    new Paragraph({
      spacing: { before: 0, after: 120 },
      children: [new ImageRun({
        data: logoData,
        transformation: { width: Math.round(28 * (657 / 219)), height: 28 },
        type: 'jpg',
      })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.red, space: 1 } },
      children: [],
    }),
    gap(100),
    p([r(docTypeLabel.toUpperCase(), { pt: 8, bold: true, color: C.red })], { after: 80 }),
    p([r(title,      { pt: 22, bold: true, color: C.dark })], { after: 60 }),
    p([r(clientName, { pt: 14, bold: true, color: C.red  })], { after: 120 }),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 1 } },
      children: [],
    }),
    p([r('Prepared by Sabel Customer Success Solutions  ·  ' + date, { pt: 9, color: C.muted })],
      { before: 80, after: 200 }),
  ];
}

// ── Footer ────────────────────────────────────────────────────────────────────
function makeFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 4 } },
      spacing: { before: 80 },
      children: [r('PERFECT MADE POSSIBLE  ·  sabelcustomersuccess.com', { pt: 8, color: C.muted })],
    })],
  });
}

// ── Shared doc config ─────────────────────────────────────────────────────────
function docConfig() {
  return {
    styles: {
      default: { document: { run: { font: 'Arial', size: 20, color: C.body } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial', color: C.red },
          paragraph: { spacing: { before: 320, after: 100 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Arial', color: C.navy },
          paragraph: { spacing: { before: 280, after: 80 }, outlineLevel: 1 } },
      ],
    },
    numbering: BULLETS,
  };
}

function sectionProps() {
  return {
    properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: MARGIN } },
    footers: { default: makeFooter() },
  };
}

// ── Input row (for weekly update template) ────────────────────────────────────
function makeInputRow() {
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [CW],
    rows: [new TableRow({
      children: [new TableCell({
        borders: tblBorders,
        width: { size: CW, type: WidthType.DXA },
        shading: { fill: C.tblInput, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({
          children: [r('Add notes here...', { pt: 9.5, color: C.placeholder, italic: true })],
        })],
      })],
    })],
  });
}

module.exports = {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign, Footer,
  C, CW, BULLETS, PAGE_W, PAGE_H, MARGIN,
  r, p, h1, h2, h3, body, note, gap, bullet, subbullet,
  hdrCell, labelCell, valueCell, nColTable, mustGatherBlock,
  answerBlock, coverBlock, makeFooter, docConfig, sectionProps,
  tblBorders, bSingle, makeInputRow,
};
