'use strict';

const PDFDocument = require('pdfkit');
const { LOGO_DATA } = require('./logo.js');

// ── Brand tokens (RGB 0-1) ────────────────────────────────────────────────────
const BLACK     = [0.043, 0.043, 0.047];
const DARK_CARD = [0.086, 0.086, 0.094];
const WHITE     = [1,     1,     1    ];
const RED       = [0.882, 0.024, 0    ];
const BODY      = [0.886, 0.910, 0.941];
const MUTED     = [0.580, 0.639, 0.722];
const BORDER    = [0.165, 0.208, 0.278];

const W = 595.28, H = 841.89, ML = 40, MR = 40;
const CW = W - ML - MR, CX = W / 2;

function c(arr) { return { r: Math.round(arr[0]*255), g: Math.round(arr[1]*255), b: Math.round(arr[2]*255) }; }
function hex(arr) {
  var x = c(arr);
  return '#' + ('0' + x.r.toString(16)).slice(-2) + ('0' + x.g.toString(16)).slice(-2) + ('0' + x.b.toString(16)).slice(-2);
}
function safe(v) { return (v && String(v).trim()) ? String(v).trim() : '\u2014'; }

class SabelPDF {
  constructor() {
    this.doc    = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    this.y      = 0;
    this.chunks = [];
    this.doc.on('data', (chunk) => this.chunks.push(chunk));
  }

  fillBlack() {
    this.doc.rect(0, 0, W, H).fill(hex(BLACK));
  }

  centreLine() {
    this.doc.save().opacity(0.22)
        .moveTo(CX, 0).lineTo(CX, H)
        .lineWidth(0.7).stroke(hex(RED))
        .restore();
  }

  footer() {
    var d = this.doc;
    d.save()
     .moveTo(ML, H - 44).lineTo(W - MR, H - 44)
     .lineWidth(0.4).stroke(hex(BORDER))
     .font('Courier').fontSize(7).fillColor(hex(MUTED))
     .text('PERFECT MADE POSSIBLE', ML, H - 36, { lineBreak: false })
     .text('sabelcustomersuccess.com', ML, H - 36, { align: 'right', lineBreak: false })
     .restore();
  }

  header(docType, clientName) {
    var d = this.doc;
    d.save()
     .rect(0, 0, W, 30).fill(hex(BLACK))
     .moveTo(ML, 30).lineTo(W - MR, 30).lineWidth(0.5).stroke(hex(BORDER))
     .font('Helvetica-Bold').fontSize(8.5).fillColor(hex(WHITE))
     .text('SABEL', ML, 11, { lineBreak: false })
     .circle(ML + 36, 16, 2.3).fill(hex(RED))
     .font('Helvetica').fontSize(8.5).fillColor(hex(MUTED))
     .text(docType || 'Scope of Work', ML + 44, 11, { lineBreak: false })
     .font('Helvetica').fontSize(8.5).fillColor(hex(BODY))
     .text(clientName || '', 0, 11, { align: 'right', width: W - MR, lineBreak: false })
     .restore();
    this.y = 44;
  }

  newPage(docType, clientName) {
    this.footer();
    this.doc.addPage();
    this.fillBlack();
    this.centreLine();
    this.header(docType, clientName);
  }

  ensure(pts, docType, clientName) {
    if (this.y + pts > H - 58) this.newPage(docType, clientName);
  }

  sp(n) { this.y += n; }

  // Text at absolute position
  t(x, y, text, opts) {
    opts = opts || {};
    this.doc.font(opts.font || 'Helvetica')
        .fontSize(opts.size || 9.5)
        .fillColor(hex(opts.color || WHITE))
        .text(String(text || ''), x, y, { lineBreak: false, continued: false });
  }

  // Wrapped text at current y
  body(txt, opts) {
    opts = opts || {};
    var d = this.doc;
    var sz = opts.size || 9.5, col = opts.color || BODY;
    var maxW = opts.width || CW;
    d.font(opts.font || 'Helvetica').fontSize(sz);
    var h = d.heightOfString(String(txt || ''), { width: maxW });
    this.ensure(h + 6, this._docType, this._client);
    d.fillColor(hex(col)).text(String(txt || ''), ML, this.y, { width: maxW, lineBreak: true });
    this.y += h + 6;
  }

