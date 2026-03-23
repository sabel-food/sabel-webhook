'use strict';

const { Packer } = require('docx');
const { Resend } = require('resend');
const { buildDeliveryPlan }  = require('../lib/generate-plan.js');
const { buildKickoffSummary } = require('../lib/generate-summary.js');

// ── Config from environment variables ────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM     = process.env.EMAIL_FROM     || 'onboarding@resend.dev';
const EMAIL_PRIMARY  = process.env.EMAIL_PRIMARY  || 'info@sabelcustomersuccess.com';
const EMAIL_CC       = process.env.EMAIL_CC       || 'project-admin@sabelcustomersuccess.com';

// ── Read raw body from stream ─────────────────────────────────────────────────
function getRawBody(req) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    req.on('data', function(chunk) { chunks.push(chunk); });
    req.on('end',  function() { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

// ── Parse urlencoded string into object ──────────────────────────────────────
function parseUrlEncoded(str) {
  var result = {};
  if (!str) return result;
  str.split('&').forEach(function(pair) {
    var idx = pair.indexOf('=');
    if (idx === -1) return;
    var key = decodeURIComponent(pair.slice(0, idx).replace(/\+/g, ' '));
    var val = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
    result[key] = val;
  });
  return result;
}

// ── Parse incoming body — handles urlencoded and JSON ────────────────────────
function parseFields(rawBody, contentType) {
  var fields = {};
  contentType = (contentType || '').toLowerCase();

  if (contentType.includes('application/x-www-form-urlencoded')) {
    fields = parseUrlEncoded(rawBody);
  } else {
    // Try JSON fallback
    try { fields = JSON.parse(rawBody); } catch (e) { fields = {}; }
    if (fields.data && typeof fields.data === 'object') fields = fields.data;
  }

  // Strip metadata fields
  var skip = new Set(['_client', '_project', '_subject', '_replyto', '_cc',
                      '_next', '_gotcha', 'submissionId', 'formId', 'createdAt']);
  var R = {};
  Object.keys(fields).forEach(function(key) {
    if (!skip.has(key)) R[key] = String(fields[key] || '').trim();
  });
  return R;
}

// ── Format a brief plain-text summary for the email body ─────────────────────
function formatEmailSummary(R) {
  function f(label, key) {
    var val = R[key] && R[key] !== '(not provided)' ? R[key] : '—';
    return label + ': ' + val + '\n';
  }
  var lines = [
    'WorkInitiatives — Kickoff Intake Form submitted\n',
    '── Contacts ──────────────────────────────────────────',
    f('Decision-maker', 'c_dm_name') + f('Email', 'c_dm_email'),
    f('Day-to-day owner', 'c_oo_name') + f('Email', 'c_oo_email'),
    f('Fin approver', 'c_fa_name') + f('Email', 'c_fa_email'),
    '',
    '── Access ────────────────────────────────────────────',
    f('Intercom contact', 'acc_intercom_contact') + f('Status', 'acc_intercom_status'),
    f('Slack contact',    'acc_slack_contact')    + f('Status', 'acc_slack_status'),
    f('GHL contact',      'acc_ghl_contact')      + f('Status', 'acc_ghl_status'),
    '',
    '── Key Fin details ───────────────────────────────────',
    f('GHL booking URL',   'p01_ghl_url'),
    f('Slack channel',     'p04_slack_channel'),
    f('Refund threshold',  'fin_refund_threshold'),
    f('Credit value',      'fin_credit_value'),
    '',
    '── Out of scope confirmed ────────────────────────────',
    f('Confirmed', 'oos_confirmed'),
    '',
    'Both documents are attached to this email.',
    'Internal Delivery Plan and Kickoff Summary are ready for the team.',
  ];
  return lines.join('\n');
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS — allow the GitHub Pages form to POST here
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Read raw body directly from stream (req.body is undefined in Vercel serverless)
  var rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (e) {
    console.error('Failed to read body:', e.message);
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  // Parse all form fields
  var R = parseFields(rawBody, req.headers['content-type']);
  console.log('Received submission with', Object.keys(R).length, 'fields');
  console.log('Sample — c_oo_name:', R.c_oo_name, '| p04_slack_channel:', R.p04_slack_channel);

  // Generate both documents
  var planDoc, summaryDoc;
  try {
    planDoc    = buildDeliveryPlan(R);
    summaryDoc = buildKickoffSummary(R);
  } catch (e) {
    console.error('Document generation failed:', e.message, e.stack);
    return res.status(500).json({ error: 'Document generation failed: ' + e.message });
  }

  // Convert to buffers
  var planBuf, summaryBuf;
  try {
    [planBuf, summaryBuf] = await Promise.all([
      Packer.toBuffer(planDoc),
      Packer.toBuffer(summaryDoc),
    ]);
  } catch (e) {
    console.error('DOCX buffer generation failed:', e.message);
    return res.status(500).json({ error: 'Buffer generation failed: ' + e.message });
  }

  // Send email via Resend
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  var resend = new Resend(RESEND_API_KEY);

  try {
    var emailResult = await resend.emails.send({
      from:    EMAIL_FROM,
      to:      EMAIL_PRIMARY,
      cc:      EMAIL_CC,
      subject: 'WorkInitiatives — Kickoff Intake Form submitted',
      text:    formatEmailSummary(R),
      attachments: [
        {
          filename: 'WorkInitiatives - Fin AI Automation Build - Internal Delivery Plan.docx',
          content:  planBuf.toString('base64'),
        },
        {
          filename: 'WorkInitiatives - Fin AI Automation Build - Kickoff Summary.docx',
          content:  summaryBuf.toString('base64'),
        },
      ],
    });

    console.log('Email sent, id:', emailResult.data && emailResult.data.id);
    return res.status(200).json({ ok: true, message: 'Documents generated and emailed successfully' });

  } catch (e) {
    console.error('Resend email failed:', e.message);
    return res.status(500).json({ error: 'Email delivery failed: ' + e.message });
  }
};
