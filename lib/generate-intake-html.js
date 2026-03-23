#!/usr/bin/env node
'use strict';

// ── CLI args ──────────────────────────────────────────────────────────────────
var args = process.argv.slice(2);
var configPath = null, outputPath = null;
for (var i = 0; i < args.length; i++) {
  if (args[i] === '--config')  configPath  = args[i + 1];
  if (args[i] === '--output')  outputPath  = args[i + 1];
}
if (!configPath || !outputPath) {
  console.error('Usage: node generate-intake-html.js --config <path> --output <path>');
  process.exit(1);
}

var fs  = require('fs');
var cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// ── Config defaults ───────────────────────────────────────────────────────────
var CLIENT       = cfg.client_name    || 'Client';
var SLUG         = cfg.client_slug    || 'client';
var PROJECT      = cfg.project_name   || 'Intercom Implementation';
var CONTACT      = cfg.primary_contact || 'your team';
var START_DATE   = cfg.start_date     || '';
var WEEKS        = cfg.delivery_weeks || '';
var PILLARS      = cfg.active_pillars || {};
var PROCS        = cfg.procedures     || [];
var MIG_SOURCE   = cfg.migration_source || 'source platform';
var WEBHOOK_URL  = 'https://sabel-webhook.vercel.app/api/webhook';

var HAS_FOUNDATIONS = !!PILLARS.intercom_foundations;
var HAS_AUTOMATION  = !!PILLARS.automation_engine;
var HAS_FIN         = !!PILLARS.fin_enablement;
var HAS_MIGRATION   = !!PILLARS.migration;
var HAS_SLACK_PROC  = PROCS.some(function(p) { return /slack|bug|escalat/i.test(p); });
var HAS_GHL_PROC    = PROCS.some(function(p) { return /callback|booking|phone|call/i.test(p); });