  bullet(txt, hrs) {
    var d = this.doc;
    var sz = 9;
    d.font('Helvetica').fontSize(sz);
    var h = d.heightOfString(String(txt || ''), { width: CW - 16 });
    this.ensure(h + 4, this._docType, this._client);
    d.font('Courier').fontSize(sz).fillColor(hex(RED)).text('\u2013', ML, this.y, { lineBreak: false });
    var label = String(txt || '') + (hrs ? '  \u2014  ' + hrs + ' hrs' : '');
    d.font('Helvetica').fontSize(sz).fillColor(hex(BODY))
     .text(label, ML + 14, this.y, { width: CW - 16, lineBreak: true });
    this.y += h + 3;
  }

  subtotal(hrs) {
    this.y += 4;
    this.ensure(18, this._docType, this._client);
    this.doc.font('Helvetica').fontSize(8.5).fillColor(hex(MUTED))
        .text('Subtotal:  ', ML, this.y, { continued: true, lineBreak: false });
    this.doc.font('Helvetica-Bold').fontSize(8.5).fillColor(hex(WHITE))
        .text(hrs + ' hours', { lineBreak: false });
    this.y += 18;
  }

  rule() {
    this.doc.moveTo(ML, this.y).lineTo(W - MR, this.y)
        .lineWidth(0.5).stroke(hex(BORDER));
    this.y += 13;
  }

  sectionLabel(txt) {
    this.ensure(60, this._docType, this._client);
    this.doc.font('Courier').fontSize(7.5).fillColor(hex(RED))
        .text(txt.toUpperCase(), ML, this.y, { lineBreak: false });
    this.y += 13;
  }

  sectionTitle(txt) {
    this.ensure(30, this._docType, this._client);
    this.doc.font('Helvetica-Bold').fontSize(17).fillColor(hex(WHITE))
        .text(txt, ML, this.y, { width: CW, lineBreak: false });
    this.y += 22;
    this.rule();
  }

  procedureCard(tag, title, desc, notes, hrs) {
    var d = this.doc;
    var sz = 8.5, pl = ML + 14, iw = CW - 14;
    d.font('Helvetica').fontSize(sz);
    var descH  = d.heightOfString(String(desc || ''), { width: iw });
    var notesH = notes ? d.heightOfString(String(notes), { width: iw }) : 0;
    var cardH  = 13 + 17 + 10 + descH + (notes ? 12 + notesH : 0) + (hrs ? 20 : 4) + 8;

    this.ensure(cardH + 14, this._docType, this._client);
    var top = this.y;

    d.rect(ML - 8, top, CW + 16, cardH).fill(hex(DARK_CARD));
    d.rect(ML - 8, top, 3, cardH).fill(hex(RED));
    d.rect(ML - 8, top, CW + 16, cardH).lineWidth(0.4).stroke(hex(BORDER));

    d.font('Courier').fontSize(7.5).fillColor(hex(RED))
     .text(tag, pl, top + 5, { lineBreak: false });
    d.font('Helvetica-Bold').fontSize(11.5).fillColor(hex(WHITE))
     .text(title, pl, top + 18, { width: iw, lineBreak: false });
    d.moveTo(pl, top + 33).lineTo(W - MR - 8, top + 33)
     .lineWidth(0.3).stroke(hex(BORDER));
    d.font('Helvetica').fontSize(sz).fillColor(hex(BODY))
     .text(String(desc || ''), pl, top + 40, { width: iw });

    var ny = top + 40 + descH + 4;
    if (notes) {
      d.font('Courier').fontSize(7).fillColor(hex(MUTED))
       .text('BUILD NOTES:', pl, ny, { lineBreak: false });
      ny += 11;
      d.font('Helvetica').fontSize(sz - 0.5).fillColor(hex(MUTED))
       .text(String(notes), pl, ny, { width: iw });
      ny += notesH + 4;
    }

    if (hrs) {
      d.font('Helvetica-Bold').fontSize(8.5).fillColor(hex(RED))
       .text(hrs + ' hrs', pl, ny + 4, { lineBreak: false });
    }

    this.y = top + cardH + 10;
  }

