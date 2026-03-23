'use strict';

const br   = require('./brand.js');
const { LOGO_DATA } = require('./logo.js');
const { Document, Packer, Table, TableRow, TableCell, Paragraph,
        WidthType, ShadingType } = br;
const { C, CW, BULLETS, r, p, h1, h2, h3, body, note, gap,
        bullet, subbullet, labelCell, valueCell, nColTable,
        mustGatherBlock, coverBlock, docConfig, sectionProps,
        tblBorders, makeInputRow } = br;

function v(val) {
  return (val && val !== '(not provided)' && String(val).trim()) ? String(val).trim() : '—';
}

function buildDeliveryPlan(R) {
  var kids = [];
  var today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Cover
  coverBlock(LOGO_DATA, 'Internal Delivery Plan', 'Fin AI Enablement and Workflow Automation', 'WorkInitiatives', today)
    .forEach(function(el) { kids.push(el); });

  // Snapshot table
  kids.push(h1('Proposal Snapshot'));
  var c1 = Math.round(CW * 0.26), c2 = CW - c1;
  var snapRows = [
    ['Client',        'WorkInitiatives'],
    ['Project',       'Fin AI Enablement and Workflow Automation'],
    ['Timeline',      '2 weeks — 1 April to 15 April 2026'],
    ['Total hours',   '31 hours'],
    ['Deliverables',  '02 Intercom Foundations (8 hrs): after-hours workflow, Fin entry point, inbox rationalisation, auto-tagging\n\n03 Automation Engine (13 hrs): four Fin procedures\n\n04 Fin Enablement (10 hrs): Fin policy guidance, knowledge prep, CAPS trial launch, quality loop'],
    ['Out of scope',  'Help Centre article creation or rewriting; custom API integrations beyond Slack webhook in Procedure 04; ongoing retainer; team training beyond handover; third-party tools other than Go High Level and Slack'],
    ['Client owner',  'Kobe (Support Lead) — sole point of contact across all phases'],
    ['Assumptions',   'Delivery completes end of Week 2 (~15 April); Chris handles procedure build; Richard handles Fin config and architecture; Honey is Delivery Coordinator'],
  ];
  var snapTableRows = snapRows.map(function(row) {
    var lines = row[1].split('\n\n');
    var children = lines.map(function(line, i) {
      return new Paragraph({ spacing: { before: i === 0 ? 0 : 60, after: 0 }, children: [r(line, { pt: 9.5 })] });
    });
    return new TableRow({ children: [
      labelCell(row[0], c1, { bold: true }),
      new TableCell({ borders: tblBorders, width: { size: c2, type: WidthType.DXA },
        shading: { fill: C.tblInput, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: children }),
    ]});
  });
  kids.push(new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [c1, c2], rows: snapTableRows }));
  kids.push(gap(200));

  // Client contacts (populated)
  kids.push(h1('Client Contacts (from Kickoff Form)'));
  kids.push(nColTable(
    ['Role', 'Name', 'Email', 'Notes'],
    [28, 22, 28, 22],
    [
      [['Project decision-maker'], v(R.c_dm_name), v(R.c_dm_email), v(R.c_dm_notes)],
      [['Day-to-day owner'],       v(R.c_oo_name), v(R.c_oo_email), v(R.c_oo_notes)],
      [['Technical contact'],      v(R.c_tc_name), v(R.c_tc_email), v(R.c_tc_notes)],
      [['Fin content approver'],   v(R.c_fa_name), v(R.c_fa_email), v(R.c_fa_notes)],
    ]
  ));
  kids.push(gap(160));

  // Access status (populated)
  kids.push(h1('Access Status (from Kickoff Form)'));
  kids.push(nColTable(
    ['System', 'Contact to arrange', 'Status'],
    [25, 40, 35],
    [
      [['Intercom'],      v(R.acc_intercom_contact), v(R.acc_intercom_status)],
      [['Slack'],         v(R.acc_slack_contact),    v(R.acc_slack_status)],
      [['Go High Level'], v(R.acc_ghl_contact),      v(R.acc_ghl_status)],
    ]
  ));
  kids.push(gap(200));

  // Week-by-week schedule
  kids.push(h1('Week-by-Week Schedule'));

  // Week 0
  kids.push(h2('Week 0 — Setup (before 1 April 2026)'));
  kids.push(h3('A)  Richard tasks'));
  kids.push(bullet('Review existing Help Centre articles and identify knowledge gaps for Fin'));
  kids.push(bullet('Plan procedure logic for all 4 flows ahead of build start'));
  kids.push(bullet('Confirm Intercom workspace access with Kobe'));
  kids.push(gap(80));
  kids.push(h3('B)  Honey tasks'));
  kids.push(bullet('Create Slack channel: #ext-workinitiatives'));
  kids.push(bullet('Create Google Drive project folder: WorkInitiatives / Fin AI + Automation Build'));
  kids.push(bullet('Confirm Kobe as day-to-day owner and sole stakeholder contact'));
  kids.push(bullet('Schedule weekly check-in (agenda + desired outcome required in advance)'));
  kids.push(bullet('Create MotionAI tasks for all deliverables; mark each as Waiting on Client or Ready for Build'));
  kids.push(bullet('Confirm change control with client: anything outside scope = scoped add-on'));
  kids.push(gap(80));
  kids.push(h3('C)  Must gather BEFORE Week 1'));
  kids.push(gap(40));

  [
    { item: 'Intercom admin access', collect: 'Admin invite accepted by richard@sabelcss.com', owner: 'Kobe', drive: 'WorkInitiatives / Access / screenshot of admin role confirmed', motion: '"Intercom Admin Access" — set to Ready for Build once confirmed' },
    { item: 'Help Centre article list', collect: 'Export or list of all current Help Centre articles (title + URL or export file)', owner: 'Kobe', drive: 'WorkInitiatives / Fin Enablement / HC Article List', motion: '"Fin Knowledge Prep" — set to Ready for Build once received' },
    { item: 'Policy boundaries', collect: 'Refund threshold amounts, job ad credit rules, any topics Fin must not handle autonomously', owner: 'Kobe', drive: 'WorkInitiatives / Fin Enablement / Policy Boundaries', motion: '"Fin Policy Guidance" — Waiting on Client until received' },
  ].forEach(function(g) { kids.push(mustGatherBlock(g.item, g.collect, g.owner, g.drive, g.motion)); kids.push(gap(80)); });

  // Week 1
  kids.push(gap(160));
  kids.push(h2('Week 1 — Fin Setup and Procedures 01 and 02 (1–4 April 2026)'));
  kids.push(h3('A)  Richard / Chris tasks'));
  kids.push(bullet('Define and document Fin policy guidance — 2 hrs'));
  kids.push(bullet('Prepare knowledge sources for Fin — 3 hrs'));
  kids.push(bullet('Build Procedure 01: Phone and Callback Booking — 3 hrs'));
  kids.push(bullet('Build Procedure 02: Refund Handling with Agent-in-the-Loop — 4 hrs'));
  kids.push(gap(80));
  kids.push(h3('B)  Honey tasks'));
  kids.push(bullet('Send Procedure 01 and 02 logic summaries to Kobe for review and sign-off'));
  kids.push(bullet('Chase any outstanding Week 0 items'));
  kids.push(bullet('Send weekly client update'));
  kids.push(bullet('After sign-off on Fin Policy Guidance — write and publish internal Intercom article'));
  kids.push(subbullet('Collection: Policies and Thresholds'));
  kids.push(subbullet('Save article link: WorkInitiatives / Internal Articles'));
  kids.push(gap(80));
  kids.push(h3('C)  Must gather BEFORE Week 2'));
  kids.push(gap(40));

  [
    { item: 'Procedure 01 sign-off — Callback Booking', collect: 'Written confirmation that procedure logic is approved', owner: 'Kobe', drive: 'WorkInitiatives / Procedures / Procedure 01 Sign-off', motion: '"Procedure 01 — Callback Booking" — Ready for Build once approved' },
    { item: 'Procedure 02 sign-off — Refund Handling', collect: 'Written confirmation that refund triage logic and credit offer step are approved', owner: 'Kobe', drive: 'WorkInitiatives / Procedures / Procedure 02 Sign-off', motion: '"Procedure 02 — Refund Handling" — Ready for Build once approved' },
    { item: 'Go High Level booking link', collect: 'The exact booking URL to be used in Procedure 01', owner: 'Kobe', drive: 'WorkInitiatives / Procedures / GHL Booking Link.txt', motion: '"Procedure 01 — Callback Booking" — Waiting on Client until received' },
    { item: 'Slack channel and webhook details', collect: 'Slack channel name for bug escalation; webhook URL or confirm Sabel can create it', owner: 'Kobe', drive: 'WorkInitiatives / Procedures / Slack Webhook Details.txt', motion: '"Procedure 04 — Bug Escalation" — Waiting on Client until received' },
    { item: 'Inbox structure and team assignments', collect: 'List of inboxes/queues, which team handles which type, and routing preferences', owner: 'Kobe', drive: 'WorkInitiatives / Foundations / Inbox Structure.docx', motion: '"Inbox Rationalisation + Routing" — Waiting on Client until received' },
  ].forEach(function(g) { kids.push(mustGatherBlock(g.item, g.collect, g.owner, g.drive, g.motion)); kids.push(gap(80)); });

  // Week 2
  kids.push(gap(160));
  kids.push(h2('Week 2 — Procedures 03 and 04, Foundations, and Fin Launch (7–15 April 2026)'));
  kids.push(h3('A)  Richard / Chris tasks'));
  kids.push(bullet('Build Procedure 03: Company Name Change — 3 hrs'));
  kids.push(bullet('Build Procedure 04: Bug and Error Capture with Slack Escalation — 3 hrs'));
  kids.push(bullet('Configure after-hours workflow, Fin entry point, inbox rationalisation, auto-tagging — 8 hrs'));
  kids.push(bullet('Configure and launch Fin on conservative CAPS trial — 2 hrs'));
  kids.push(bullet('Run Fin quality loop and make targeted adjustments — 3 hrs'));
  kids.push(gap(80));
  kids.push(h3('B)  Honey tasks'));
  kids.push(bullet('Send Procedure 03 and 04 logic summaries to Kobe for sign-off before activation'));
  kids.push(bullet('Confirm inbox structure and routing logic with Kobe before activating Foundations work'));
  kids.push(bullet('Coordinate Fin CAPS trial go-live notification to Kobe'));
  kids.push(bullet('Send weekly client update'));
  kids.push(bullet('After sign-off on each deliverable — write and publish internal Intercom article'));
  kids.push(subbullet('Procedures 01–04 and Foundations: Collection: How Our Setup Works'));
  kids.push(subbullet('Fin Launch and CAPS Config: Collection: How Our Setup Works'));
  kids.push(subbullet('Save all article links: WorkInitiatives / Internal Articles'));
  kids.push(bullet('On completion: compile handover documentation and close project in MotionAI'));
  kids.push(gap(80));
  kids.push(h3('C)  Sign-offs required before go-live'));
  kids.push(gap(40));

  [
    { item: 'Procedure 03 sign-off — Company Name Change', collect: 'Written confirmation that 24-hour ad check logic and both outcome paths are approved', owner: 'Kobe', drive: 'WorkInitiatives / Procedures / Procedure 03 Sign-off', motion: '"Procedure 03 — Company Name Change" — Ready for Build once approved' },
    { item: 'Procedure 04 sign-off — Bug Escalation', collect: 'Written confirmation that screenshot capture flow and Slack alert are approved', owner: 'Kobe', drive: 'WorkInitiatives / Procedures / Procedure 04 Sign-off', motion: '"Procedure 04 — Bug Escalation" — Ready for Build once approved' },
    { item: 'Routing logic review confirmation', collect: 'Written confirmation that routing logic is correct before activation', owner: 'Kobe', drive: 'WorkInitiatives / Foundations / Routing Sign-off', motion: '"Inbox Rationalisation + Routing" — Ready for Build once confirmed' },
  ].forEach(function(g) { kids.push(mustGatherBlock(g.item, g.collect, g.owner, g.drive, g.motion)); kids.push(gap(80)); });

  // Weekly update template
  kids.push(gap(200));
  kids.push(h1('Weekly Client Update — Template (Honey)'));
  kids.push(note('Send every week via Slack or email.'));
  kids.push(gap(60));
  kids.push(body('Subject: WorkInitiatives x Sabel — Week [X] Update', { color: C.navy }));
  kids.push(gap(40));
  kids.push(body('Hi Kobe,'));
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

module.exports = { buildDeliveryPlan };