// ── Shared CSS ────────────────────────────────────────────────────────────────
var CSS = `
  :root {
    --red: #E10600; --red-dim: #B30500; --navy: #2A3547; --dark: #0F1318;
    --body: #1F2937; --muted: #64748B; --border: #DDE3EA; --shade: #F4F6F8;
    --white: #FFFFFF; --input-bg: #FAFBFC; --focus: rgba(225,6,0,0.15);
    --radius: 6px; --mono: 'DM Mono', monospace; --sans: 'DM Sans', sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: var(--sans); background: var(--shade); color: var(--body); min-height: 100vh; line-height: 1.6; }
  .topbar { background: var(--dark); padding: 0 40px; display: flex; align-items: center; height: 56px; position: sticky; top: 0; z-index: 100; border-bottom: 2px solid var(--red); }
  .topbar-brand { font-family: var(--mono); font-size: 11px; letter-spacing: 0.15em; color: var(--white); text-transform: uppercase; }
  .topbar-brand span { color: var(--red); margin-right: 8px; }
  .topbar-right { margin-left: auto; font-family: var(--mono); font-size: 10px; color: #5a6a7a; letter-spacing: 0.1em; text-transform: uppercase; }
  .progress-wrap { background: var(--dark); padding: 0 40px 16px; position: sticky; top: 56px; z-index: 99; }
  .progress-track { height: 2px; background: #2a3547; border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--red); border-radius: 2px; width: 0%; transition: width 0.4s cubic-bezier(0.4,0,0.2,1); }
  .progress-label { font-family: var(--mono); font-size: 10px; color: #5a6a7a; letter-spacing: 0.1em; margin-top: 6px; text-transform: uppercase; }
  .hero { background: var(--navy); padding: 60px 40px 50px; position: relative; overflow: hidden; }
  .hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--red); }
  .hero-inner { max-width: 760px; }
  .hero-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em; color: var(--red); text-transform: uppercase; margin-bottom: 16px; }
  .hero-title { font-size: 32px; font-weight: 600; color: var(--white); line-height: 1.2; margin-bottom: 10px; letter-spacing: -0.02em; }
  .hero-client { font-size: 18px; font-weight: 400; color: var(--red); margin-bottom: 28px; }
  .hero-rule { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin-bottom: 24px; }
  .hero-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; }
  .hero-meta-item label { display: block; font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em; color: #5a6a7a; text-transform: uppercase; margin-bottom: 4px; }
  .hero-meta-item p { font-size: 13px; color: rgba(255,255,255,0.75); }
  .how-to { background: var(--white); border-left: 3px solid var(--red); margin: 32px auto; max-width: 840px; padding: 20px 24px; display: flex; gap: 16px; border-radius: 0 var(--radius) var(--radius) 0; }
  .how-to-icon { font-size: 18px; flex-shrink: 0; margin-top: 2px; }
  .how-to-text p { font-size: 13.5px; color: var(--muted); line-height: 1.65; }
  .how-to-text p + p { margin-top: 6px; }
  .how-to-text strong { color: var(--body); }
  .page { max-width: 840px; margin: 0 auto; padding: 0 24px 80px; }
  .section { background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 24px; overflow: hidden; opacity: 0; transform: translateY(16px); animation: fadeUp 0.4s ease forwards; }
  @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
  .section:nth-child(1){animation-delay:.05s} .section:nth-child(2){animation-delay:.10s} .section:nth-child(3){animation-delay:.15s} .section:nth-child(4){animation-delay:.20s} .section:nth-child(5){animation-delay:.25s} .section:nth-child(6){animation-delay:.30s} .section:nth-child(7){animation-delay:.35s} .section:nth-child(8){animation-delay:.40s} .section:nth-child(9){animation-delay:.45s} .section:nth-child(10){animation-delay:.50s}
  .section-header { padding: 18px 24px; background: var(--navy); display: flex; align-items: center; gap: 12px; }
  .section-num { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: var(--red); background: rgba(225,6,0,0.12); padding: 3px 8px; border-radius: 3px; flex-shrink: 0; }
  .section-title { font-size: 14px; font-weight: 600; color: var(--white); }
  .section-body { padding: 24px; }
  .section-note { font-size: 12.5px; color: var(--muted); font-style: italic; margin-bottom: 20px; line-height: 1.6; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; }
  .field-row.full { grid-template-columns: 1fr; }
  .field-row.thirds { grid-template-columns: 1fr 1fr 1fr; }
  @media(max-width:600px){ .field-row,.field-row.thirds { grid-template-columns: 1fr; } }
  .field-group { display: flex; flex-direction: column; gap: 5px; }
  .field-group label { font-size: 12px; font-weight: 500; color: var(--body); }
  .field-group label .req { color: var(--red); margin-left: 2px; }
  .field-group input,.field-group textarea,.field-group select { font-family: var(--sans); font-size: 13.5px; color: var(--body); background: var(--input-bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 9px 12px; outline: none; transition: border-color .2s,box-shadow .2s; width: 100%; resize: vertical; }
  .field-group input::placeholder,.field-group textarea::placeholder { color: #b0bec5; font-style: italic; }
  .field-group input:focus,.field-group textarea:focus,.field-group select:focus { border-color: var(--red); box-shadow: 0 0 0 3px var(--focus); }
  .field-group textarea { min-height: 80px; }
  .field-group textarea.tall { min-height: 110px; }
  .proc-card { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; margin-bottom: 20px; }
  .proc-card:last-child { margin-bottom: 0; }
  .proc-header { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: var(--shade); border-bottom: 1px solid var(--border); }
  .proc-num { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; color: var(--red); text-transform: uppercase; background: rgba(225,6,0,0.08); padding: 3px 7px; border-radius: 3px; flex-shrink: 0; }
  .proc-name { font-size: 13px; font-weight: 600; color: var(--navy); }
  .proc-desc { font-size: 12px; color: var(--muted); font-style: italic; padding: 12px 18px 0; line-height: 1.55; }
  .proc-fields { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 14px; }
  .contacts-grid { display: grid; grid-template-columns: 200px 1fr 1fr 120px; gap: 0; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  @media(max-width:640px){ .contacts-grid { grid-template-columns: 1fr; } }
  .cg-header { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--white); background: var(--navy); padding: 9px 12px; font-weight: 500; }
  .cg-label { font-size: 12.5px; font-weight: 500; color: var(--body); background: var(--shade); padding: 10px 12px; border-top: 1px solid var(--border); display: flex; align-items: center; }
  .cg-input { padding: 6px 8px; border-top: 1px solid var(--border); border-left: 1px solid var(--border); background: var(--white); }
  .cg-input input { font-family: var(--sans); font-size: 13px; color: var(--body); background: transparent; border: none; outline: none; width: 100%; padding: 4px; }
  .cg-input input::placeholder { color: #b0bec5; font-style: italic; }
  .milestones-grid { display: grid; grid-template-columns: 1fr 160px 1fr; gap: 0; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .oos-confirm { display: flex; align-items: flex-start; gap: 12px; background: var(--shade); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-top: 16px; cursor: pointer; }
  .oos-confirm input[type="checkbox"] { width: 18px; height: 18px; flex-shrink: 0; accent-color: var(--red); cursor: pointer; margin-top: 2px; }
  .oos-confirm label { font-size: 13.5px; color: var(--body); cursor: pointer; line-height: 1.55; }
  .submit-bar { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; }
  .submit-info { flex: 1; min-width: 220px; }
  .submit-info p { font-size: 13px; color: var(--muted); line-height: 1.55; }
  .submit-info strong { color: var(--body); }
  .btn-submit { font-family: var(--sans); font-size: 14px; font-weight: 600; color: var(--white); background: var(--red); border: none; border-radius: var(--radius); padding: 12px 28px; cursor: pointer; transition: background .2s,transform .1s; white-space: nowrap; flex-shrink: 0; }
  .btn-submit:hover { background: var(--red-dim); }
  .btn-submit:active { transform: scale(0.98); }
  .btn-submit:disabled { background: #ccc; cursor: not-allowed; transform: none; }
  .validation-msg { display: none; background: #fff3f3; border: 1px solid #fca5a5; border-radius: var(--radius); padding: 14px 18px; font-size: 13px; color: #b91c1c; margin-bottom: 16px; line-height: 1.5; }
  .validation-msg.show { display: block; }
  .form-footer { text-align: center; padding: 16px 0 40px; }
  .form-footer p { font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; color: #a0aec0; text-transform: uppercase; }
  .field-group input.error,.field-group textarea.error { border-color: var(--red); box-shadow: 0 0 0 3px var(--focus); }
  .success-overlay { display: none; position: fixed; inset: 0; background: rgba(15,19,24,0.85); z-index: 999; align-items: center; justify-content: center; }
  .success-overlay.show { display: flex; }
  .success-card { background: var(--white); border-radius: 10px; padding: 40px 48px; max-width: 460px; width: calc(100% - 40px); text-align: center; border-top: 4px solid var(--red); animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes popIn { from { opacity:0; transform: scale(0.88) translateY(16px); } to { opacity:1; transform: scale(1) translateY(0); } }
  .success-icon { font-size: 40px; margin-bottom: 16px; display: block; }
  .success-card h2 { font-size: 20px; font-weight: 600; color: var(--navy); margin-bottom: 10px; }
  .success-card p { font-size: 14px; color: var(--muted); line-height: 1.6; margin-bottom: 6px; }
  .success-card p strong { color: var(--body); }
`;

