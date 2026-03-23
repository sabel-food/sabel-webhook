'use strict';

const { Packer }                     = require('docx');
const { Resend }                     = require('resend');
const { generateDocumentContent }    = require('../lib/claude-generator.js');
const { buildDeliveryPlanDynamic }   = require('../lib/generate-plan-dynamic.js');
const { buildKickoffSummaryDynamic } = require('../lib/generate-summary-dynamic.js');
const { buildSOWPdf }                = require('../lib/generate-sow-pdf.js');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM     = process.env.EMAIL_FROM    || 'onboarding@resend.dev';
const EMAIL_PRIMARY  = process.env.EMAIL_PRIMARY || 'info@sabelcustomersuccess.com';
const EMAIL_CC       = process.env.EMAIL_CC      || 'project-admin@sabelcustomersuccess.com';

function getRawBody(req) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    req.on('data',  function(c) { chunks.push(c); });
    req.on('end',   function()  { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

function parseUrlEncoded(str) {
  var out = {};
  if (!str) return out;
  str.split('&').forEach(function(pair) {
    var i = pair.indexOf('=');
    if (i === -1) return;
    out[decodeURIComponent(pair.slice(0,i).replace(/\+/g,' '))] =
       decodeURIComponent(pair.slice(i+1).replace(/\+/g,' '));
  });
  return out;
}

function parseFields(rawBody, ct) {
  var fields = {};
  ct = (ct || '').toLowerCase();
  if (ct.includes('application/x-www-form-urlencoded')) {
    fields = parseUrlEncoded(rawBody);
  } else {
    try { fields = JSON.parse(rawBody); } catch (e) { fields = {}; }
    if (fields.data && typeof fields.data === 'object') fields = fields.data;
  }
  var skip = new Set(['_subject','_replyto','_cc','_next','_gotcha','submissionId','formId','createdAt']);
  var R = {};
  Object.keys(fields).forEach(function(k) { if (!skip.has(k)) R[k] = String(fields[k]||'').trim(); });
  return R;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  var rawBody;
  try { rawBody = await getRawBody(req); }
  catch (e) { return res.status(400).json({ error: 'Failed to read body' }); }

  var R           = parseFields(rawBody, req.headers['content-type']);
  var clientName  = R._client  || 'Client';
  var projectName = R._project || 'Intercom Implementation';
  console.log('Submission from:', clientName, '| Fields:', Object.keys(R).length);

  // 1 — Call Claude to generate structured document content
  var G;
  try {
    console.log('Calling Claude API...');
    G = await generateDocumentContent(R);
    console.log('Claude done. Procedures:', (G.procedures||[]).length, '| Weeks:', (G.delivery_weeks||[]).length, '| Gaps:', (G.gaps||[]).length);
  } catch (e) {
    console.error('Claude failed:', e.message);
    return res.status(500).json({ error: 'Content generation failed: ' + e.message });
  }

  // 2 — Build all three documents in parallel
  var planBuf, summaryBuf, sowBuf;
  try {
    console.log('Building documents...');
    var planDoc    = buildDeliveryPlanDynamic(G);
    var summaryDoc = buildKickoffSummaryDynamic(G);
    [planBuf, summaryBuf, sowBuf] = await Promise.all([
      Packer.toBuffer(planDoc),
      Packer.toBuffer(summaryDoc),
      buildSOWPdf(G),
    ]);
    console.log('Documents built. Plan:', planBuf.length, 'Summary:', summaryBuf.length, 'SOW PDF:', sowBuf.length, 'bytes');
  } catch (e) {
    console.error('Build failed:', e.message, e.stack);
    return res.status(500).json({ error: 'Document build failed: ' + e.message });
  }

  // 3 — Email all three via Resend
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not set' });

  var slug   = clientName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  var resend = new Resend(RESEND_API_KEY);

  var gapText = G.gaps && G.gaps.length
    ? '\n\nGAPS TO RESOLVE BEFORE BUILD:\n' + G.gaps.map(function(g,i){ return (i+1)+'. '+g; }).join('\n')
    : '';

  try {
    var result = await resend.emails.send({
      from:    EMAIL_FROM,
      to:      EMAIL_PRIMARY,
      cc:      EMAIL_CC,
      subject: clientName + ' \u2014 Kickoff Intake Form submitted',
      text: [
        clientName + ' \u2014 Kickoff Intake Form submitted',
        'Project: ' + projectName,
        'Fields received: ' + Object.keys(R).length,
        'Procedures: ' + ((G.procedures||[]).map(function(p){return p.name;}).join(', ') || 'none'),
        'Gaps identified: ' + (G.gaps||[]).length,
        gapText,
        '',
        'Three documents attached:',
        '1. Scope of Work (PDF) \u2014 dark branded, client-ready',
        '2. Internal Delivery Plan (DOCX) \u2014 week-by-week schedule for Honey, Chris, Richard',
        '3. Kickoff Summary (DOCX) \u2014 authoritative build reference',
      ].join('\n'),
      attachments: [
        { filename: slug + ' - Scope of Work.pdf',           content: sowBuf.toString('base64') },
        { filename: slug + ' - Internal Delivery Plan.docx', content: planBuf.toString('base64') },
        { filename: slug + ' - Kickoff Summary.docx',        content: summaryBuf.toString('base64') },
      ],
    });
    console.log('Email sent. ID:', result.data && result.data.id);
    return res.status(200).json({ ok: true, client: clientName, gaps: (G.gaps||[]).length });
  } catch (e) {
    console.error('Email failed:', e.message);
    return res.status(500).json({ error: 'Email failed: ' + e.message });
  }
};
