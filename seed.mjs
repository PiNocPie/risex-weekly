// One-time script: fetch news, analyze, publish first edition to Firestore
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyAZV4wUlTGelue7TC7_1EbxyjWuv2wfkX4',
  authDomain: 'rise-dashboard-bdf88.firebaseapp.com',
  projectId: 'rise-dashboard-bdf88',
  storageBucket: 'rise-dashboard-bdf88.firebasestorage.app',
  messagingSenderId: '28108311334',
  appId: '1:28108311334:web:4622949fc0a103093c8fe7',
})
const db = getFirestore(app)

// ─── Analysis helpers (same as App.jsx) ──────────────────────────────────

const BULLISH = ['surge','rally','bullish','gain','rise','uptick','breakout','recovery','growth','positive','adoption','partnership','launch','upgrade','soar','pump','ath','all-time high','accumulate','buy']
const BEARISH = ['crash','drop','bearish','decline','fall','plunge','dump','selloff','hack','exploit','ban','regulation','crackdown','warning','fear','panic','liquidat','rug','scam','sec','lawsuit']

const CRYPTO_TICKERS = {
  bitcoin: 'BTC', btc: 'BTC', ethereum: 'ETH', eth: 'ETH', solana: 'SOL', sol: 'SOL',
  ripple: 'XRP', xrp: 'XRP', cardano: 'ADA', dogecoin: 'DOGE',
  bnb: 'BNB', avax: 'AVAX', avalanche: 'AVAX', polygon: 'MATIC',
  chainlink: 'LINK', litecoin: 'LTC', polkadot: 'DOT',
  uniswap: 'UNI', aave: 'AAVE', arbitrum: 'ARB', optimism: 'OP', sui: 'SUI',
}
const COMMODITY_TICKERS = {
  gold: 'Gold', oil: 'Crude Oil', 'crude oil': 'Crude Oil', silver: 'Silver',
  copper: 'Copper', platinum: 'Platinum', 'natural gas': 'Natural Gas',
}
const ALL_TICKERS = { ...CRYPTO_TICKERS, ...COMMODITY_TICKERS }

function analyzeArticle(article) {
  const text = `${article.title || ''} ${article.body || ''}`.toLowerCase()
  const bullishScore = BULLISH.filter(w => text.includes(w)).length
  const bearishScore = BEARISH.filter(w => text.includes(w)).length
  let sentiment = 'neutral'
  if (bullishScore > bearishScore + 1) sentiment = 'bullish'
  else if (bearishScore > bullishScore + 1) sentiment = 'bearish'
  const importanceWords = ['critical','breaking','urgent','emergency','major','significant']
  const hasImportant = importanceWords.some(w => text.includes(w))
  const severity = hasImportant ? 'critical' : (bullishScore + bearishScore > 3 ? 'high' : 'medium')
  const tickers = new Set()
  Object.entries(ALL_TICKERS).forEach(([keyword, ticker]) => { if (text.includes(keyword)) tickers.add(ticker) })
  const tickerList = [...tickers]
  const bullishSignals = sentiment !== 'bearish' ? tickerList.slice(0, 2).map(t => ({
    ticker: t, note: `${t} — ${sentiment === 'bullish' ? 'bullish momentum' : 'watch for upside'}`,
    strength: Math.min(95, 40 + bullishScore * 15),
  })) : []
  const bearishSignals = sentiment !== 'bullish' ? tickerList.slice(0, 2).map(t => ({
    ticker: t, note: `${t} — ${sentiment === 'bearish' ? 'downward pressure' : 'risk to monitor'}`,
    strength: Math.min(95, 40 + bearishScore * 15),
  })) : []

  return {
    id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    headline: article.title || 'Untitled',
    source: article.source_info?.name || article.source || 'CryptoCompare',
    sourceUrl: article.url || article.guid || '',
    summary: (article.body || '').slice(0, 350) + (article.body?.length > 350 ? '...' : ''),
    severity, sentiment,
    tickers: tickerList,
    bullishSignals, bearishSignals,
  }
}

// ─── Fetch and seed ─────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching crypto & commodity news...')

  const resp = await fetch(
    'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,ETH,Altcoin,Blockchain,DeFi&sortOrder=latest'
  )
  const data = await resp.json()
  const articles = (data.Data || []).slice(0, 8)

  console.log(`Got ${articles.length} articles. Analyzing...`)

  const stories = articles.map(a => analyzeArticle(a))

  // Fetch price snapshot from CoinGecko
  let snapshot = []
  try {
    const priceResp = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd&include_24hr_change=true'
    )
    const prices = await priceResp.json()
    const fmt = (id, sym) => {
      const p = prices[id]
      if (!p) return null
      const price = p.usd >= 1000 ? `$${p.usd.toLocaleString('en-US', {maximumFractionDigits: 0})}` : `$${p.usd.toFixed(2)}`
      const chg = p.usd_24h_change
      const change = chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%` : ''
      return { symbol: sym, price, change }
    }
    snapshot = [fmt('bitcoin','BTC'), fmt('ethereum','ETH'), fmt('solana','SOL'), fmt('ripple','XRP')].filter(Boolean)
  } catch (e) {
    console.log('Price fetch failed, skipping snapshot:', e.message)
  }

  const today = new Date().toISOString().slice(0, 10)
  const edition = {
    title: `Trends — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    summary: 'This week\'s top crypto & commodity market stories — curated intelligence powered by RISEx.',
    weekDate: today,
    editionNumber: 1,
    status: 'published',
    stories,
    snapshot,
    publishedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  console.log(`Publishing edition with ${stories.length} stories...`)
  const ref = await addDoc(collection(db, 'weekly-editions'), edition)
  console.log(`✓ Published! Edition ID: ${ref.id}`)
  console.log(`  Stories: ${stories.map(s => s.headline.slice(0, 50)).join('\n           ')}`)
  console.log(`  Snapshot: ${snapshot.map(s => `${s.symbol} ${s.price} ${s.change}`).join(' | ')}`)
  console.log('\nView at: https://risex-weekly.vercel.app')

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