  metricCards(metrics) {
    var d = this.doc, n = metrics.length, mg = 10;
    var mcw = (CW - mg * (n - 1)) / n, mh = 68, mx = ML;
    metrics.forEach(function(m) {
      d.rect(mx, this.y, mcw, mh).fill(hex(DARK_CARD));
      d.rect(mx, this.y, 3, mh).fill(hex(RED));
      d.rect(mx, this.y, mcw, mh).lineWidth(0.4).stroke(hex(BORDER));
      d.font('Helvetica-Bold').fontSize(26).fillColor(hex(WHITE))
       .text(m[0], mx + 12, this.y + 10, { width: mcw - 20, lineBreak: false });
      d.font('Courier').fontSize(8).fillColor(hex(MUTED))
       .text(m[1].toUpperCase(), mx + 12, this.y + 44, { width: mcw - 20, lineBreak: false });
      mx += mcw + mg;
    }, this);
    this.y += mh + 14;
  }

  pillarCards(pillars) {
    var d = this.doc, n = pillars.length, mg = 8;
    var pcw = (CW - mg * (n - 1)) / n, ph = 72, px = ML;
    pillars.forEach(function(pillar) {
      var active = pillar[2];
      var bg = active ? DARK_CARD : [0.05, 0.05, 0.06];
      var tc = active ? WHITE : [0.28, 0.28, 0.32];
      d.rect(px, this.y, pcw, ph).fill(hex(bg));
      if (active) {
        d.rect(px, this.y, pcw, ph).lineWidth(1.5).stroke(hex(RED));
        d.rect(px, this.y, 3, ph).fill(hex(RED));
      } else {
        d.rect(px, this.y, pcw, ph).lineWidth(0.4).stroke(hex(BORDER));
      }
      d.font('Courier').fontSize(7).fillColor(hex(RED))
       .text(pillar[0], px + 10, this.y + 10, { lineBreak: false });
      d.font('Helvetica-Bold').fontSize(8.5).fillColor(hex(tc))
       .text(pillar[1], px + 10, this.y + 26, { width: pcw - 20, lineBreak: true });
      px += pcw + mg;
    }, this);
    this.y += ph + 10;
  }

  // ── Tube map timeline ───────────────────────────────────────────────────────
  // stops: array of { label, subtitle, week } e.g. { label: 'Kickoff & Access', subtitle: 'Credentials confirmed', week: 'Week 0' }
  tubeMap(stops) {
    var d    = this.doc;
    var n    = stops.length;
    if (!n) return;

    var mapH = 110;
    this.ensure(mapH + 20, this._docType, this._client);

    var railY   = this.y + 44;           // vertical centre of the rail
    var nodeR   = 7;                      // circle radius
    var spacing = CW / (n - 1 || 1);     // horizontal spacing between nodes
    var startX  = ML;

    // Rail line
    d.save()
     .moveTo(startX, railY)
     .lineTo(startX + CW, railY)
     .lineWidth(3)
     .stroke(hex(RED))
     .restore();

    stops.forEach(function(stop, i) {
      var nx = startX + i * spacing;

      // Week label above
      if (stop.week) {
        d.font('Courier').fontSize(8).fillColor(hex(RED))
         .text(stop.week, nx - 20, railY - 28, { width: 40, align: 'center', lineBreak: false });
      }

      // Circle node
      d.circle(nx, railY, nodeR)
       .lineWidth(2)
       .fillAndStroke(hex(BLACK), hex(RED));

      // Inner dot
      d.circle(nx, railY, 3).fill(hex(RED));

      // Label below
      d.font('Helvetica-Bold').fontSize(8.5).fillColor(hex(WHITE))
       .text(stop.label || '', nx - 36, railY + nodeR + 8, { width: 72, align: 'center', lineBreak: true });

      // Subtitle below label
      if (stop.subtitle) {
        var labelH = d.heightOfString(stop.label || '', { width: 72 });
        d.font('Helvetica').fontSize(7.5).fillColor(hex(MUTED))
         .text(stop.subtitle, nx - 36, railY + nodeR + 8 + labelH + 2, { width: 72, align: 'center', lineBreak: true });
      }
    }, this);

    this.y += mapH + 16;
  }

