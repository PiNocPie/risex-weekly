// Archive — Substack-style list of past editions

const T = {
  bg: '#060606', card: '#0c0c0c', border: '#1a1a1a',
  text: '#e8e8e8', dim: '#999', muted: '#555',
  green: '#00e676', red: '#ff4545', amber: '#f59e0b',
}

export default function Archive({ editions, onSelect }) {
  const published = editions.filter(e => e.status === 'published')
    .sort((a, b) => new Date(b.weekDate) - new Date(a.weekDate))

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <img src="/risex-logo.png" alt="RISEx" className="mx-auto mb-4" style={{ height: 36 }} />
        <h1 className="font-bold text-xl" style={{ color: T.text }}>Archive</h1>
        <p className="text-sm mt-1" style={{ color: T.dim }}>
          All past editions of RISEx Weekly
        </p>
      </div>

      {published.length === 0 ? (
        <p className="text-center text-sm" style={{ color: T.muted }}>No published editions yet.</p>
      ) : (
        <div className="space-y-3">
          {published.map(ed => {
            const date = ed.weekDate
              ? new Date(ed.weekDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : ''
            const storyCount = ed.stories?.length || 0
            return (
              <button
                key={ed.id}
                onClick={() => onSelect(ed.id)}
                className="w-full text-left rounded-lg p-5 transition-all hover:scale-[1.002]"
                style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-[15px] mb-1" style={{ color: T.text }}>
                      {ed.title}
                    </h2>
                    {ed.summary && (
                      <p className="text-sm leading-relaxed" style={{ color: T.dim }}>
                        {ed.summary.length > 150 ? ed.summary.slice(0, 150) + '...' : ed.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="font-mono text-[10px]" style={{ color: T.muted }}>{date}</span>
                      {ed.editionNumber && (
                        <span className="font-mono text-[10px]" style={{ color: T.muted }}>
                          Edition #{ed.editionNumber}
                        </span>
                      )}
                      <span className="font-mono text-[10px]" style={{ color: T.muted }}>
                        {storyCount} {storyCount === 1 ? 'story' : 'stories'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-sm" style={{ color: T.muted }}>{'\u2192'}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