// ── Section helpers ───────────────────────────────────────────────────────────
function sectionOpen(num, title) {
  return `<div class="section">
  <div class="section-header">
    <div class="section-num">${String(num).padStart(2,'0')}</div>
    <div class="section-title">${title}</div>
  </div>
  <div class="section-body">`;
}
function sectionClose() { return `</div></div>`; }

function fieldGroup(label, name, type, placeholder, required, opts) {
  opts = opts || {};
  var req = required ? '<span class="req">*</span>' : '';
  if (type === 'textarea') {
    return `<div class="field-group">
      <label>${label}${req}</label>
      <textarea name="${name}" ${opts.tall ? 'class="tall"' : ''} placeholder="${placeholder}"${required ? ' required' : ''}></textarea>
    </div>`;
  }
  if (type === 'select') {
    var options = (opts.options || []).map(function(o) { return `<option>${o}</option>`; }).join('');
    return `<div class="field-group">
      <label>${label}${req}</label>
      <select name="${name}"><option value="">Select...</option>${options}</select>
    </div>`;
  }
  return `<div class="field-group">
    <label>${label}${req}</label>
    <input type="${type || 'text'}" name="${name}" placeholder="${placeholder}"${required ? ' required' : ''}>
  </div>`;
}

function row(fields, cols) {
  var cls = cols === 1 ? 'full' : cols === 3 ? 'thirds' : '';
  return `<div class="field-row ${cls}">${fields.join('')}</div>`;
}

// ── Build milestone rows ──────────────────────────────────────────────────────
function milestoneRow(label, date, name) {
  return `
  <div class="cg-label">${label}</div>
  <div class="cg-input" style="border-left:1px solid var(--border);display:flex;align-items:center;">
    <input type="text" value="${date}" readonly style="color:var(--muted);font-size:12.5px;">
  </div>
  <div class="cg-input"><input type="text" name="${name}" placeholder="Confirmed / change to..."></div>`;
}

// ── Build procedure card ──────────────────────────────────────────────────────
function procCard(num, name, desc, fields) {
  return `<div class="proc-card">
  <div class="proc-header">
    <div class="proc-num">Procedure ${String(num).padStart(2,'0')}</div>
    <div class="proc-name">${name}</div>
  </div>
  <p class="proc-desc">${desc}</p>
  <div class="proc-fields">${fields.join('')}</div>
</div>`;
}

// ── Build all sections ────────────────────────────────────────────────────────
var sectionNum = 0;
var sections   = [];
var requiredFields = [];

