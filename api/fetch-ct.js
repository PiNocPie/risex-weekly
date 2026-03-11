// Vercel serverless — fetch popular Crypto Twitter posts
// Env: TWITTER_BEARER_TOKEN

export default async function handler(req, res) {
  const token = process.env.TWITTER_BEARER_TOKEN
  if (!token) return res.status(500).json({ error: 'TWITTER_BEARER_TOKEN not set' })

  try {
    const query = encodeURIComponent(
      '(crypto OR bitcoin OR $BTC OR ethereum OR $ETH OR $SOL OR altcoin OR defi OR "on chain") -is:retweet lang:en'
    )
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=20&sort_order=relevancy&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=name,username,profile_image_url`

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!resp.ok) {
      const err = await resp.text()
      return res.status(resp.status).json({ error: `Twitter API: ${resp.status}`, detail: err })
    }

    const data = await resp.json()
    const users = {}
    ;(data.includes?.users || []).forEach(u => { users[u.id] = u })

    const tweets = (data.data || []).map(t => {
      const author = users[t.author_id] || {}
      const m = t.public_metrics || {}
      return {
        id: t.id,
        author: `@${author.username || 'unknown'}`,
        authorName: author.name || '',
        avatar: author.profile_image_url || '',
        text: t.text,
        likes: m.like_count || 0,
        retweets: m.retweet_count || 0,
        replies: m.reply_count || 0,
        tweetUrl: `https://x.com/${author.username}/status/${t.id}`,
        postedAt: t.created_at,
      }
    })

    // Sort by engagement (likes + retweets)
    tweets.sort((a, b) => (b.likes + b.retweets) - (a.likes + a.retweets))

    res.setHeader('Cache-Control', 's-maxage=300')
    return res.json({ ok: true, tweets: tweets.slice(0, 10) })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
