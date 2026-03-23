'use strict';

const br   = require('./brand.js');
const { LOGO_DATA } = require('./logo.js');
const { Document, Packer, Table, TableRow, TableCell, Paragraph,
        WidthType, ShadingType, BorderStyle } = br;
const { C, CW, BULLETS, r, p, h1, h2, h3, body, note, gap,
        labelCell, valueCell, nColTable, answerBlock,
        coverBlock, docConfig, sectionProps, tblBorders } = br;

function v(val) {
  return (val && val !== '(not provided)' && String(val).trim()) ? String(val).trim() : '—';
}

function procSection(num, name, desc, fields, kids) {
  kids.push(new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [r(num + '  ', { pt: 9, bold: true, color: C.red }), r(name, { pt: 11, bold: true, color: C.navy })],
  }));
  kids.push(new Paragraph({ spacing: { before: 0, after: 80 }, children: [r(desc, { pt: 9.5, color: C.muted, italic: true })] }));
  fields.forEach(function(f) {
    answerBlock(f[0], f[1]).forEach(function(el) { kids.push(el); });
  });
}

function buildKickoffSummary(R) {
  var kids = [];
  var today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Cover
  coverBlock(LOGO_DATA, 'Kickoff Summary', 'Intercom Implementation — Completed Intake', 'WorkInitiatives', today)
    .forEach(function(el) { kids.push(el); });

  kids.push(note('This document summarises the answers provided by WorkInitiatives via the Kickoff Intake Form. It is the authoritative reference for build decisions across this engagement.'));
  kids.push(gap(120));

  // Contacts
  kids.push(h1('Project Contacts'));
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

  // Access
  kids.push(h1('Access and Permissions'));
  kids.push(nColTable(
    ['System', 'Contact to arrange', 'Status'],
    [25, 40, 35],
    [
      [['Intercom'],      v(R.acc_intercom_contact), v(R.acc_intercom_status)],
      [['Slack'],         v(R.acc_slack_contact),    v(R.acc_slack_status)],
      [['Go High Level'], v(R.acc_ghl_contact),      v(R.acc_ghl_status)],
    ]
  ));
  kids.push(gap(60));
  kids.push(note('Out-of-scope confirmation: ' + v(R.oos_confirmed)));
  kids.push(gap(160));

  // Fin policy
  kids.push(h1('Fin AI — Knowledge and Policy'));
  [
    ['Knowledge sources',              v(R.fin_knowledge)],
    ['Topics Fin handles autonomously', v(R.fin_handle)],
    ['Topics Fin always hands off',    v(R.fin_handoff)],
    ['Sensitive topics to flag',       v(R.fin_sensitive)],
    ['Refund threshold',               v(R.fin_refund_threshold)],
    ['Job ad credit value',            v(R.fin_credit_value)],
    ['Fin tone and persona',           v(R.fin_persona)],
    ['Fin content approver',           v(R.fin_approver_name) + (v(R.fin_approver_email) !== '—' ? '  —  ' + v(R.fin_approver_email) : '')],
    ['Other policy notes',             v(R.fin_other_policy)],
  ].forEach(function(pair) {
    answerBlock(pair[0], pair[1]).forEach(function(el) { kids.push(el); });
  });
  kids.push(gap(160));

  // Procedures
  kids.push(h1('Automation Procedures'));
  procSection('P01', 'Phone and Callback Booking',
    'Fin presents the Go High Level booking link when a customer asks to speak with someone or requests a callback.',
    [['Go High Level booking URL', v(R.p01_ghl_url)], ['Trigger phrases', v(R.p01_triggers)], ['Fallback if link broken', v(R.p01_fallback)]],
    kids);
  procSection('P02', 'Refund Handling with Agent-in-the-Loop',
    'Fin triages the reason, offers a job ad credit where appropriate, and pauses for agent approval.',
    [['Refund reasons', v(R.p02_refund_reasons)], ['Credit logic', v(R.p02_credit_logic)], ['Approving agent', v(R.p02_approver)], ['No-response action', v(R.p02_timeout)]],
    kids);
  procSection('P03', 'Company Name Change',
    'Fin checks whether a job ad was posted in the last 24 hours and routes the customer to the correct outcome.',
    [['If ad posted in last 24 hrs', v(R.p03_if_recent)], ['If no recent ad', v(R.p03_if_old)], ['Exceptions', v(R.p03_exceptions)]],
    kids);
  procSection('P04', 'Bug and Error Capture with Slack Escalation',
    'Fin captures error details and fires a Slack notification immediately, including outside business hours.',
    [['Slack channel', v(R.p04_slack_channel)], ['Slack tag', v(R.p04_slack_tag)], ['Error types', v(R.p04_error_types)], ['Screenshot policy', v(R.p04_screenshot)], ['Customer message', v(R.p04_customer_msg)]],
    kids);
  kids.push(gap(160));

  // Inbox and routing
  kids.push(h1('Inbox and Routing'));
  [
    ['Inbox list',             v(R.inbox_list)],
    ['Routing logic',          v(R.inbox_routing)],
    ['Assignment method',      v(R.inbox_assignment)],
    ['Business hours',         v(R.inbox_hours)],
    ['Team assignments',       v(R.inbox_teams)],
    ['Out-of-hours handling',  v(R.inbox_oos)],
    ['VIP routing',            v(R.inbox_vip)],
    ['Existing tags',          v(R.inbox_tags)],
  ].forEach(function(pair) {
    answerBlock(pair[0], pair[1]).forEach(function(el) { kids.push(el); });
  });
  kids.push(gap(160));

  // Additional notes (only if provided)
  if (v(R.additional_notes) !== '—') {
    kids.push(h1('Additional Notes'));
    answerBlock('Notes from client', v(R.additional_notes)).forEach(function(el) { kids.push(el); });
    kids.push(gap(160));
  }

  // Milestone confirmation
  kids.push(h1('Milestone Confirmation'));
  kids.push(nColTable(
    ['Milestone', 'Target date', 'Client notes'],
    [40, 22, 38],
    [
      [['Project kickoff'],                '1 April 2026',  v(R.ms_kickoff_notes)],
      [['Fin knowledge confirmed'],        '4 April 2026',  v(R.ms_fin_notes)],
      [['Procedures 01 and 02 signed off'],'4 April 2026',  v(R.ms_p12_notes)],
      [['Procedures 03 and 04 signed off'],'11 April 2026', v(R.ms_p34_notes)],
      [['Inbox routing live'],             '11 April 2026', v(R.ms_routing_notes)],
      [['Fin launched on CAPS trial'],     '11 April 2026', v(R.ms_finlive_notes)],
      [['Project completion'],             '15 April 2026', v(R.ms_complete_notes)],
    ]
  ));

  var cfg = docConfig();
  return new Document({ styles: cfg.styles, numbering: cfg.numbering, sections: [Object.assign({ children: kids }, sectionProps())] });
}

module.exports = { buildKickoffSummary };