// Contacts
sectionNum++;
sections.push(sectionOpen(sectionNum, 'Project contacts') +
  `<p class="section-note">Please provide the details of everyone involved in this project.</p>
  <div class="contacts-grid">
    <div class="cg-header">Role</div>
    <div class="cg-header" style="border-left:1px solid rgba(255,255,255,0.1)">Name</div>
    <div class="cg-header" style="border-left:1px solid rgba(255,255,255,0.1)">Email</div>
    <div class="cg-header" style="border-left:1px solid rgba(255,255,255,0.1)">Notes</div>
    <div class="cg-label">Project decision-maker</div>
    <div class="cg-input"><input type="text" name="c_dm_name" placeholder="Full name"></div>
    <div class="cg-input"><input type="email" name="c_dm_email" placeholder="email@company.com"></div>
    <div class="cg-input"><input type="text" name="c_dm_notes" placeholder="Notes"></div>
    <div class="cg-label">Day-to-day owner</div>
    <div class="cg-input"><input type="text" name="c_oo_name" placeholder="Full name"${CONTACT && CONTACT !== 'your team' ? ' value="' + CONTACT + '"' : ''}></div>
    <div class="cg-input"><input type="email" name="c_oo_email" placeholder="email@company.com"></div>
    <div class="cg-input"><input type="text" name="c_oo_notes" placeholder="Notes"></div>
    <div class="cg-label">Technical contact</div>
    <div class="cg-input"><input type="text" name="c_tc_name" placeholder="Full name"></div>
    <div class="cg-input"><input type="email" name="c_tc_email" placeholder="email@company.com"></div>
    <div class="cg-input"><input type="text" name="c_tc_notes" placeholder="Notes"></div>` +
    (HAS_FIN ? `
    <div class="cg-label">Fin content approver</div>
    <div class="cg-input"><input type="text" name="c_fa_name" placeholder="Full name"></div>
    <div class="cg-input"><input type="email" name="c_fa_email" placeholder="email@company.com"></div>
    <div class="cg-input"><input type="text" name="c_fa_notes" placeholder="Notes"></div>` : '') +
  `</div>` + sectionClose());

// Access
var accessRows = `
  <div class="cg-header">System</div>
  <div class="cg-header" style="border-left:1px solid rgba(255,255,255,0.1)">Access needed</div>
  <div class="cg-header" style="border-left:1px solid rgba(255,255,255,0.1)">Contact to arrange</div>
  <div class="cg-header" style="border-left:1px solid rgba(255,255,255,0.1)">Status</div>
  <div class="cg-label">Intercom</div>
  <div class="cg-input" style="border-left:1px solid var(--border)"><input type="text" value="Admin access for Sabel" readonly style="color:var(--muted);font-style:italic;font-size:12px;"></div>
  <div class="cg-input"><input type="text" name="acc_intercom_contact" placeholder="Name / email"></div>
  <div class="cg-input"><input type="text" name="acc_intercom_status" placeholder="e.g. Done, In progress"></div>`;
if (HAS_SLACK_PROC) accessRows += `
  <div class="cg-label">Slack</div>
  <div class="cg-input" style="border-left:1px solid var(--border)"><input type="text" value="Webhook URL for Slack escalation" readonly style="color:var(--muted);font-style:italic;font-size:12px;"></div>
  <div class="cg-input"><input type="text" name="acc_slack_contact" placeholder="Name / email"></div>
  <div class="cg-input"><input type="text" name="acc_slack_status" placeholder="e.g. Done, In progress"></div>`;
if (HAS_GHL_PROC) accessRows += `
  <div class="cg-label">Go High Level</div>
  <div class="cg-input" style="border-left:1px solid var(--border)"><input type="text" value="Booking link URL for callback flow" readonly style="color:var(--muted);font-style:italic;font-size:12px;"></div>
  <div class="cg-input"><input type="text" name="acc_ghl_contact" placeholder="Name / email"></div>
  <div class="cg-input"><input type="text" name="acc_ghl_status" placeholder="e.g. Done, In progress"></div>`;
if (HAS_MIGRATION) accessRows += `
  <div class="cg-label">${MIG_SOURCE}</div>
  <div class="cg-input" style="border-left:1px solid var(--border)"><input type="text" value="Admin / API access for migration" readonly style="color:var(--muted);font-style:italic;font-size:12px;"></div>
  <div class="cg-input"><input type="text" name="acc_migration_contact" placeholder="Name / email"></div>
  <div class="cg-input"><input type="text" name="acc_migration_status" placeholder="e.g. Done, In progress"></div>`;

