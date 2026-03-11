import { useState, useEffect, useCallback } from 'react'
import { db } from './firebase'
import {
  collection, doc, setDoc, addDoc, getDocs, onSnapshot,
  query, orderBy, where, serverTimestamp,
} from 'firebase/firestore'
import WeeklyBrief from './components/WeeklyBrief'
import Admin from './components/Admin'
import Archive from './components/Archive'

const T = {
  bg: '#060606', card: '#0c0c0c', border: '#1a1a1a', border2: '#222',
  text: '#e8e8e8', dim: '#999', muted: '#555', green: '#00e676',
}

// ─── News analysis helpers ──────────────────────────────────────────────────

const BULLISH = ['surge','rally','bullish','gain','rise','uptick','breakout','recovery','growth','positive','adoption','partnership','launch','upgrade','soar','pump','ath','all-time high','moon','accumulate','buy']
const BEARISH = ['crash','drop','bearish','decline','fall','plunge','dump','selloff','hack','exploit','ban','regulation','crackdown','warning','fear','panic','liquidat','rug','scam','sec','lawsuit']

const CRYPTO_TICKERS = {
  bitcoin: 'BTC', btc: 'BTC', ethereum: 'ETH', eth: 'ETH', solana: 'SOL', sol: 'SOL',
  ripple: 'XRP', xrp: 'XRP', cardano: 'ADA', ada: 'ADA', dogecoin: 'DOGE', doge: 'DOGE',
  bnb: 'BNB', avax: 'AVAX', avalanche: 'AVAX', polygon: 'MATIC', matic: 'MATIC',
  chainlink: 'LINK', link: 'LINK', litecoin: 'LTC', ltc: 'LTC', polkadot: 'DOT',
  uniswap: 'UNI', aave: 'AAVE', arbitrum: 'ARB', optimism: 'OP', sui: 'SUI',
}
const COMMODITY_TICKERS = {
  gold: 'Gold', oil: 'Crude Oil', 'crude oil': 'Crude Oil', silver: 'Silver',
  copper: 'Copper', platinum: 'Platinum', palladium: 'Palladium',
  'natural gas': 'Natural Gas', wheat: 'Wheat', corn: 'Corn',
}
const ALL_TICKERS = { ...CRYPTO_TICKERS, ...COMMODITY_TICKERS }

function analyzeArticle(article) {
  const text = `${article.title || ''} ${article.body || article.description || ''}`.toLowerCase()

  // Sentiment
  const bullishScore = BULLISH.filter(w => text.includes(w)).length
  const bearishScore = BEARISH.filter(w => text.includes(w)).length
  let sentiment = 'neutral'
  if (bullishScore > bearishScore + 1) sentiment = 'bullish'
  else if (bearishScore > bullishScore + 1) sentiment = 'bearish'

  // Severity
  const importanceWords = ['critical','breaking','urgent','emergency','major','significant']
  const hasImportant = importanceWords.some(w => text.includes(w))
  const severity = hasImportant ? 'critical' : (bullishScore + bearishScore > 3 ? 'high' : 'medium')

  // Tickers
  const tickers = new Set()
  Object.entries(ALL_TICKERS).forEach(([keyword, ticker]) => {
    if (text.includes(keyword)) tickers.add(ticker)
  })

  // Signals
  const tickerList = [...tickers]
  const bullishSignals = sentiment !== 'bearish' ? tickerList.slice(0, 2).map(t => ({
    ticker: t, note: `${t} \u2014 ${sentiment === 'bullish' ? 'bullish momentum' : 'watch for upside'}`,
    strength: Math.min(95, 40 + bullishScore * 15),
  })) : []

  const bearishSignals = sentiment !== 'bullish' ? tickerList.slice(0, 2).map(t => ({
    ticker: t, note: `${t} \u2014 ${sentiment === 'bearish' ? 'downward pressure' : 'risk to monitor'}`,
    strength: Math.min(95, 40 + bearishScore * 15),
  })) : []

  return {
    id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    headline: article.title || 'Untitled',
    source: article.source_info?.name || article.source || 'CryptoCompare',
    sourceUrl: article.url || article.guid || '',
    summary: (article.body || article.description || '').slice(0, 300) + (article.body?.length > 300 ? '...' : ''),
    severity,
    sentiment,
    tickers: tickerList,
    bullishSignals,
    bearishSignals,
  }
}