  hoursTable(rows, totalHrs) {
    var d = this.doc;
    var c1 = CW * 0.70, c2 = CW * 0.30;
    rows.forEach(function(row) {
      var label = row[0], hrs = row[1], isHeader = !hrs;
      this.ensure(24, this._docType, this._client);
      if (isHeader) {
        d.rect(ML, this.y, CW, 22).fill(hex(BORDER));
        d.font('Helvetica-Bold').fontSize(9).fillColor(hex(WHITE))
         .text(label, ML + 8, this.y + 6, { width: c1, lineBreak: false });
      } else {
        d.rect(ML, this.y, CW, 22).fill(hex(DARK_CARD));
        d.rect(ML, this.y, CW, 22).lineWidth(0.3).stroke(hex(BORDER));
        d.font('Helvetica').fontSize(9).fillColor(hex(BODY))
         .text(label, ML + 8, this.y + 6, { width: c1 - 16, lineBreak: false });
        d.font('Helvetica-Bold').fontSize(9).fillColor(hex(MUTED))
         .text(hrs, ML + c1, this.y + 6, { width: c2 - 8, align: 'right', lineBreak: false });
      }
      this.y += 23;
    }, this);

    this.ensure(28, this._docType, this._client);
    d.rect(ML, this.y, CW, 26).fill(hex(RED));
    d.font('Helvetica-Bold').fontSize(10).fillColor(hex(WHITE))
     .text('Total', ML + 8, this.y + 7, { width: c1, lineBreak: false });
    d.font('Helvetica-Bold').fontSize(10).fillColor(hex(WHITE))
     .text(totalHrs + ' hours', ML + c1, this.y + 7, { width: c2 - 8, align: 'right', lineBreak: false });
    this.y += 30;
  }