sectionNum++;
sections.push(sectionOpen(sectionNum, 'Access and permissions') +
  `<p class="section-note">We need access to these systems before the build can begin.</p>
  <div class="contacts-grid" style="grid-template-columns: 160px 1fr 1fr 140px;">${accessRows}</div>` +
  sectionClose());

// Milestones
var msRows = '';
if (cfg.milestones && cfg.milestones.length) {
  cfg.milestones.forEach(function(m, i) {
    msRows += milestoneRow(m.label, m.date, 'ms_' + i + '_notes');
  });
} else {
  msRows = milestoneRow('Project kickoff', START_DATE || 'TBC', 'ms_kickoff_notes') +
           milestoneRow('Build complete', '', 'ms_build_notes') +
           milestoneRow('Project completion', '', 'ms_complete_notes');
}
sectionNum++;
sections.push(sectionOpen(sectionNum, 'Key dates and milestones') +
  `<p class="section-note">Confirm these dates are correct or note any changes.</p>
  <div class="milestones-grid">
    <div class="cg-header">Milestone</div>
    <div class="cg-header" style="border-left:1px solid rgba(255,255,255,0.1)">Target date</div>
    <div class="cg-header" style="border-left:1px solid rgba(255,255,255,0.1)">Notes / changes</div>
    ${msRows}
  </div>` + sectionClose());

// Out of scope
var oosText = cfg.oos_text || 'Please refer to your signed proposal for the full list of out-of-scope items.';
sectionNum++;
sections.push(sectionOpen(sectionNum, 'Out of scope confirmation') +
  `<p style="font-size:13.5px;color:var(--body);line-height:1.65;margin-bottom:12px;">${oosText}</p>
  <p style="font-size:12.5px;color:var(--muted);font-style:italic;margin-bottom:4px;">Any work outside the agreed scope will be scoped and priced as a separate add-on before work begins.</p>
  <div class="oos-confirm">
    <input type="checkbox" id="oosCheck" name="oos_confirmed">
    <label for="oosCheck">I confirm I have read and understood what is out of scope for this engagement.</label>
  </div>` + sectionClose());

// Fin AI
if (HAS_FIN) {
  requiredFields.push({ name: 'fin_knowledge', label: 'Fin knowledge sources (Section ' + (sectionNum+1) + ')' });
  sectionNum++;
  sections.push(sectionOpen(sectionNum, 'Fin AI — Knowledge and Policy') +
    `<p class="section-note">Fin needs accurate knowledge and clear policy boundaries before it goes live.</p>` +
    row([fieldGroup('Knowledge sources', 'fin_knowledge', 'textarea', 'List your Help Centre URL(s), PDFs, internal docs, or other sources you want Fin to draw on.', true, { tall: true })], 1) +
    row([
      fieldGroup('Topics Fin should handle autonomously', 'fin_handle', 'textarea', 'e.g. general FAQs, account queries, common issues...'),
      fieldGroup('Topics Fin must always hand off to a human', 'fin_handoff', 'textarea', 'e.g. billing disputes, legal queries, complaints...')
    ]) +
    row([
      fieldGroup('Sensitive topics Fin must avoid or flag', 'fin_sensitive', 'textarea', 'e.g. competitor mentions, legal threats...'),
      fieldGroup('Fin tone and persona', 'fin_persona', 'text', 'e.g. Friendly and concise, professional, brand voice')
    ]) +
    row([
      fieldGroup('Fin content approver — name', 'fin_approver_name', 'text', 'Full name'),
      fieldGroup('Fin content approver — email', 'fin_approver_email', 'email', 'email@company.com')
    ]) +
    row([fieldGroup('Any other policy boundaries', 'fin_other_policy', 'textarea', 'Anything else Fin should know before going live...')], 1) +
    sectionClose());
}

