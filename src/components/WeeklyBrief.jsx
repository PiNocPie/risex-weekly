// WeeklyBrief — public-facing newsletter view (Stocky Market Brief style)

const T = {
  bg: '#060606', card: '#0c0c0c', cardAlt: '#111111',
  border: '#1a1a1a', border2: '#222',
  text: '#e8e8e8', dim: '#999', muted: '#555',
  green: '#00e676', red: '#ff4545', amber: '#f59e0b',
  blue: '#60a5fa', purple: '#a78bfa', cyan: '#22d3ee',
}

const SEVERITY_STYLES = {
  critical: { bg: '#ff454520', border: '#ff454550', color: '#ff4545', label: 'CRITICAL' },
  high:     { bg: '#f59e0b20', border: '#f59e0b50', color: '#f59e0b', label: 'HIGH' },
  medium:   { bg: '#60a5fa20', border: '#60a5fa50', color: '#60a5fa', label: 'MEDIUM' },
  low:      { bg: '#55555520', border: '#55555550', color: '#999',    label: 'LOW' },
}

const TICKER_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6',
  '#a78bfa', '#f97316', '#14b8a6', '#22d3ee', '#f43f5e',
]

function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium
  return (
    <span
      className="font-mono text-[9px] font-bold tracking-widest px-2 py-0.5 rounded"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function SentimentBadge({ sentiment }) {
  const isBullish = sentiment === 'bullish'
  const isNeutral = sentiment === 'neutral'
  return (
    <span
      className="font-mono text-[10px] font-bold tracking-wider flex items-center gap-1"
      style={{ color: isNeutral ? T.dim : isBullish ? T.green : T.red }}
    >
      <span>{isNeutral ? '~' : isBullish ? '\u25B2' : '\u25BC'}</span>
      {sentiment?.toUpperCase()}
    </span>
  )
}

function SignalBar({ strength, color }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#1a1a1a' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${strength}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[11px] font-bold" style={{ color, minWidth: 32, textAlign: 'right' }}>
        {strength}%
      </span>
    </div>
  )
}