  cover(title, clientName, date, metrics, pillars) {
    this.fillBlack();
    this.centreLine();
    var d = this.doc;

    // All coordinates converted from ReportLab (y=0 bottom) to pdfkit (y=0 top):
    // pdfkit_y = H - reportlab_y  (for point positions)
    // For rectangles: pdfkit_y = H - (rl_y + height)

    // ── Logo: RL draws at H-72 (bottom of logo), height=38 ──────────────────
    // pdfkit: top of logo = H - (H-72+38) = 34, i.e. y=34
    try {
      var lh = 38, lw = Math.round(lh * (657 / 219));
      d.image(LOGO_DATA, CX - lw / 2, 34, { width: lw, height: lh });
    } catch (e) {
      d.font('Helvetica-Bold').fontSize(22).fillColor(hex(WHITE))
       .text('SABEL', CX - 28, 34, { lineBreak: false });
    }

    // ── Red stem: RL line(CX, H-72, CX, METRIC_TOP=358) ────────────────────
    // pdfkit: from y=72 down to y = H-358 = 483
    d.save().opacity(0.20)
     .moveTo(CX, 72).lineTo(CX, 483)
     .lineWidth(0.8).stroke(hex(RED))
     .restore();

    // ── Doc label: RL y=H-148 → pdfkit y=148 ────────────────────────────────
    d.font('Courier').fontSize(8.5).fillColor(hex(RED))
     .text('SCOPE OF WORK', ML, 148, { lineBreak: false });

    // ── Title: RL y=H-184 → pdfkit y=164 (leave room for label) ─────────────
    var titleSize = title.length > 45 ? 22 : title.length > 30 ? 26 : 30;
    d.font('Helvetica-Bold').fontSize(titleSize).fillColor(hex(WHITE))
     .text(title, ML, 166, { width: CW, lineBreak: true });
    var titleH = d.heightOfString(title, { width: CW, fontSize: titleSize });

    // ── Client name: RL y=H-222 → pdfkit y=222 ──────────────────────────────
    var clientY = Math.max(166 + titleH + 4, 210);
    d.font('Helvetica-Bold').fontSize(20).fillColor(hex(RED))
     .text(clientName, ML, clientY, { lineBreak: false });

    // ── Rule: RL y=H-240 → pdfkit y=240 ─────────────────────────────────────
    var ruleY = clientY + 28;
    d.moveTo(ML, ruleY).lineTo(W - MR, ruleY)
     .lineWidth(0.5).stroke(hex(BORDER));

    // ── Prepared by / date ───────────────────────────────────────────────────
    d.font('Helvetica').fontSize(9).fillColor(hex(MUTED))
     .text('Prepared by Sabel Customer Success Solutions', ML, ruleY + 10, { lineBreak: false });
    d.font('Courier').fontSize(8).fillColor(hex(MUTED))
     .text(date, ML, ruleY + 24, { lineBreak: false });

    // ── Metric cards: RL METRIC_TOP=358, METRIC_H=68 ────────────────────────
    // pdfkit: top = H - METRIC_TOP = 841.89 - 358 = 483, height = 68
    var METRIC_TOP_PK = 483;   // pdfkit y of top of metric strip
    var METRIC_H      = 68;
    var n = metrics.length, mg = 10;
    var mcw = (CW - mg * (n - 1)) / n;
    var mx  = ML;

    metrics.forEach(function(m) {
      d.rect(mx, METRIC_TOP_PK, mcw, METRIC_H).fill(hex(DARK_CARD));
      d.rect(mx, METRIC_TOP_PK, 3, METRIC_H).fill(hex(RED));
      d.rect(mx, METRIC_TOP_PK, mcw, METRIC_H).lineWidth(0.4).stroke(hex(BORDER));
      // Value: RL drawString at METRIC_TOP-36 from bottom → pdfkit = METRIC_TOP_PK + 14
      d.font('Helvetica-Bold').fontSize(26).fillColor(hex(WHITE))
       .text(m[0], mx + 12, METRIC_TOP_PK + 10, { width: mcw - 20, lineBreak: false });
      // Label: RL at METRIC_TOP-52 → pdfkit = METRIC_TOP_PK + 46
      d.font('Courier').fontSize(7).fillColor(hex(MUTED))
       .text(m[1].toUpperCase(), mx + 12, METRIC_TOP_PK + 46, { width: mcw - 20, lineBreak: false });
      mx += mcw + mg;
    });

    // ── Pillar section: RL PTOP=198, PH=84 ──────────────────────────────────
    // pdfkit top of pillars = H - PTOP = 841.89 - 198 = 643
    // pdfkit bottom         = H - (PTOP - PH) = H - 114 = 727
    var PTOP_PK = 643;    // pdfkit y of top of pillar strip
    var PH      = 84;
    var pgap    = 6;
    var pcw     = (CW - pgap * 4) / 5;
    var R       = 6;

    // ── Family-tree lines ────────────────────────────────────────────────────
    // Vertical: from bottom of metric band to BUS_Y
    // RL BUS_Y = PTOP + 20 = 218 → pdfkit = H - 218 = 623
    var BUS_PK = H - 218;   // 623
    d.save().opacity(0.22)
     // Vertical drop from metric bottom to bus
     .moveTo(CX, METRIC_TOP_PK + METRIC_H).lineTo(CX, BUS_PK)
     .lineWidth(0.9).stroke(hex(RED))
     // Horizontal bus
     .moveTo(ML + pcw / 2, BUS_PK).lineTo(ML + 4 * (pcw + pgap) + pcw / 2, BUS_PK)
     .lineWidth(0.9).stroke(hex(RED))
     .restore();

    // Vertical drops to each pillar
    d.save().opacity(0.22);
    for (var i = 0; i < 5; i++) {
      var ccx = ML + i * (pcw + pgap) + pcw / 2;
      d.moveTo(ccx, BUS_PK).lineTo(ccx, PTOP_PK).lineWidth(0.9).stroke(hex(RED));
    }
    d.restore();

    // ── Draw pillar cards ────────────────────────────────────────────────────
    pillars.forEach(function(pillar, i) {
      var num = pillar[0], name = pillar[1], active = pillar[2];
      var px = ML + i * (pcw + pgap);

      // Card background
      d.rect(px, PTOP_PK, pcw, PH).fill(hex(DARK_CARD));

      if (active) {
        // Red left strip (rounded on left)
        d.rect(px, PTOP_PK, 8, PH).fill(hex(RED));
        // Red border
        d.rect(px, PTOP_PK, pcw, PH).lineWidth(1.4).stroke(hex(RED));
      } else {
        d.rect(px, PTOP_PK, pcw, PH).lineWidth(0.6).stroke(hex(BORDER));
      }

      // Number label
      d.font('Courier').fontSize(7).fillColor(hex(active ? RED : MUTED))
       .text(num, px + 10, PTOP_PK + 10, { lineBreak: false });

      // Pillar name
      var nameLines = name.split('\n');
      var nameY = PTOP_PK + 26;
      nameLines.forEach(function(ln) {
        d.font('Helvetica-Bold').fontSize(8.5).fillColor(hex(active ? WHITE : MUTED))
         .text(ln, px + 10, nameY, { width: pcw - 20, lineBreak: false });
        nameY += 13;
      });
    });

    this.footer();
    this._docType = 'Scope of Work';
    this._client  = clientName;
  }

  async finalise() {
    this.footer();
    this.doc.end();
    return new Promise((resolve) => {
      this.doc.on('end', () => resolve(Buffer.concat(this.chunks)));
    });
  }
}

