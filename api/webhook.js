'use strict';

const crypto  = require('crypto');
const { Packer } = require('docx');
const { Resend } = require('resend');
const { buildDeliveryPlan }  = require('../lib/generate-plan.js');
const { buildKickoffSummary } = require('../lib/generate-summary.js');

// ── Config from environment variables ────────────────────────────────────────
const RESEND_API_KEY    = process.env.RESEND_API_KEY;
const FORMSPREE_SECRET  = process.env.FORMSPREE_SECRET || '';
const EMAIL_FROM        = process.env.EMAIL_FROM        || 'onboarding@resend.dev';
const EMAIL_PRIMARY     = process.env.EMAIL_PRIMARY     || 'info@sabelcustomersuccess.com';
const EMAIL_CC          = process.env.EMAIL_CC          || 'project-admin@sabelcustomersuccess.com';

// ── Verify Formspree webhook signature (optional but recommended) ─────────────
function verifySignature(rawBody, signature) {
  if (!FORMSPREE_SECRET || !signature) return true; // skip if not configured
  try {
    var expected = crypto
      .createHmac('sha256', FORMSPREE_SECRET)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch (e) {
    return false;
  }
}

// ── Parse Formspree payload ───────────────────────────────────────────────────
// Formspree webhooks send form fields as top-level keys in the JSON body.
// The hidden fields (_subject, email, _cc, _replyto) are included too — ignore them.
function parseFormspreePayload(body) {
  // Formspree may nest under 'data' in some webhook versions — handle both
  var fields = (body.data && typeof body.data === 'object') ? body.data : body;

  // Strip Formspree internal fields
  var skip = new Set(['_subject', '_replyto', '_cc', '_next', '_gotcha', 'email',
                      'submissionId', 'formId', 'createdAt', 'form_id']);
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
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read raw body for signature verification
  var rawBody = '';
  if (typeof req.body === 'string') {
    rawBody = req.body;
  } else if (Buffer.isBuffer(req.body)) {
    rawBody = req.body.toString('utf8');
  } else {
    rawBody = JSON.stringify(req.body);
  }

  // Verify Formspree signature if secret is configured
  var signature = req.headers['formspree-signature'] || req.headers['x-formspree-signature'] || '';
  if (FORMSPREE_SECRET && !verifySignature(rawBody, signature)) {
    console.error('Webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Parse body
  var body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
  } catch (e) {
    console.error('Failed to parse webhook body:', e.message);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Extract form values
  var R = parseFormspreePayload(body);
  console.log('Received submission with', Object.keys(R).length, 'fields');

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
    return res.status(500).json({ error: 'Email service not configured — set RESEND_API_KEY in environment variables' });
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

    console.log('Email sent successfully, id:', emailResult.data && emailResult.data.id);
    return res.status(200).json({ ok: true, message: 'Documents generated and emailed successfully' });

  } catch (e) {
    console.error('Resend email failed:', e.message);
    return res.status(500).json({ error: 'Email delivery failed: ' + e.message });
  }
};