// ─── Main App ───────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState('latest') // latest | archive | edition | admin
  const [editions, setEditions] = useState([])
  const [subscribers, setSubscribers] = useState([])
  const [selectedEditionId, setSelectedEditionId] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [loginPw, setLoginPw] = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [fetchingNews, setFetchingNews] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeMsg, setSubscribeMsg] = useState(null)

  // Hash routing
  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase()
      if (hash === 'admin') setView('admin')
      else if (hash === 'archive') setView('archive')
      else if (hash.startsWith('edition-')) {
        setSelectedEditionId(hash.replace('edition-', ''))
        setView('edition')
      } else setView('latest')
    }
    handler()
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const navigate = (v, extra) => {
    if (extra) window.location.hash = `edition-${extra}`
    else window.location.hash = v === 'latest' ? '' : v
  }

  // Firestore listeners
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'weekly-editions'), orderBy('weekDate', 'desc')),
      snap => setEditions(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      () => {} // ignore errors silently
    )
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'weekly-subscribers'), snap => {
      setSubscribers(snap.docs.map(d => ({ ...d.data(), id: d.id })))
    }, () => {})
    return unsub
  }, [])

  // Get latest published edition
  const latestEdition = editions.find(e => e.status === 'published')
  const selectedEdition = selectedEditionId
    ? editions.find(e => e.id === selectedEditionId)
    : latestEdition

  // Login
  const handleLogin = () => {
    if (loginPw !== 'deeznuts69@') {
      setLoginErr('Wrong password')
      return
    }
    setIsLoggedIn(true)
    setShowLogin(false)
    setLoginPw('')
    setLoginErr('')
    navigate('admin')
  }

  // Subscribe
  const handleSubscribe = async (e) => {
    e.preventDefault()
    const email = e.target.email.value.trim().toLowerCase()
    if (!email) return
    setSubscribing(true)
    try {
      const existing = subscribers.find(s => s.email === email)
      if (existing) {
        setSubscribeMsg({ ok: true, text: 'You\'re already subscribed!' })
      } else {
        await addDoc(collection(db, 'weekly-subscribers'), {
          email,
          subscribedAt: serverTimestamp(),
          active: true,
        })
        setSubscribeMsg({ ok: true, text: 'Subscribed! You\'ll get our weekly brief.' })
        e.target.reset()
      }
    } catch {
      setSubscribeMsg({ ok: false, text: 'Failed to subscribe. Try again.' })
    }
    setSubscribing(false)
    setTimeout(() => setSubscribeMsg(null), 5000)
  }

  // Save edition
  const handleSave = async (edition) => {
    setSaving(true)
    try {
      if (edition.id) {
        await setDoc(doc(db, 'weekly-editions', edition.id), {
          ...edition,
          updatedAt: serverTimestamp(),
        }, { merge: true })
        setSaving(false)
        return { id: edition.id }
      } else {
        const ref = await addDoc(collection(db, 'weekly-editions'), {
          ...edition,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        setSaving(false)
        return { id: ref.id }
      }
    } catch (err) {
      console.error('Save failed:', err)
      setSaving(false)
      return null
    }
  }

  // Publish
  const handlePublish = async (editionId) => {
    await setDoc(doc(db, 'weekly-editions', editionId), {
      status: 'published',
      publishedAt: serverTimestamp(),
    }, { merge: true })
  }

  // Fetch news from APIs
  const handleFetchNews = async () => {
    setFetchingNews(true)
    const stories = []
    try {
      // CryptoCompare news
      const cryptoResp = await fetch(
        'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,ETH,Altcoin,Blockchain,DeFi,Commodity&sortOrder=latest'
      )
      const cryptoData = await cryptoResp.json()
      const articles = (cryptoData.Data || []).slice(0, 10)
      articles.forEach(a => stories.push(analyzeArticle(a)))
    } catch (e) {
      console.error('News fetch failed:', e)
    }
    setFetchingNews(false)
    return stories
  }

  // Send email
  const handleSendEmail = async (editionId) => {
    setSending(true)
    try {
      const resp = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editionId }),
      })
      const data = await resp.json()
      setSending(false)
      if (data.ok) return { ok: true, text: `Email sent to ${data.count} subscribers!` }
      return { ok: false, text: `Send failed: ${data.error}` }
    } catch {
      setSending(false)
      return { ok: false, text: 'Email send failed. Check API config.' }
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-40"
        style={{ background: T.bg + 'ee', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}
      >
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between" style={{ height: 52 }}>
          <button
            onClick={() => navigate('latest')}
            className="flex items-center gap-2.5"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="font-bold text-sm tracking-tight" style={{ color: T.text }}>Trends</span>
            <span className="text-[10px] font-medium" style={{ color: T.muted }}>powered by</span>
            <img src="/risex-logo.png" alt="RISEx" style={{ height: 20 }} />
          </button>

          <div className="flex items-center gap-1">
            {['latest', 'archive'].map(v => (
              <button
                key={v}
                onClick={() => navigate(v)}
                className="px-3 py-1.5 text-xs font-medium rounded transition-all"
                style={{
                  color: view === v ? T.text : T.muted,
                  background: view === v ? '#151515' : 'transparent',
                  border: `1px solid ${view === v ? T.border2 : 'transparent'}`,
                  cursor: 'pointer',
                }}
              >
                {v === 'latest' ? 'Latest' : 'Archive'}
              </button>
            ))}
            {isLoggedIn && (
              <button
                onClick={() => navigate('admin')}
                className="px-3 py-1.5 text-xs font-medium rounded transition-all"
                style={{
                  color: view === 'admin' ? T.green : T.muted,
                  background: view === 'admin' ? '#00e67612' : 'transparent',
                  border: `1px solid ${view === 'admin' ? '#00e67630' : 'transparent'}`,
                  cursor: 'pointer',
                }}
              >
                Admin
              </button>
            )}
            <button
              onClick={() => isLoggedIn ? (setIsLoggedIn(false), navigate('latest')) : setShowLogin(true)}
              className="px-3 py-1.5 text-xs font-medium rounded ml-1"
              style={{
                color: isLoggedIn ? T.green : T.muted,
                background: isLoggedIn ? '#00e67612' : 'transparent',
                border: `1px solid ${isLoggedIn ? '#00e67630' : T.border2}`,
                cursor: 'pointer',
              }}
            >
              {isLoggedIn ? '\u25CF Admin' : 'Login'}
            </button>
          </div>
        </div>
      </header>

      {/* Login modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="rounded-lg p-6 w-80 space-y-4" style={{ background: '#111', border: `1px solid ${T.border2}` }}>
            <h3 className="font-bold text-sm" style={{ color: T.text }}>Admin Login</h3>
            <input
              type="password"
              value={loginPw}
              onChange={e => { setLoginPw(e.target.value); setLoginErr('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Password"
              autoFocus
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: '#1a1a1a', border: `1px solid ${T.border2}`, color: T.text }}
            />
            {loginErr && <p className="text-xs" style={{ color: '#ef4444' }}>{loginErr}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowLogin(false)} className="flex-1 py-2 rounded text-xs" style={{ border: `1px solid ${T.border2}`, color: T.dim, background: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleLogin} className="flex-1 py-2 rounded text-xs font-bold" style={{ background: T.green, color: '#000', cursor: 'pointer', border: 'none' }}>Login</button>
            </div>
          </div>
        </div>
      )}

      {/* Views */}
      {view === 'admin' && isLoggedIn ? (
        <Admin
          editions={editions}
          onSave={handleSave}
          onPublish={handlePublish}
          onFetchNews={handleFetchNews}
          onSendEmail={handleSendEmail}
          fetchingNews={fetchingNews}
          saving={saving}
          sending={sending}
          subscriberCount={subscribers.filter(s => s.active !== false).length}
        />
      ) : view === 'archive' ? (
        <Archive
          editions={editions.filter(e => e.status === 'published')}
          onSelect={(id) => navigate('edition', id)}
        />
      ) : (
        <WeeklyBrief
          edition={view === 'edition' ? selectedEdition : latestEdition}
          onSubscribe={handleSubscribe}
          subscribing={subscribing}
          subscribeMsg={subscribeMsg}
        />
      )}
    </div>
  )
}