// Automation procedures
if (HAS_AUTOMATION && PROCS.length > 0) {
  sectionNum++;
  var procCards = '';
  PROCS.forEach(function(procName, i) {
    var isCallback = /callback|booking|phone|call/i.test(procName);
    var isRefund   = /refund|credit/i.test(procName);
    var isName     = /name.change|company.name/i.test(procName);
    var isBug      = /bug|error|slack|escalat/i.test(procName);

    var fields = [];
    if (isCallback) {
      requiredFields.push({ name: 'p' + (i+1) + '_ghl_url', label: 'Go High Level booking URL (Procedure ' + String(i+1).padStart(2,'0') + ')' });
      fields = [
        fieldGroup('Go High Level booking link URL', 'p' + (i+1) + '_ghl_url', 'url', 'https://...', true),
        row([
          fieldGroup('Trigger phrases', 'p' + (i+1) + '_triggers', 'text', '"call me", "speak to someone", "phone"'),
          fieldGroup('Fallback if link unavailable', 'p' + (i+1) + '_fallback', 'text', 'e.g. Direct to support email')
        ])
      ];
    } else if (isRefund) {
      fields = [
        row([fieldGroup('Reasons a customer might request a refund', 'p' + (i+1) + '_reasons', 'textarea', 'e.g. ad did not perform, posted by mistake, duplicate charge...')], 1),
        row([
          fieldGroup('When should Fin offer a credit instead of a refund?', 'p' + (i+1) + '_credit_logic', 'text', 'e.g. Always offer credit first for performance issues'),
          fieldGroup('Who reviews and approves refund actions?', 'p' + (i+1) + '_approver', 'text', 'Name / role / inbox')
        ]),
        row([fieldGroup('What happens if the agent does not respond in time?', 'p' + (i+1) + '_timeout', 'text', 'e.g. Escalate to manager, reassign...')], 1)
      ];
    } else if (isName) {
      fields = [
        row([fieldGroup('What should Fin do if a job ad was posted in the last 24 hours?', 'p' + (i+1) + '_if_recent', 'textarea', 'e.g. Name change is free, proceed and confirm...')], 1),
        row([fieldGroup('What should Fin do if no recent ad was posted?', 'p' + (i+1) + '_if_old', 'textarea', 'e.g. A charge applies, explain the fee...')], 1),
        row([fieldGroup('Any exceptions or edge cases?', 'p' + (i+1) + '_exceptions', 'text', 'e.g. Premium accounts get one free change per year')], 1)
      ];
    } else if (isBug) {
      requiredFields.push({ name: 'p' + (i+1) + '_slack_channel', label: 'Slack channel (Procedure ' + String(i+1).padStart(2,'0') + ')' });
      requiredFields.push({ name: 'p' + (i+1) + '_error_types', label: 'Error types to capture (Procedure ' + String(i+1).padStart(2,'0') + ')' });
      fields = [
        row([
          fieldGroup('Slack channel name', 'p' + (i+1) + '_slack_channel', 'text', 'e.g. #bugs, #support-escalations', true),
          fieldGroup('Who to tag in Slack', 'p' + (i+1) + '_slack_tag', 'text', 'e.g. @channel, @dev-team')
        ]),
        row([fieldGroup('Types of errors to capture', 'p' + (i+1) + '_error_types', 'textarea', 'e.g. 500 errors, download failures, login issues, payment errors...', true)], 1),
        row([
          fieldGroup('Screenshot policy', 'p' + (i+1) + '_screenshot', 'text', 'e.g. Always, or only for specific error types'),
          fieldGroup('Message to customer while investigating', 'p' + (i+1) + '_customer_msg', 'text', 'e.g. Our team has been alerted and will respond within 2 hours')
        ])
      ];
    } else {
      // Generic procedure
      fields = [
        row([fieldGroup('Describe how this procedure should work', 'p' + (i+1) + '_description', 'textarea', 'Explain the trigger, what Fin does, and how it ends — resolution, handoff, or escalation.', false, { tall: true })], 1),
        row([
          fieldGroup('Any specific rules or conditions?', 'p' + (i+1) + '_rules', 'text', 'e.g. Only for certain customer types, specific thresholds...'),
          fieldGroup('Escalation path if Fin cannot resolve?', 'p' + (i+1) + '_escalation', 'text', 'e.g. Hand off to billing inbox, tag agent...')
        ])
      ];
    }

    procCards += procCard(i+1, procName, 'Fin procedure for ' + procName + '.', fields);
  });

  sections.push(sectionOpen(sectionNum, 'Automation Procedures') +
    `<p class="section-note">We are building ${PROCS.length} Fin procedure${PROCS.length > 1 ? 's' : ''} as part of this project. Your answers here drive the logic — the more detail you can give us, the less back-and-forth before sign-off.</p>` +
    procCards + sectionClose());
}

