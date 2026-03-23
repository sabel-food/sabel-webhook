'use strict';

const br = require('./brand.js');
const { LOGO_DATA } = require('./logo.js');
const { Document, Packer, Table, TableRow, TableCell, Paragraph,
        WidthType, ShadingType, BorderStyle } = br;
const { C, CW, BULLETS, r, p, h1, h2, h3, body, note, gap,
        labelCell, valueCell, nColTable, answerBlock,
        coverBlock, docConfig, sectionProps, tblBorders } = br;

function safe(v) { return (v && String(v).trim()) ? String(v).trim() : '—'; }

function pairBlock(label, value, kids) {
  kids.push(new Paragraph({ spacing: { before: 100, after: 20 }, children: [r(label, { pt: 9.5, bold: true, color: C.navy })] }));
  var isEmpty = !value || value === '—';
  kids.push(new Paragraph({ spacing: { before: 0, after: 80 }, children: [r(isEmpty ? '—' : value, { pt: 10, color: isEmpty ? C.muted : C.body, italic: isEmpty })] }));
}

function buildKickoffSummaryDynamic(G) {
  var kids = [];
  var today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  coverBlock(LOGO_DATA, 'Kickoff Summary', safe(G.project) + ' — Completed Intake', safe(G.client), today)
    .forEach(function(el) { kids.push(el); });

  kids.push(note('This document summarises the answers provided via the Kickoff Intake Form. It is the authoritative reference for build decisions across this engagement.'));
  if (G.summary) {
    kids.push(gap(60));
    kids.push(body(safe(G.summary)));
  }
  kids.push(gap(120));

  // Contacts
  kids.push(h1('Project Contacts'));
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

  // Access
  kids.push(h1('Access and Permissions'));
  if (G.access && G.access.length) {
    kids.push(nColTable(
      ['System', 'Contact', 'Status'],
      [25, 40, 35],
      G.access.map(function(a) {
        return [[ safe(a.system) ], safe(a.contact), safe(a.status)];
      })
    ));
  }
  kids.push(gap(160));

  // Fin policy
  if (G.fin_policy) {
    kids.push(h1('Fin AI — Knowledge and Policy'));
    var fp = G.fin_policy;
    pairBlock('Knowledge sources', safe(fp.knowledge_summary), kids);
    pairBlock('Topics Fin handles autonomously', safe(fp.handles), kids);
    pairBlock('Topics Fin always hands off', safe(fp.handoffs), kids);
    pairBlock('Policy constraints and thresholds', safe(fp.constraints), kids);
    pairBlock('Fin tone and persona', safe(fp.persona), kids);
    pairBlock('Fin content approver', safe(fp.approver), kids);
    kids.push(gap(160));
  }

  // Procedures
  if (G.procedures && G.procedures.length) {
    kids.push(h1('Automation Procedures'));
    G.procedures.forEach(function(proc) {
      kids.push(new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          r('P' + String(proc.number).padStart(2,'0') + '  ', { pt: 9, bold: true, color: C.red }),
          r(safe(proc.name), { pt: 11, bold: true, color: C.navy }),
          r(proc.ready_to_build ? '' : '  — NOT READY', { pt: 9, bold: true, color: C.red }),
        ],
      }));

      kids.push(new Paragraph({ spacing: { before: 0, after: 80 }, children: [r(safe(proc.description), { pt: 10, color: C.body })] }));

      if (proc.build_notes && proc.build_notes !== '—') {
        kids.push(new Paragraph({ spacing: { before: 40, after: 20 }, children: [r('Build notes', { pt: 9.5, bold: true, color: C.navy })] }));
        kids.push(new Paragraph({ spacing: { before: 0, after: 80 }, children: [r(safe(proc.build_notes), { pt: 9.5, color: C.muted, italic: true })] }));
      }

      if (!proc.ready_to_build && proc.blockers) {
        kids.push(new Paragraph({ spacing: { before: 40, after: 20 }, children: [r('Blockers', { pt: 9.5, bold: true, color: C.red })] }));
        kids.push(new Paragraph({ spacing: { before: 0, after: 80 }, children: [r(safe(proc.blockers), { pt: 9.5, color: C.red })] }));
      }
    });
    kids.push(gap(160));
  }

  // Routing
  if (G.routing) {
    kids.push(h1('Inbox and Routing'));
    var rt = G.routing;
    pairBlock('Inbox structure', safe(rt.inbox_summary), kids);
    pairBlock('Assignment method', safe(rt.assignment_method), kids);
    pairBlock('Business hours', safe(rt.hours), kids);
    pairBlock('Out-of-hours handling', safe(rt.out_of_hours), kids);
    pairBlock('Team assignments', safe(rt.team_summary), kids);
    kids.push(gap(160));
  }

  // Migration
  if (G.migration) {
    kids.push(h1('Migration — ' + safe(G.migration.source_platform)));
    var mg = G.migration;
    pairBlock('Scope summary', safe(mg.scope_summary), kids);
    pairBlock('Ticket volume', safe(mg.volume), kids);
    pairBlock('Go-live date', safe(mg.go_live), kids);
    if (mg.blockers && mg.blockers !== '—') {
      pairBlock('Migration blockers', safe(mg.blockers), kids);
    }
    kids.push(gap(160));
  }

  // Gaps
  if (G.gaps && G.gaps.length) {
    kids.push(h1('Gaps to Resolve'));
    G.gaps.forEach(function(g) {
      kids.push(new Paragraph({ numbering: { reference: 'dash', level: 0 }, spacing: { before: 40, after: 40 }, children: [r(safe(g), { pt: 10, color: C.red })] }));
    });
    kids.push(gap(160));
  }

  // Additional notes
  if (G.additional_notes && G.additional_notes !== '—' && G.additional_notes !== '') {
    kids.push(h1('Additional Notes'));
    kids.push(body(safe(G.additional_notes)));
    kids.push(gap(160));
  }

  // Milestones
  if (G.milestones && G.milestones.length) {
    kids.push(h1('Milestone Confirmation'));
    kids.push(nColTable(
      ['Milestone', 'Target date', 'Client note'],
      [40, 22, 38],
      G.milestones.map(function(m) {
        return [[ safe(m.label) ], safe(m.date), safe(m.client_note)];
      })
    ));
  }

  var cfg = docConfig();
  return new Document({ styles: cfg.styles, numbering: cfg.numbering, sections: [Object.assign({ children: kids }, sectionProps())] });
}

module.exports = { buildKickoffSummaryDynamic };
