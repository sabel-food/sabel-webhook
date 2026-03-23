'use strict';

async function callClaude(systemPrompt, userPrompt) {
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  var response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    var errText = await response.text();
    throw new Error('Claude API error ' + response.status + ': ' + errText);
  }

  var data = await response.json();
  return data.content[0].text;
}

function cleanJson(text) {
  var s = text.replace(/^```json\s*/gi, '').replace(/^```\s*/gi, '').replace(/```\s*$/gi, '').trim();
  var match = s.match(/\{[\s\S]*\}/);
  return match ? match[0] : s;
}

var SYSTEM = `You are a senior project delivery consultant at Sabel Customer Success Solutions, an Intercom integration partner based in Melbourne, Australia. A client has completed their kickoff intake form. Read their answers carefully and produce structured content for two documents: an Internal Delivery Plan and a Kickoff Summary. UK English. No em dashes. Be specific — use the client's actual answers. Where answers are missing, note this as a gap. Return valid JSON only, no preamble, no markdown fences.`;

function buildUserPrompt(R) {
  function f(k) {
    var v = R[k];
    return (v && String(v).trim() && v !== '(not provided)') ? String(v).trim() : '(not provided)';
  }

  // Collect procedure numbers dynamically
  var procNums = [];
  Object.keys(R).forEach(function(k) {
    var m = k.match(/^p(\d+)_/);
    if (m) { var n = parseInt(m[1]); if (procNums.indexOf(n) === -1) procNums.push(n); }
  });
  procNums.sort(function(a, b) { return a - b; });

  var procDump = procNums.map(function(n) {
    var fields = Object.keys(R).filter(function(k) { return k.startsWith('p' + n + '_'); });
    return 'Procedure ' + n + ':\n' + fields.map(function(k) {
      return '  ' + k.replace('p' + n + '_', '') + ': ' + f(k);
    }).join('\n');
  }).join('\n\n');

  var msDump = Object.keys(R).filter(function(k) { return k.startsWith('ms_'); })
    .map(function(k) { return k.replace('ms_', '').replace(/_/g, ' ') + ': ' + f(k); }).join('\n');

  return `CLIENT: ${f('_client')}
PROJECT: ${f('_project')}

CONTACTS:
Decision-maker: ${f('c_dm_name')} | ${f('c_dm_email')} | ${f('c_dm_notes')}
Day-to-day owner: ${f('c_oo_name')} | ${f('c_oo_email')} | ${f('c_oo_notes')}
Technical: ${f('c_tc_name')} | ${f('c_tc_email')} | ${f('c_tc_notes')}
Fin approver: ${f('c_fa_name')} | ${f('c_fa_email')} | ${f('c_fa_notes')}

ACCESS:
Intercom: ${f('acc_intercom_contact')} | ${f('acc_intercom_status')}
Slack: ${f('acc_slack_contact')} | ${f('acc_slack_status')}
Go High Level: ${f('acc_ghl_contact')} | ${f('acc_ghl_status')}
Migration platform: ${f('acc_migration_contact')} | ${f('acc_migration_status')}

OOS CONFIRMED: ${f('oos_confirmed')}

FIN AI:
Knowledge sources: ${f('fin_knowledge')}
Handles: ${f('fin_handle')}
Hands off: ${f('fin_handoff')}
Sensitive: ${f('fin_sensitive')}
Refund threshold: ${f('fin_refund_threshold')}
Credit value: ${f('fin_credit_value')}
Persona: ${f('fin_persona')}
Approver: ${f('fin_approver_name')} | ${f('fin_approver_email')}
Other policy: ${f('fin_other_policy')}

PROCEDURES:
${procDump || '(none provided)'}

INBOX AND ROUTING:
Inboxes: ${f('inbox_list')}
Routing: ${f('inbox_routing')}
Assignment: ${f('inbox_assignment')}
Hours: ${f('inbox_hours')}
Teams: ${f('inbox_teams')}
Out-of-hours: ${f('inbox_oos')}
VIP: ${f('inbox_vip')}
Tags: ${f('inbox_tags')}

MIGRATION:
Volume: ${f('mig_ticket_volume')}
Date range: ${f('mig_date_range')}
Custom fields: ${f('mig_custom_fields')}
Tags: ${f('mig_tags')}
Attachments: ${f('mig_attachments')}
Agents: ${f('mig_agents')}
Go-live: ${f('mig_golive')}
Sign-off: ${f('mig_signoff')}
Exclude: ${f('mig_exclude')}

MILESTONE NOTES:
${msDump || '(none)'}

ADDITIONAL NOTES: ${f('additional_notes')}

---

Return ONLY this JSON. Use the client's actual answers. Keep all string values to 1-2 sentences max. Missing answers become gap items.

{
  "client": "client name",
  "project": "project name",
  "summary": "2 sentence engagement overview",
  "contacts": [{ "role": "string", "name": "string", "email": "string", "notes": "string" }],
  "access": [{ "system": "string", "contact": "string", "status": "string", "blocker": false }],
  "gaps": ["concise action-item for missing info"],
  "fin_policy": {
    "knowledge_summary": "1 sentence on knowledge sources",
    "handles": "1 sentence on what Fin resolves",
    "handoffs": "1 sentence on escalations",
    "constraints": "thresholds and limits",
    "persona": "tone",
    "approver": "name and email"
  },
  "procedures": [{
    "number": 1,
    "name": "string",
    "description": "2 sentences specific to this client",
    "build_notes": "key config details from client answers",
    "ready_to_build": true,
    "blockers": ""
  }],
  "routing": {
    "inbox_summary": "2 sentences on inbox structure",
    "assignment_method": "string",
    "hours": "string",
    "out_of_hours": "string",
    "team_summary": "string"
  },
  "migration": null,
  "delivery_weeks": [{
    "week": 0,
    "label": "Setup",
    "richard_tasks": ["string"],
    "chris_tasks": ["string"],
    "honey_tasks": ["string"],
    "must_gather": [{
      "item": "string",
      "collect": "what to collect",
      "owner": "name",
      "drive": "Drive path",
      "motion": "task name and status"
    }]
  }],
  "milestones": [{ "label": "string", "date": "string", "client_note": "string" }],
  "risks": ["1 sentence risk"],
  "additional_notes": ""
}`;
}

async function generateDocumentContent(R) {
  var raw     = await callClaude(SYSTEM, buildUserPrompt(R));
  var cleaned = cleanJson(raw);
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Claude returned invalid JSON: ' + e.message + ' | Raw start: ' + raw.slice(0, 200));
  }
}

module.exports = { generateDocumentContent };