// Inbox and routing
if (HAS_FOUNDATIONS) {
  requiredFields.push({ name: 'inbox_list', label: 'Inbox list (Inbox and Routing section)' });
  sectionNum++;
  sections.push(sectionOpen(sectionNum, 'Inbox and Routing') +
    `<p class="section-note">We are rebuilding your inbox structure and routing so conversations land in the right place automatically.</p>` +
    row([fieldGroup('List all inboxes or queues you want to keep', 'inbox_list', 'textarea', 'e.g.\nGeneral enquiries\nBilling\nTechnical support', true, { tall: true })], 1) +
    row([fieldGroup('What types of conversations go to each inbox?', 'inbox_routing', 'textarea', 'Describe how you sort conversations...', false, { tall: true })], 1) +
    row([
      fieldGroup('How are conversations assigned?', 'inbox_assignment', 'select', '', false, { options: ['Round-robin (automatic, even distribution)', 'Load-balanced (fewest open conversations)', 'Manual (agents pick up their own)', 'Mix — depends on the inbox'] }),
      fieldGroup('Business hours (days, times, timezone)', 'inbox_hours', 'text', 'e.g. Mon–Fri 9am–5pm AEST')
    ]) +
    row([fieldGroup('Team assignments — which agents handle which inboxes?', 'inbox_teams', 'textarea', 'e.g. Kobe handles billing; dev team handles tech...')], 1) +
    row([
      fieldGroup('Out-of-hours handling', 'inbox_oos', 'textarea', 'What happens to conversations when no one is available?'),
      fieldGroup('Any VIP accounts or priority routing?', 'inbox_vip', 'text', 'e.g. Enterprise accounts route directly to Sarah')
    ]) +
    row([fieldGroup('Existing tags or attributes to carry across?', 'inbox_tags', 'text', 'e.g. Urgent, Premium, Trial, Bug')], 1) +
    sectionClose());
}

// Migration
if (HAS_MIGRATION) {
  sectionNum++;
  sections.push(sectionOpen(sectionNum, 'Migration — ' + MIG_SOURCE + ' to Intercom') +
    `<p class="section-note">We need the following information to plan and execute the migration accurately.</p>` +
    row([
      fieldGroup('Approximate total ticket volume', 'mig_ticket_volume', 'text', 'e.g. 45,000 tickets'),
      fieldGroup('Date range to migrate', 'mig_date_range', 'text', 'e.g. All tickets, or last 2 years only')
    ]) +
    row([fieldGroup('Custom fields to migrate (list them)', 'mig_custom_fields', 'textarea', 'List any custom fields in ' + MIG_SOURCE + ' that need to map to Intercom...')], 1) +
    row([
      fieldGroup('Tags to migrate', 'mig_tags', 'text', 'e.g. All tags, or list specific ones'),
      fieldGroup('File attachments', 'mig_attachments', 'select', '', false, { options: ['Migrate all attachments', 'Exclude attachments', 'Not sure — discuss with Sabel'] })
    ]) +
    row([fieldGroup('Agents to migrate (name + email in both systems)', 'mig_agents', 'textarea', 'List each agent with their email in ' + MIG_SOURCE + ' and their email in Intercom...', false, { tall: true })], 1) +
    row([
      fieldGroup('Go-live / cutover date', 'mig_golive', 'text', 'e.g. 15 April 2026'),
      fieldGroup('Sign-off authority for migration validation', 'mig_signoff', 'text', 'Name and role')
    ]) +
    row([fieldGroup('Any data to exclude from the migration?', 'mig_exclude', 'textarea', 'e.g. Spam tickets, test tickets, tickets before a certain date...')], 1) +
    sectionClose());
}

// Additional notes
sectionNum++;
sections.push(sectionOpen(sectionNum, 'Additional notes') +
  `<p class="section-note">Anything not covered above — other tools we should know about, edge cases, team context, or questions for us.</p>
  <div class="field-group">
    <textarea name="additional_notes" class="tall" placeholder="Add anything else here..."></textarea>
  </div>` + sectionClose());

// ── Validation rules ──────────────────────────────────────────────────────────
var validationJS = `
  var requiredFields = ${JSON.stringify(requiredFields)};
  function validate() {
    var errors = [];
    requiredFields.forEach(function(f) {
      var el = document.querySelector('[name="' + f.name + '"]');
      if (!el || !el.value.trim()) {
        if (el) el.classList.add('error');
        errors.push(f.label);
      } else {
        if (el) el.classList.remove('error');
      }
    });
    if (!document.getElementById('oosCheck').checked) {
      errors.push('Out of scope confirmation');
    }
    return errors;
  }
`;

// ── Full HTML ─────────────────────────────────────────────────────────────────
var html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${CLIENT} — Intercom Kickoff Intake Form</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>

<div class="topbar">
  <div class="topbar-brand"><span>●</span> Sabel Customer Success Solutions</div>
  <div class="topbar-right">Confidential</div>
</div>

<div class="progress-wrap">
  <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
  <div class="progress-label" id="progressLabel">0% complete</div>
</div>

