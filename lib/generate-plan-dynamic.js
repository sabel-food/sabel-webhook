'use strict';

const br = require('./brand.js');
const { LOGO_DATA } = require('./logo.js');
const { Document, Packer, Table, TableRow, TableCell, Paragraph,
        WidthType, ShadingType } = br;
const { C, CW, BULLETS, r, p, h1, h2, h3, body, note, gap,
        bullet, subbullet, labelCell, valueCell, nColTable,
        mustGatherBlock, coverBlock, docConfig, sectionProps,
        tblBorders, makeInputRow } = br;

function safe(v) { return (v && String(v).trim()) ? String(v).trim() : '—'; }

// ── Snapshot table ─────────────────────────────────────────────────────────
function snapshotTable(G) {
  var c1 = Math.round(CW * 0.26), c2 = CW - c1;
  var procNames = G.procedures ? G.procedures.map(function(p) { return p.name; }).join(', ') : '—';
  var migText   = G.migration ? G.migration.scope_summary : 'Not in scope';

  var rows = [
    ['Client',       safe(G.client)],
    ['Project',      safe(G.project)],
    ['Summary',      safe(G.summary)],
    ['Procedures',   procNames],
    ['Migration',    migText],
    ['Risks',        G.risks && G.risks.length ? G.risks.join('\n') : 'None identified'],
  ];

  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [c1, c2],
    rows: rows.map(function(row) {
      var lines = row[1].split('\n');
      var children = lines.map(function(line, i) {
        return new Paragraph({ spacing: { before: i === 0 ? 0 : 40, after: 0 }, children: [r(line, { pt: 9.5 })] });
      });
      return new TableRow({ children: [
        labelCell(row[0], c1, { bold: true }),
        new TableCell({ borders: tblBorders, width: { size: c2, type: WidthType.DXA },
          shading: { fill: C.tblInput, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: children }),
      ]});
    }),
  });
}

// ── Gaps table ────────────────────────────────────────────────────────────
function gapsTable(gaps) {
  if (!gaps || !gaps.length) return null;
  var c1 = Math.round(CW * 0.06), c2 = CW - c1;
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [c1, c2],
    rows: gaps.map(function(gap, i) {
      return new TableRow({ children: [
        new TableCell({ borders: tblBorders, width: { size: c1, type: WidthType.DXA },
          shading: { fill: C.red, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [r(String(i+1), { pt: 9.5, bold: true, color: C.white })] })] }),
        new TableCell({ borders: tblBorders, width: { size: c2, type: WidthType.DXA },
          shading: { fill: 'FFF3F3', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [r(safe(gap), { pt: 9.5 })] })] }),
      ]});
    }),
  });
}

// ── Week section ──────────────────────────────────────────────────────────
function weekSection(wk, kids) {
  kids.push(h2('Week ' + wk.week + ' — ' + safe(wk.label)));

  if (wk.richard_tasks && wk.richard_tasks.length) {
    kids.push(h3('A)  Richard tasks'));
    wk.richard_tasks.forEach(function(t) { kids.push(bullet(safe(t))); });
    kids.push(gap(80));
  }

  if (wk.chris_tasks && wk.chris_tasks.length) {
    kids.push(h3('B)  Chris tasks'));
    wk.chris_tasks.forEach(function(t) { kids.push(bullet(safe(t))); });
    kids.push(gap(80));
  }

  if (wk.honey_tasks && wk.honey_tasks.length) {
    kids.push(h3('C)  Honey tasks'));
    wk.honey_tasks.forEach(function(t) { kids.push(bullet(safe(t))); });
    kids.push(gap(80));
  }

  if (wk.must_gather && wk.must_gather.length) {
    kids.push(h3('D)  Must gather before Week ' + (wk.week + 1)));
    kids.push(gap(40));
    wk.must_gather.forEach(function(mg) {
      kids.push(mustGatherBlock(
        safe(mg.item),
        safe(mg.collect),
        safe(mg.owner),
        safe(mg.drive),
        safe(mg.motion)
      ));
      kids.push(gap(80));
    });
  }

  kids.push(gap(120));
}

// ── Build document ─────────────────────────────────────────────────────────
function buildDeliveryPlanDynamic(G) {
  var kids = [];
  var today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  coverBlock(LOGO_DATA, 'Internal Delivery Plan', safe(G.project), safe(G.client), today)
    .forEach(function(el) { kids.push(el); });

  // Proposal snapshot
  kids.push(h1('Proposal Snapshot'));
  kids.push(snapshotTable(G));
  kids.push(gap(200));

  // Gaps (if any)
  if (G.gaps && G.gaps.length) {
    kids.push(h1('Gaps to Resolve Before Build'));
    kids.push(note('The following items are missing or unclear based on the client\'s intake form answers. Honey to resolve before the relevant build phase starts.'));
    kids.push(gap(60));
    var gt = gapsTable(G.gaps);
    if (gt) kids.push(gt);
    kids.push(gap(160));
  }

  // Client contacts
  kids.push(h1('Client Contacts'));
  if (G.contacts && G.contacts.length) {
    kids.push(nColTable(
      ['Role', 'Name', 'Email', 'Notes'],
      [28, 22, 28, 22],
      G.contacts.map(function(c) {
        return [[ safe(c.role) ], safe(c.name), safe(c.email), safe(c.notes)];
      })
    ));
  }
  kids.push(gap(160));

  // Access status
  kids.push(h1('Access Status'));
  if (G.access && G.access.length) {
    kids.push(nColTable(
      ['System', 'Contact', 'Status', 'Blocker'],
      [25, 30, 25, 20],
      G.access.map(function(a) {
        return [[ safe(a.system) ], safe(a.contact), safe(a.status), a.blocker ? 'YES' : 'No'];
      })
    ));
  }
  kids.push(gap(200));

  // Week-by-week schedule
  kids.push(h1('Week-by-Week Schedule'));
  if (G.delivery_weeks && G.delivery_weeks.length) {
    G.delivery_weeks.forEach(function(wk) { weekSection(wk, kids); });
  }

  // Milestones
  if (G.milestones && G.milestones.length) {
    kids.push(gap(80));
    kids.push(h1('Milestones'));
    kids.push(nColTable(
      ['Milestone', 'Target date', 'Client note'],
      [40, 22, 38],
      G.milestones.map(function(m) {
        return [[ safe(m.label) ], safe(m.date), safe(m.client_note)];
      })
    ));
    kids.push(gap(200));
  }

  // Weekly update template
  kids.push(h1('Weekly Client Update — Template (Honey)'));
  kids.push(note('Send every week via Slack or email.'));
  kids.push(gap(60));
  kids.push(body('Subject: ' + safe(G.client) + ' x Sabel — Week [X] Update', { color: C.navy }));
  kids.push(gap(40));
  kids.push(body('Hi [client name],'));
  kids.push(body('Here is a quick update on where things stand.'));
  kids.push(gap(60));

  ['Completed last week', "This week's work", 'Waiting on you', 'What we need before next week', 'Decisions needed'].forEach(function(label) {
    kids.push(new Paragraph({ spacing: { before: 100, after: 20 }, children: [r(label, { pt: 10, bold: true, color: C.navy })] }));
    kids.push(makeInputRow());
    kids.push(gap(40));
  });

  var cfg = docConfig();
  return new Document({ styles: cfg.styles, numbering: cfg.numbering, sections: [Object.assign({ children: kids }, sectionProps())] });
}

module.exports = { buildDeliveryPlanDynamic };
