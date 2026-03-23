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
function hex(arr) { var x = c(arr); return 'rgb(' + x.r + ',' + x.g + ',' + x.b + ')'; }
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

    // Logo
    try {
      var lh = 38, lw = Math.round(lh * (657 / 219));
      d.image(LOGO_DATA, CX - lw / 2, 56, { width: lw, height: lh });
    } catch (e) {
      d.font('Helvetica-Bold').fontSize(22).fillColor(hex(WHITE)).text('SABEL', CX - 28, 56, { lineBreak: false });
    }

    // Red stem line
    d.save().opacity(0.20).moveTo(CX, 98).lineTo(CX, H - 430)
     .lineWidth(0.8).stroke(hex(RED)).restore();

    // Doc label
    d.font('Courier').fontSize(8.5).fillColor(hex(RED))
     .text('SCOPE OF WORK', ML, H - 718, { lineBreak: false });

    // Title
    var titleSize = title.length > 45 ? 22 : title.length > 30 ? 26 : 30;
    d.font('Helvetica-Bold').fontSize(titleSize).fillColor(hex(WHITE))
     .text(title, ML, H - 700, { width: CW, lineBreak: true });
    var titleH = d.heightOfString(title, { width: CW });

    // Client
    d.font('Helvetica-Bold').fontSize(20).fillColor(hex(RED))
     .text(clientName, ML, H - 700 + titleH + 6, { lineBreak: false });

    // Rule + meta
    var rY = H - 700 + titleH + 38;
    d.moveTo(ML, rY).lineTo(W - MR, rY).lineWidth(0.5).stroke(hex(BORDER));
    d.font('Helvetica').fontSize(9).fillColor(hex(MUTED))
     .text('Prepared by Sabel Customer Success Solutions', ML, rY + 10, { lineBreak: false });
    d.font('Courier').fontSize(8).fillColor(hex(MUTED))
     .text(date, ML, rY + 24, { lineBreak: false });

    // Metrics + pillars
    this.y = H - 430;
    this.metricCards(metrics);
    this.y = H - 340;
    this.pillarCards(pillars);

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

  // Milestones
  secBlock('DELIVERY', 'Key Milestones');
  if (G.milestones && G.milestones.length) {
    G.milestones.forEach(function(m) {
      pdf.bullet(safe(m.label) + ' \u2014 ' + safe(m.date));
    });
  } else {
    pdf.bullet('Kickoff \u2014 on commencement');
    pdf.bullet('Delivery \u2014 approximately ' + weeks + ' week' + (weeks === 1 ? '' : 's') + ' from commencement');
  }
  pdf.sp(24);

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
