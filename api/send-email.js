// Vercel serverless function — send weekly brief email via Gmail SMTP
// Env vars needed: GMAIL_USER, GMAIL_APP_PASSWORD, FIREBASE_ADMIN_KEY (optional)

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import nodemailer from 'nodemailer'

// ─── Firebase Admin ──────────────────────────────────────────────────────────

if (getApps().length === 0) {
  const key = process.env.FIREBASE_ADMIN_KEY
  if (key) {
    initializeApp({ credential: cert(JSON.parse(key)) })
  } else {
    initializeApp({ projectId: 'rise-dashboard-bdf88' })
  }
}
const db = getFirestore()

// ─── Gmail transporter ──────────────────────────────────────────────────────

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

// ─── Build email HTML ───────────────────────────────────────────────────────

function buildEmailHTML(edition) {
  const severityColor = { critical: '#ff4545', high: '#f59e0b', medium: '#60a5fa', low: '#999' }
  const sentimentColor = { bullish: '#00e676', bearish: '#ff4545', neutral: '#999' }
  const sentimentArrow = { bullish: '\u25B2', bearish: '\u25BC', neutral: '~' }

  const date = edition.weekDate
    ? new Date(edition.weekDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const snapshotHTML = (edition.snapshot || []).map(s => `
    <td style="padding:12px 16px;text-align:center;border-right:1px solid #1a1a1a;">
      <div style="font-family:monospace;font-size:10px;color:#555;letter-spacing:0.1em;">${s.symbol}</div>
      <div style="font-family:monospace;font-size:14px;font-weight:700;color:#e8e8e8;margin-top:2px;">${s.price}</div>
      <div style="font-family:monospace;font-size:11px;font-weight:700;color:${s.change?.startsWith('-') ? '#ff4545' : '#00e676'};margin-top:2px;">${s.change}</div>
    </td>
  `).join('')

  const storiesHTML = (edition.stories || []).map((story, i) => {
    const sev = story.severity || 'medium'
    const sent = story.sentiment || 'neutral'

    const tickersHTML = (story.tickers || []).map(t =>
      `<span style="display:inline-block;font-family:monospace;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;background:#6366f118;border:1px solid #6366f140;color:#6366f1;margin:2px 4px 2px 0;">${t}</span>`
    ).join('')

    const signalsHTML = (type) => {
      const key = type === 'bullish' ? 'bullishSignals' : 'bearishSignals'
      const signals = story[key] || []
      if (signals.length === 0) return ''
      const color = type === 'bullish' ? '#00e676' : '#ff4545'
      const arrow = type === 'bullish' ? '\u25B2' : '\u25BC'
      return `
        <div style="padding:12px 16px;border-top:1px solid #1a1a1a;">
          <div style="font-family:monospace;font-size:9px;font-weight:700;color:${color};letter-spacing:0.15em;margin-bottom:8px;">
            ${arrow} ${type.toUpperCase()} SIGNALS
          </div>
          ${signals.map(s => `
            <div style="display:flex;align-items:center;margin-bottom:6px;">
              <span style="font-family:monospace;font-size:11px;font-weight:700;color:#e8e8e8;min-width:70px;">${s.ticker}</span>
              <span style="font-family:monospace;font-size:10px;color:#999;min-width:160px;">${s.note}</span>
              <div style="flex:1;height:6px;background:#1a1a1a;border-radius:3px;margin:0 8px;">
                <div style="height:100%;width:${s.strength}%;background:${color};border-radius:3px;"></div>
              </div>
              <span style="font-family:monospace;font-size:11px;font-weight:700;color:${color};">${s.strength}%</span>
            </div>
          `).join('')}
        </div>
      `
    }

    return `
      <div style="background:#0c0c0c;border:1px solid #1a1a1a;border-radius:8px;margin-bottom:16px;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #1a1a1a;">
          <div>
            <span style="font-family:monospace;font-size:9px;font-weight:700;padding:2px 8px;border-radius:4px;background:${severityColor[sev]}20;border:1px solid ${severityColor[sev]}50;color:${severityColor[sev]};letter-spacing:0.1em;">${sev.toUpperCase()}</span>
            <span style="font-family:monospace;font-size:11px;color:#555;margin-left:8px;">#${i + 1}</span>
          </div>
          <span style="font-family:monospace;font-size:10px;font-weight:700;color:${sentimentColor[sent]};">${sentimentArrow[sent]} ${sent.toUpperCase()}</span>
        </div>
        <div style="padding:16px;">
          <h3 style="font-size:15px;font-weight:700;color:#e8e8e8;margin:0 0 4px 0;line-height:1.4;">${story.headline}</h3>
          <p style="font-family:monospace;font-size:10px;color:#60a5fa;margin:0 0 8px 0;letter-spacing:0.05em;">${story.source}</p>
          <p style="font-size:13px;color:#999;line-height:1.6;margin:0 0 10px 0;">${story.summary}</p>
          ${tickersHTML ? `<div style="margin-top:8px;">${tickersHTML}</div>` : ''}
        </div>
        ${signalsHTML('bullish')}
        ${signalsHTML('bearish')}
      </div>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060606;font-family:'Inter',system-ui,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px;">
      <img src="https://risex-weekly.vercel.app/risex-logo.png" alt="RISEx" style="height:32px;margin-bottom:12px;" />
      <h1 style="font-size:20px;font-weight:700;color:#e8e8e8;margin:0;">${edition.title || 'RISEx Weekly'}</h1>
      <p style="font-family:monospace;font-size:11px;color:#555;margin:6px 0 0 0;">
        ${date}${edition.editionNumber ? ` \u00B7 Edition #${edition.editionNumber}` : ''}
      </p>
      ${edition.summary ? `<p style="font-size:13px;color:#999;margin:12px auto 0;max-width:480px;line-height:1.5;">${edition.summary}</p>` : ''}
    </div>

    <!-- Snapshot -->
    ${snapshotHTML ? `
    <table style="width:100%;background:#0c0c0c;border:1px solid #1a1a1a;border-radius:8px;border-collapse:collapse;margin-bottom:20px;">
      <tr>${snapshotHTML}</tr>
    </table>` : ''}

    <!-- Top Stories -->
    <div style="font-family:monospace;font-size:10px;font-weight:700;color:#ff4545;letter-spacing:0.2em;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1a1a1a;">
      TOP STORIES
    </div>

    ${storiesHTML}

    <!-- CTA -->
    <a href="https://risex.trade" target="_blank" style="display:block;text-decoration:none;background:linear-gradient(135deg,#00e67615,#6366f115);border:1px solid #00e67635;border-radius:8px;padding:20px 24px;margin:24px 0;text-align:center;">
      <div style="font-size:16px;font-weight:700;color:#e8e8e8;margin-bottom:4px;">Trade with an edge</div>
      <div style="font-size:12px;color:#999;margin-bottom:12px;">Act on these insights. Start trading crypto & commodities on RISEx.</div>
      <span style="display:inline-block;font-family:monospace;font-size:12px;font-weight:700;background:#00e676;color:#000;padding:8px 24px;border-radius:6px;">Join RISEx \u2192</span>
    </a>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;border-top:1px solid #1a1a1a;">
      <p style="font-family:monospace;font-size:10px;color:#555;">RISEx Weekly \u00B7 Crypto & Commodity Market Intelligence</p>
      <p style="font-family:monospace;font-size:9px;color:#555;margin-top:4px;">
        Powered by <a href="https://risex.trade" style="color:#00e676;text-decoration:none;">RISEx</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { editionId } = req.body
  if (!editionId) return res.status(400).json({ error: 'Missing editionId' })

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD env vars.' })
  }

  try {
    // Get edition
    const editionDoc = await db.collection('weekly-editions').doc(editionId).get()
    if (!editionDoc.exists) return res.status(404).json({ error: 'Edition not found' })
    const edition = { id: editionDoc.id, ...editionDoc.data() }

    // Get active subscribers
    const subsSnap = await db.collection('weekly-subscribers').where('active', '==', true).get()
    const emails = subsSnap.docs.map(d => d.data().email).filter(Boolean)

    if (emails.length === 0) return res.json({ ok: true, count: 0, message: 'No active subscribers' })

    // Build email
    const html = buildEmailHTML(edition)
    const transporter = getTransporter()

    // Send to each subscriber (BCC for privacy)
    const batchSize = 50
    let sent = 0
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      await transporter.sendMail({
        from: `"RISEx Weekly" <${process.env.GMAIL_USER}>`,
        bcc: batch.join(','),
        subject: `${edition.title || 'RISEx Weekly'} \u2014 ${edition.weekDate || ''}`,
        html,
      })
      sent += batch.length
    }

    return res.json({ ok: true, count: sent })
  } catch (err) {
    console.error('Send email error:', err)
    return res.status(500).json({ error: err.message })
  }
}