function StoryCard({ story, index }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: T.card, border: `1px solid ${T.border}` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: `1px solid ${T.border}` }}
      >
        <div className="flex items-center gap-3">
          <SeverityBadge severity={story.severity} />
          <span className="font-mono text-[11px]" style={{ color: T.muted }}>#{index + 1}</span>
        </div>
        <SentimentBadge sentiment={story.sentiment} />
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        <h3 className="font-bold text-[15px] leading-snug" style={{ color: T.text }}>
          {story.headline}
        </h3>
        <p className="font-mono text-[10px] tracking-wider" style={{ color: T.blue }}>
          {story.source}
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: T.dim }}>
          {story.summary}
        </p>

        {/* Tickers */}
        {story.tickers?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {story.tickers.map((ticker, i) => (
              <span
                key={ticker}
                className="font-mono text-[10px] font-bold px-2.5 py-1 rounded"
                style={{
                  background: `${TICKER_COLORS[i % TICKER_COLORS.length]}18`,
                  border: `1px solid ${TICKER_COLORS[i % TICKER_COLORS.length]}40`,
                  color: TICKER_COLORS[i % TICKER_COLORS.length],
                }}
              >
                {ticker}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Signals */}
      {(story.bullishSignals?.length > 0 || story.bearishSignals?.length > 0) && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {story.bullishSignals?.length > 0 && (
            <div className="px-5 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="font-mono text-[9px] font-bold tracking-widest mb-2.5" style={{ color: T.green }}>
                {'\u25B2'} Bullish Signals
              </div>
              <div className="space-y-2">
                {story.bullishSignals.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-mono text-[11px] font-bold" style={{ color: T.text, minWidth: 80 }}>
                      {s.ticker}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: T.dim, minWidth: 180 }}>
                      {s.note}
                    </span>
                    <SignalBar strength={s.strength} color={T.green} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {story.bearishSignals?.length > 0 && (
            <div className="px-5 py-3">
              <div className="font-mono text-[9px] font-bold tracking-widest mb-2.5" style={{ color: T.red }}>
                {'\u25BC'} Bearish Signals
              </div>
              <div className="space-y-2">
                {story.bearishSignals.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-mono text-[11px] font-bold" style={{ color: T.text, minWidth: 80 }}>
                      {s.ticker}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: T.dim, minWidth: 180 }}>
                      {s.note}
                    </span>
                    <SignalBar strength={s.strength} color={T.red} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RISExCTA() {
  return (
    <a
      href="https://risex.trade"
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden transition-all hover:scale-[1.005]"
      style={{
        background: 'linear-gradient(135deg, #00e67615 0%, #00e67605 50%, #6366f115 100%)',
        border: '1px solid #00e67635',
      }}
    >
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <img src="/risex-logo.png" alt="RISEx" style={{ height: 32 }} />
          <div>
            <div className="font-bold text-sm" style={{ color: T.text }}>
              Trade with an edge
            </div>
            <div className="text-xs mt-0.5" style={{ color: T.dim }}>
              Act on these insights. Start trading crypto & commodities on RISEx.
            </div>
          </div>
        </div>
        <div
          className="font-mono text-xs font-bold px-5 py-2.5 rounded-lg shrink-0"
          style={{ background: '#00e676', color: '#000' }}
        >
          Join RISEx {'\u2192'}
        </div>
      </div>
    </a>
  )
}

function SubscribeForm({ onSubscribe, subscribing }) {
  return (
    <div
      className="rounded-lg px-6 py-5"
      style={{ background: T.card, border: `1px solid ${T.border}` }}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="font-bold text-sm" style={{ color: T.text }}>
            Get this in your inbox every week
          </div>
          <div className="text-xs mt-0.5" style={{ color: T.dim }}>
            Free weekly crypto & commodity market intelligence from RISEx
          </div>
        </div>
        <form
          onSubmit={onSubscribe}
          className="flex items-center gap-2"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="your@email.com"
            className="px-3 py-2 rounded text-sm outline-none"
            style={{ background: '#1a1a1a', border: `1px solid ${T.border2}`, color: T.text, width: 220 }}
          />
          <button
            type="submit"
            disabled={subscribing}
            className="font-mono text-xs font-bold px-4 py-2 rounded transition-all"
            style={{ background: '#00e676', color: '#000', opacity: subscribing ? 0.6 : 1 }}
          >
            {subscribing ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function WeeklyBrief({ edition, onSubscribe, subscribing, subscribeMsg }) {
  if (!edition) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <img src="/risex-logo.png" alt="RISEx" className="mx-auto mb-6" style={{ height: 40 }} />
        <h1 className="font-bold text-xl mb-2" style={{ color: T.text }}>RISEx Weekly</h1>
        <p className="text-sm mb-8" style={{ color: T.dim }}>
          Weekly crypto & commodity market intelligence. Coming soon.
        </p>
        <SubscribeForm onSubscribe={onSubscribe} subscribing={subscribing} />
        {subscribeMsg && (
          <p className="text-xs mt-3" style={{ color: subscribeMsg.ok ? T.green : T.red }}>
            {subscribeMsg.text}
          </p>
        )}
      </div>
    )
  }

  const date = edition.weekDate
    ? new Date(edition.weekDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="text-center mb-8">
        <img src="/risex-logo.png" alt="RISEx" className="mx-auto mb-4" style={{ height: 36 }} />
        <h1 className="font-bold text-xl tracking-tight" style={{ color: T.text }}>
          {edition.title || 'RISEx Weekly'}
        </h1>
        <p className="font-mono text-[11px] mt-1.5" style={{ color: T.muted }}>
          {date} {edition.editionNumber ? `\u00B7 Edition #${edition.editionNumber}` : ''}
        </p>
        {edition.summary && (
          <p className="text-sm mt-3 max-w-xl mx-auto" style={{ color: T.dim }}>
            {edition.summary}
          </p>
        )}
      </div>

      {/* Market Snapshot */}
      {edition.snapshot?.length > 0 && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: T.card, border: `1px solid ${T.border}` }}
        >
          <div
            className="font-mono text-[9px] font-bold tracking-widest px-4 py-2"
            style={{ color: T.muted, borderBottom: `1px solid ${T.border}` }}
          >
            MARKET SNAPSHOT
          </div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(edition.snapshot.length, 6)}, 1fr)` }}>
            {edition.snapshot.map((item, i) => (
              <div
                key={item.symbol}
                className="px-4 py-3 text-center"
                style={{ borderRight: i < edition.snapshot.length - 1 ? `1px solid ${T.border}` : 'none' }}
              >
                <div className="font-mono text-[9px] tracking-wider" style={{ color: T.muted }}>
                  {item.symbol}
                </div>
                <div className="font-mono text-sm font-bold mt-0.5" style={{ color: T.text }}>
                  {item.price}
                </div>
                <div
                  className="font-mono text-[10px] font-bold mt-0.5"
                  style={{ color: item.change?.startsWith('-') ? T.red : T.green }}
                >
                  {item.change}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Stories header */}
      <div className="flex items-center gap-3 pt-2">
        <span className="font-mono text-[10px] font-bold tracking-[0.2em]" style={{ color: T.red }}>
          TOP STORIES
        </span>
        <div className="flex-1 h-px" style={{ background: T.border }} />
      </div>

      {/* Story cards */}
      {edition.stories?.map((story, i) => (
        <StoryCard key={story.id || i} story={story} index={i} />
      ))}

      {/* RISEx CTA */}
      <RISExCTA />

      {/* Subscribe */}
      <SubscribeForm onSubscribe={onSubscribe} subscribing={subscribing} />
      {subscribeMsg && (
        <p className="text-xs text-center" style={{ color: subscribeMsg.ok ? T.green : T.red }}>
          {subscribeMsg.text}
        </p>
      )}

      {/* Footer */}
      <div className="text-center py-6">
        <p className="font-mono text-[10px]" style={{ color: T.muted }}>
          RISEx Weekly {'\u00B7'} Crypto & Commodity Market Intelligence
        </p>
        <p className="font-mono text-[9px] mt-1" style={{ color: T.muted }}>
          Powered by <a href="https://risex.trade" style={{ color: T.green }}>RISEx</a>
        </p>
      </div>
    </div>
  )
}