<div class="hero">
  <div class="hero-inner">
    <div class="hero-label">Kickoff Intake Form</div>
    <div class="hero-title">Intercom Implementation</div>
    <div class="hero-client">${CLIENT}</div>
    <hr class="hero-rule">
    <div class="hero-meta">
      <div class="hero-meta-item"><label>Prepared by</label><p>Sabel Customer Success Solutions</p></div>
      ${START_DATE ? `<div class="hero-meta-item"><label>Project start</label><p>${START_DATE}</p></div>` : ''}
      ${WEEKS ? `<div class="hero-meta-item"><label>Estimated duration</label><p>${WEEKS} weeks</p></div>` : ''}
      <div class="hero-meta-item"><label>Est. time to complete</label><p>20–40 minutes</p></div>
    </div>
  </div>
</div>

<div class="page">
  <div class="how-to">
    <div class="how-to-icon">📋</div>
    <div class="how-to-text">
      <p><strong>Complete each section as fully as you can.</strong> If you are unsure of an answer, leave a note and we will cover it in our first check-in.</p>
      <p>When you click <strong>Submit</strong>, your answers go directly to the Sabel team. You will see a confirmation on this page once sent.</p>
    </div>
  </div>

  <form id="kickoffForm" action="${WEBHOOK_URL}" method="POST" novalidate>
    <input type="hidden" name="_client" value="${CLIENT}">
    <input type="hidden" name="_project" value="${PROJECT}">

    ${sections.join('\n')}

    <div class="validation-msg" id="validationMsg"></div>

    <div class="submit-bar">
      <div class="submit-info">
        <p><strong>Ready to submit?</strong> Your answers will be sent securely to the Sabel team.</p>
        <p style="margin-top:6px;">Responses go directly to <strong>Sabel Customer Success Solutions</strong>.</p>
      </div>
      <button type="submit" class="btn-submit" id="submitBtn">Submit form →</button>
    </div>
  </form>

  <div class="form-footer">
    <p>Perfect Made Possible · Sabel Customer Success Solutions · sabelcustomersuccess.com</p>
  </div>
</div>

<div class="success-overlay" id="successOverlay">
  <div class="success-card">
    <span class="success-icon">✅</span>
    <h2>Form submitted — thank you</h2>
    <p>Your answers have been sent to the Sabel team. We will review everything and be in touch shortly.</p>
  </div>
</div>

<script>
function updateProgress() {
  var inputs = document.querySelectorAll('input:not([readonly]):not([type="checkbox"]):not([type="hidden"]), textarea, select');
  var filled = 0;
  inputs.forEach(function(el) { if (el.value && el.value.trim() !== '') filled++; });
  var pct = Math.round((filled / inputs.length) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressLabel').textContent = pct + '% complete';
}
document.addEventListener('input', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    updateProgress();
  }
});

${validationJS}

document.getElementById('kickoffForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var errors = validate();
  var msgEl  = document.getElementById('validationMsg');
  var btn    = document.getElementById('submitBtn');
  if (errors.length > 0) {
    msgEl.innerHTML = '<strong>Please complete the following required fields:</strong><br>• ' + errors.join('<br>• ');
    msgEl.classList.add('show');
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  msgEl.classList.remove('show');
  btn.disabled    = true;
  btn.textContent = 'Submitting…';
  var form = this;
  var fields = form.querySelectorAll('[name]');
  var pairs = [];
  fields.forEach(function(el) {
    if (el.type === 'checkbox') {
      pairs.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(el.checked ? 'Yes - confirmed' : 'Not confirmed'));
    } else if (el.value !== undefined) {
      pairs.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value || ''));
    }
  });
  fetch(form.action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: pairs.join('&'),
  })
  .then(function(r) {
    if (r.ok) {
      document.getElementById('successOverlay').classList.add('show');
      form.reset();
      document.getElementById('progressFill').style.width = '0%';
      document.getElementById('progressLabel').textContent = '0% complete';
      btn.textContent = 'Submitted ✓';
    } else {
      return r.json().then(function(d) { throw new Error(d.error || 'Submission failed'); });
    }
  })
  .catch(function(err) {
    btn.disabled    = false;
    btn.textContent = 'Submit form →';
    msgEl.innerHTML = '<strong>Submission failed.</strong> Please check your connection and try again. Error: ' + err.message;
    msgEl.classList.add('show');
  });
});
document.getElementById('successOverlay').addEventListener('click', function() { this.classList.remove('show'); });
document.querySelectorAll('input, textarea').forEach(function(el) {
  el.addEventListener('input', function() { this.classList.remove('error'); });
});
updateProgress();
</script>
</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf8');
console.log('Generated: ' + outputPath + ' (' + html.length + ' bytes, ' + sectionNum + ' sections)');