// ── Build SOW from Claude's JSON ──────────────────────────────────────────────
async function buildSOWPdf(G) {
  var pdf    = new SabelPDF();
  var today  = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  var client = safe(G.client), project = safe(G.project);
  var procs  = G.procedures || [];

  var hasFin     = !!(G.fin_policy && G.fin_policy.handles && G.fin_policy.handles !== '\u2014');
  var hasRouting = !!(G.routing    && G.routing.inbox_summary && G.routing.inbox_summary !== '\u2014');
  var hasMig     = !!(G.migration);

  var procHrs  = procs.length * 3;
  var finHrs   = hasFin    ? 10 : 0;
  var foundHrs = hasRouting ? 8 : 0;
  var migHrs   = hasMig    ? 30 : 0;
  var totalHrs = procHrs + finHrs + foundHrs + migHrs;
  var weeks    = Math.max(1, Math.ceil(totalHrs / 8));

  var metrics = [
    [String(totalHrs),   'Total Hours'],
    [String(procs.length || '0'), 'Procedures'],
    [String(weeks),      'Weeks Est.'],
  ];
  var pillars = [
    ['01', 'Transformation\nBlueprint', false],
    ['02', 'Intercom\nFoundations',      hasRouting],
    ['03', 'Automation\nEngine',         procs.length > 0],
    ['04', 'Fin\nEnablement',            hasFin],
    ['05', 'Migration\nAccelerator',     hasMig],
  ];

  pdf.cover(project, client, today, metrics, pillars);
  pdf._docType = 'Scope of Work';
  pdf._client  = client;

  pdf.newPage('Scope of Work', client);

  var sn = 0;

  function secBlock(tag, title) {
    sn++;
    pdf.sectionLabel(String(sn).padStart(2,'0') + '  \u2014  ' + tag);
    pdf.sectionTitle(title);
  }

  // Overview
  secBlock('OVERVIEW', 'Engagement Summary');
  pdf.body(safe(G.summary));
  pdf.sp(18);

  // Foundations
  if (hasRouting) {
    secBlock('INTERCOM FOUNDATIONS', 'Workflow and Inbox Optimisation');
    var rt = G.routing;
    pdf.body(safe(rt.inbox_summary));
    pdf.sp(10);
    if (rt.assignment_method && rt.assignment_method !== '\u2014')
      pdf.bullet('Assignment method: ' + safe(rt.assignment_method));
    if (rt.hours && rt.hours !== '\u2014')
      pdf.bullet('Business hours: ' + safe(rt.hours));
    if (rt.out_of_hours && rt.out_of_hours !== '\u2014')
      pdf.bullet('Out-of-hours handling: ' + safe(rt.out_of_hours));
    if (rt.team_summary && rt.team_summary !== '\u2014')
      pdf.bullet('Team structure: ' + safe(rt.team_summary));
    pdf.subtotal(foundHrs);
    pdf.sp(18);
  }

  // Automation Engine
  if (procs.length > 0) {
    secBlock('AUTOMATION ENGINE', 'Fin AI Procedures');
    pdf.body('The following procedures are included in this engagement. Each is built, tested, and signed off before activation.');
    pdf.sp(10);
    procs.forEach(function(proc, i) {
      pdf.procedureCard(
        'PROCEDURE ' + String(i + 1).padStart(2, '0'),
        safe(proc.name),
        safe(proc.description),
        (proc.build_notes && proc.build_notes !== '\u2014') ? safe(proc.build_notes) : null,
        3
      );
      pdf.sp(8);
    });
    pdf.subtotal(procHrs);
    pdf.sp(18);
  }

  // Fin Enablement
  if (hasFin) {
    secBlock('FIN ENABLEMENT', 'Fin AI Configuration and Launch');
    var fp = G.fin_policy;
    pdf.body(safe(fp.knowledge_summary || fp.handles));
    pdf.sp(10);
    pdf.bullet('Define and document Fin policy guidance', 2);
    pdf.bullet('Prepare knowledge sources for Fin', 3);
    pdf.bullet('Configure and launch Fin using conservative CAPS trial', 2);
    pdf.bullet('Fin quality loop and targeted adjustments', 3);
    if (fp.constraints && fp.constraints !== '\u2014') {
      pdf.sp(6);
      pdf.body('Policy constraints: ' + safe(fp.constraints));
    }
    pdf.subtotal(finHrs);
    pdf.sp(18);
  }

  // Migration
  if (hasMig) {
    secBlock('MIGRATION ACCELERATOR', safe(G.migration.source_platform) + ' to Intercom');
    pdf.body(safe(G.migration.scope_summary));
    pdf.sp(10);
    if (G.migration.volume && G.migration.volume !== '\u2014')
      pdf.bullet('Estimated volume: ' + safe(G.migration.volume));
    if (G.migration.go_live && G.migration.go_live !== '\u2014')
      pdf.bullet('Go-live target: ' + safe(G.migration.go_live));
    pdf.subtotal(migHrs);
    pdf.sp(18);
  }

  // Summary table
  secBlock('SUMMARY', 'Hours Summary');
  var tRows = [];
  if (hasRouting) {
    tRows.push(['02  \u2014  Intercom Foundations', null]);
    tRows.push(['Workflow and Inbox Optimisation', foundHrs + ' hrs']);
  }
  if (procs.length > 0) {
    tRows.push(['03  \u2014  Automation Engine', null]);
    procs.forEach(function(p, i) {
      tRows.push(['Procedure ' + String(i+1).padStart(2,'0') + ' \u2014 ' + safe(p.name), '3 hrs']);
    });
  }
  if (hasFin) {
    tRows.push(['04  \u2014  Fin Enablement', null]);
    tRows.push(['Fin AI Configuration and Launch', finHrs + ' hrs']);
  }
  if (hasMig) {
    tRows.push(['05  \u2014  Migration Accelerator', null]);
    tRows.push([safe(G.migration.source_platform) + ' Migration', migHrs + ' hrs']);
  }
  pdf.hoursTable(tRows, totalHrs);
  pdf.sp(18);

  // Out of scope
  secBlock('EXCLUSIONS', 'Out of Scope');
  pdf.body('The following items are not included in this engagement:');
  pdf.sp(6);
  pdf.bullet('Help Centre article creation, rewriting, or structural reorganisation');
  pdf.bullet('Ongoing retainer support or monitoring after project completion');
  pdf.bullet('Team training beyond standard handover documentation');
  if (G.gaps && G.gaps.length) {
    G.gaps.slice(0, 3).forEach(function(g) { pdf.bullet(safe(g)); });
  }
  pdf.sp(18);

  // Client inputs
  secBlock('REQUIREMENTS', 'Client Inputs Required');
  pdf.body('The following inputs are required from ' + client + ' ahead of and during delivery:');
  pdf.sp(8);
  if (G.delivery_weeks) {
    G.delivery_weeks.forEach(function(wk) {
      if (wk.must_gather && wk.must_gather.length) {
        pdf.body('Week ' + wk.week + ' \u2014 ' + safe(wk.label) + ':');
        wk.must_gather.forEach(function(mg) {
          pdf.bullet(safe(mg.item));
        });
        pdf.sp(4);
      }
    });
  }
  pdf.sp(18);

  // Milestones — tube map
  secBlock('DELIVERY', 'Key Milestones');

  var stops = [];
  if (G.milestones && G.milestones.length) {
    G.milestones.forEach(function(m, i) {
      stops.push({
        label:    safe(m.label),
        subtitle: safe(m.date) !== '\u2014' ? safe(m.date) : '',
        week:     'Week ' + i,
      });
    });
  } else {
    stops = [
      { label: 'Kickoff',       subtitle: 'Project start',      week: 'Week 0' },
      { label: 'Build Start',   subtitle: 'Access confirmed',    week: 'Week 1' },
      { label: 'Delivery',      subtitle: weeks + ' wks from start', week: 'Week ' + weeks },
    ];
  }

  pdf.tubeMap(stops);
  pdf.sp(12);

  // Sign-off
  pdf.ensure(50, 'Scope of Work', client);
  pdf.doc.moveTo(ML, pdf.y).lineTo(W - MR, pdf.y).lineWidth(0.4).stroke(hex(BORDER));
  pdf.y += 14;
  pdf.t(ML, pdf.y, 'Richard Le Bas', { font: 'Helvetica-Bold', size: 9.5, color: WHITE });
  pdf.y += 13;
  pdf.t(ML, pdf.y, 'Director, Sabel Customer Success Solutions', { font: 'Helvetica', size: 9, color: MUTED });

  return pdf.finalise();
}

module.exports = { buildSOWPdf };
