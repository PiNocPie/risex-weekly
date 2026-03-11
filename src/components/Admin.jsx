// Admin panel — compose, edit, publish weekly editions + send emails
import { useState } from 'react'

const T = {
  bg: '#060606', card: '#0c0c0c', surface: '#111',
  border: '#1a1a1a', border2: '#222',
  text: '#e8e8e8', dim: '#999', muted: '#555',
  green: '#00e676', red: '#ff4545', amber: '#f59e0b',
  blue: '#60a5fa',
}

const EMPTY_STORY = {
  headline: '', source: '', summary: '',
  severity: 'medium', sentiment: 'neutral',
  tickers: [], bullishSignals: [], bearishSignals: [],
}

const SEVERITIES = ['critical', 'high', 'medium', 'low']
const SENTIMENTS = ['bullish', 'bearish', 'neutral']

function StoryEditor({ story, index, onChange, onRemove }) {
  const update = (field, value) => onChange(index, { ...story, [field]: value })

  const updateTickers = (val) => {
    update('tickers', val.split(',').map(s => s.trim()).filter(Boolean))
  }

  const addSignal = (type) => {
    const key = type === 'bullish' ? 'bullishSignals' : 'bearishSignals'
    update(key, [...(story[key] || []), { ticker: '', note: '', strength: 50 }])
  }

  const updateSignal = (type, i, field, value) => {
    const key = type === 'bullish' ? 'bullishSignals' : 'bearishSignals'
    const signals = [...(story[key] || [])]
    signals[i] = { ...signals[i], [field]: field === 'strength' ? Number(value) : value }
    update(key, signals)
  }

  const removeSignal = (type, i) => {
    const key = type === 'bullish' ? 'bullishSignals' : 'bearishSignals'
    update(key, (story[key] || []).filter((_, idx) => idx !== i))
  }

  const inputStyle = {
    background: '#1a1a1a', border: `1px solid ${T.border2}`, color: T.text,
    borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%',
  }

  return (
    <div className="rounded-lg p-5 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold" style={{ color: T.dim }}>STORY #{index + 1}</span>
        <button onClick={() => onRemove(index)} className="font-mono text-[10px]" style={{ color: T.red, cursor: 'pointer', background: 'none', border: 'none' }}>
          Remove
        </button>
      </div>

      <input
        placeholder="Headline"
        value={story.headline}
        onChange={e => update('headline', e.target.value)}
        style={{ ...inputStyle, fontWeight: 600, fontSize: 15 }}
      />

      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Source (e.g. Bloomberg)" value={story.source} onChange={e => update('source', e.target.value)} style={inputStyle} />
        <input placeholder="Tickers (comma separated)" value={(story.tickers || []).join(', ')} onChange={e => updateTickers(e.target.value)} style={inputStyle} />
      </div>

      <textarea
        placeholder="Summary — what happened and why it matters"
        value={story.summary}
        onChange={e => update('summary', e.target.value)}
        rows={3}
        style={{ ...inputStyle, resize: 'vertical' }}
      />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px]" style={{ color: T.muted }}>SEVERITY</span>
          {SEVERITIES.map(s => (
            <button
              key={s}
              onClick={() => update('severity', s)}
              className="font-mono text-[10px] px-2 py-1 rounded"
              style={{
                background: story.severity === s ? '#222' : 'transparent',
                border: `1px solid ${story.severity === s ? T.border2 : 'transparent'}`,
                color: story.severity === s ? T.text : T.muted,
                cursor: 'pointer',
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="font-mono text-[10px]" style={{ color: T.muted }}>SENTIMENT</span>
          {SENTIMENTS.map(s => (
            <button
              key={s}
              onClick={() => update('sentiment', s)}
              className="font-mono text-[10px] px-2 py-1 rounded"
              style={{
                background: story.sentiment === s ? '#222' : 'transparent',
                border: `1px solid ${story.sentiment === s ? T.border2 : 'transparent'}`,
                color: story.sentiment === s ? (s === 'bullish' ? T.green : s === 'bearish' ? T.red : T.text) : T.muted,
                cursor: 'pointer',
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Signals */}
      {['bullish', 'bearish'].map(type => {
        const key = type === 'bullish' ? 'bullishSignals' : 'bearishSignals'
        const signals = story[key] || []
        const color = type === 'bullish' ? T.green : T.red
        return (
          <div key={type}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color }}>
                {type === 'bullish' ? '\u25B2' : '\u25BC'} {type.toUpperCase()} SIGNALS
              </span>
              <button
                onClick={() => addSignal(type)}
                className="font-mono text-[10px]"
                style={{ color, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                + Add
              </button>
            </div>
            {signals.map((sig, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5">
                <input placeholder="Ticker" value={sig.ticker} onChange={e => updateSignal(type, i, 'ticker', e.target.value)} style={{ ...inputStyle, width: 90, padding: '5px 8px', fontSize: 11 }} />
                <input placeholder="Note" value={sig.note} onChange={e => updateSignal(type, i, 'note', e.target.value)} style={{ ...inputStyle, flex: 1, padding: '5px 8px', fontSize: 11 }} />
                <input type="number" min="0" max="100" value={sig.strength} onChange={e => updateSignal(type, i, 'strength', e.target.value)} style={{ ...inputStyle, width: 60, padding: '5px 8px', fontSize: 11 }} />
                <button onClick={() => removeSignal(type, i)} className="font-mono text-[10px]" style={{ color: T.red, background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function Admin({
  editions, onSave, onPublish, onFetchNews, onSendEmail,
  fetchingNews, saving, sending, subscriberCount,
}) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [weekDate, setWeekDate] = useState(new Date().toISOString().slice(0, 10))
  const [stories, setStories] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [msg, setMsg] = useState(null)
  const [snapshotText, setSnapshotText] = useState('')

  const inputStyle = {
    background: '#1a1a1a', border: `1px solid ${T.border2}`, color: T.text,
    borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%',
  }

  const parseSnapshot = (text) => {
    return text.split('\n').filter(Boolean).map(line => {
      const parts = line.split(/\s+/)
      return { symbol: parts[0] || '', price: parts[1] || '', change: parts[2] || '' }
    })
  }

  const loadEdition = (ed) => {
    setEditingId(ed.id)
    setTitle(ed.title || '')
    setSummary(ed.summary || '')
    setWeekDate(ed.weekDate || '')
    setStories(ed.stories || [])
    setSnapshotText((ed.snapshot || []).map(s => `${s.symbol} ${s.price} ${s.change}`).join('\n'))
  }

  const resetForm = () => {
    setEditingId(null)
    setTitle('')
    setSummary('')
    setWeekDate(new Date().toISOString().slice(0, 10))
    setStories([])
    setSnapshotText('')
  }

  const addStory = () => {
    setStories(prev => [...prev, { ...EMPTY_STORY, id: `story-${Date.now()}` }])
  }

  const updateStory = (i, updated) => {
    setStories(prev => prev.map((s, idx) => idx === i ? updated : s))
  }

  const removeStory = (i) => {
    setStories(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSave = async (status) => {
    const edition = {
      id: editingId,
      title: title || `RISEx Weekly \u2014 ${weekDate}`,
      summary,
      weekDate,
      stories,
      snapshot: parseSnapshot(snapshotText),
      status,
      editionNumber: editingId
        ? editions.find(e => e.id === editingId)?.editionNumber
        : (editions.length + 1),
    }
    const result = await onSave(edition)
    if (result?.id) setEditingId(result.id)
    setMsg({ ok: true, text: status === 'published' ? 'Published!' : 'Draft saved.' })
    setTimeout(() => setMsg(null), 3000)
  }

  const handleFetchNews = async () => {
    const fetched = await onFetchNews()
    if (fetched?.length > 0) {
      setStories(prev => [...prev, ...fetched])
      setMsg({ ok: true, text: `Fetched ${fetched.length} stories. Review and edit below.` })
    } else {
      setMsg({ ok: false, text: 'No news found or fetch failed.' })
    }
    setTimeout(() => setMsg(null), 4000)
  }

  const handleSendEmail = async () => {
    if (!editingId) {
      setMsg({ ok: false, text: 'Save the edition first before sending.' })
      setTimeout(() => setMsg(null), 3000)
      return
    }
    const result = await onSendEmail(editingId)
    setMsg(result)
    setTimeout(() => setMsg(null), 5000)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-lg" style={{ color: T.text }}>Admin Panel</h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px]" style={{ color: T.dim }}>
            {subscriberCount || 0} subscribers
          </span>
          <button onClick={resetForm} className="font-mono text-[11px] px-3 py-1.5 rounded" style={{ border: `1px solid ${T.border2}`, color: T.dim, background: 'none', cursor: 'pointer' }}>
            + New Edition
          </button>
        </div>
      </div>

      {msg && (
        <div className="font-mono text-xs px-4 py-2.5 rounded" style={{
          background: msg.ok ? '#00e67612' : '#ff454512',
          border: `1px solid ${msg.ok ? '#00e67635' : '#ff454535'}`,
          color: msg.ok ? T.green : T.red,
        }}>
          {msg.text}
        </div>
      )}

      {/* Past editions list */}
      {editions?.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="font-mono text-[9px] font-bold tracking-widest px-4 py-2" style={{ color: T.muted, borderBottom: `1px solid ${T.border}` }}>
            EDITIONS
          </div>
          {editions.map(ed => (
            <div
              key={ed.id}
              className="flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors"
              style={{
                borderBottom: `1px solid ${T.border}`,
                background: editingId === ed.id ? '#111' : 'transparent',
              }}
              onClick={() => loadEdition(ed)}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{
                  background: ed.status === 'published' ? '#00e67615' : '#f59e0b15',
                  color: ed.status === 'published' ? T.green : T.amber,
                  border: `1px solid ${ed.status === 'published' ? '#00e67630' : '#f59e0b30'}`,
                }}>
                  {ed.status?.toUpperCase() || 'DRAFT'}
                </span>
                <span className="text-sm" style={{ color: T.text }}>{ed.title}</span>
              </div>
              <span className="font-mono text-[10px]" style={{ color: T.muted }}>{ed.weekDate}</span>
            </div>
          ))}
        </div>
      )}

      {/* Edition editor */}
      <div className="space-y-4">
        <div className="rounded-lg p-5 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: T.muted }}>
            {editingId ? 'EDITING EDITION' : 'NEW EDITION'}
          </span>
          <input placeholder="Title (e.g. RISEx Weekly #12)" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={weekDate} onChange={e => setWeekDate(e.target.value)} style={inputStyle} />
            <input placeholder="Edition number" type="number" value={editions.length + 1} disabled style={{ ...inputStyle, opacity: 0.5 }} />
          </div>
          <textarea placeholder="Brief summary for the week..." value={summary} onChange={e => setSummary(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          <div>
            <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: T.muted }}>
              MARKET SNAPSHOT (one per line: SYMBOL PRICE CHANGE)
            </span>
            <textarea
              placeholder={"BTC $68,420 +2.3%\nETH $3,840 -1.2%\nGold $2,180 +0.8%"}
              value={snapshotText}
              onChange={e => setSnapshotText(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', marginTop: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
            />
          </div>
        </div>

        {/* Fetch news */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleFetchNews}
            disabled={fetchingNews}
            className="font-mono text-xs font-bold px-4 py-2.5 rounded transition-all"
            style={{
              background: T.blue + '20', border: `1px solid ${T.blue}40`,
              color: T.blue, cursor: fetchingNews ? 'wait' : 'pointer',
              opacity: fetchingNews ? 0.6 : 1,
            }}
          >
            {fetchingNews ? 'Fetching news...' : 'Fetch Crypto & Commodity News'}
          </button>
          <button onClick={addStory} className="font-mono text-xs px-4 py-2.5 rounded" style={{ border: `1px solid ${T.border2}`, color: T.dim, background: 'none', cursor: 'pointer' }}>
            + Add Story Manually
          </button>
        </div>

        {/* Story editors */}
        {stories.map((story, i) => (
          <StoryEditor key={story.id || i} story={story} index={i} onChange={updateStory} onRemove={removeStory} />
        ))}

        {/* Action buttons */}
        {stories.length > 0 && (
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="font-mono text-xs font-bold px-5 py-2.5 rounded"
              style={{ background: '#222', border: `1px solid ${T.border2}`, color: T.text, cursor: 'pointer' }}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="font-mono text-xs font-bold px-5 py-2.5 rounded"
              style={{ background: T.green, color: '#000', cursor: 'pointer' }}
            >
              Publish
            </button>
            <button
              onClick={handleSendEmail}
              disabled={sending || !editingId}
              className="font-mono text-xs font-bold px-5 py-2.5 rounded ml-auto"
              style={{
                background: '#6366f120', border: '1px solid #6366f140',
                color: '#818cf8', cursor: sending ? 'wait' : 'pointer',
                opacity: sending ? 0.6 : 1,
              }}
            >
              {sending ? 'Sending...' : `Send Email to ${subscriberCount || 0} subscribers`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
