import { marked } from 'marked'

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]))

async function readArticle(field, value, supabaseUrl, key) {
  const url = new URL('/rest/v1/articles', supabaseUrl)
  url.searchParams.set('select', '*')
  url.searchParams.set('status', 'eq.published')
  url.searchParams.set(field, `eq.${value}`)
  url.searchParams.set('limit', '1')
  const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!response.ok) throw new Error(`Article query failed: ${response.status}`)
  return (await response.json())[0] || null
}

export default async function handler(request, response) {
  const requestUrl = new URL(request.url, `https://${request.headers.host || 'localhost'}`)
  const slug = requestUrl.searchParams.get('slug') || ''
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!slug || !supabaseUrl || !key) return response.status(404).send('Story unavailable')

  try {
    const article = await readArticle('slug', slug, supabaseUrl, key) || await readArticle('id', slug, supabaseUrl, key)
    if (!article) return response.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Story unavailable | MyTokenWallet</title><h1>Story unavailable</h1><a href="/blog">Back to journal</a></html>')

    const origin = `${request.headers['x-forwarded-proto'] || 'https'}://${request.headers.host}`
    const canonical = `${origin}/blog/${encodeURIComponent(article.slug || article.id)}`
    const title = `${article.title} | MyTokenWallet Journal`
    const description = String(article.content || article.title).replace(/<[^>]*>/g, ' ').replace(/[#>*_~`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 157)
    const tags = Array.isArray(article.tags) ? article.tags : []
    const keywords = [article.title, article.category, ...tags].filter(Boolean).join(', ')
    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: article.title,
      description, image: article.cover_url || undefined, datePublished: article.created_at || undefined,
      dateModified: article.updated_at || article.created_at || undefined, keywords,
      articleSection: article.category || undefined, mainEntityOfPage: canonical,
      publisher: { '@type': 'Organization', name: 'MyTokenWallet', url: origin },
    }).replace(/</g, '\\u003c')
    const cover = article.cover_url ? `<img class="cover" src="${esc(article.cover_url)}" alt="${esc(article.title)}">` : ''
    const body = marked.parse(esc(article.content || ''))

    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    return response.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="keywords" content="${esc(keywords)}"><link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">${article.cover_url ? `<meta property="og:image" content="${esc(article.cover_url)}">` : ''}<meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${jsonLd}</script>
<style>:root{font-family:Arial,system-ui,sans-serif;color:#172622;background:#f5f7f4}*{box-sizing:border-box}body{margin:0}.top{background:#fff;border-bottom:1px solid #e4e9e5}.nav,.wrap,.bottom{width:min(1040px,calc(100% - 40px));margin:auto}.nav{height:72px;display:flex;align-items:center;justify-content:space-between}.brand{font-size:18px;font-weight:800;color:#173c37;text-decoration:none}.nav a:last-child,.back{color:#47794b;text-decoration:none;font-weight:700}.wrap{padding:38px 0 88px}.article{max-width:820px;margin:36px auto}.category{font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#57814d;font-weight:800}.h1{font-size:clamp(38px,6vw,66px);letter-spacing:-.06em;line-height:1.06;color:#173c37;margin:16px 0}.date{color:#77837e;font-size:12px;margin-bottom:28px}.cover{width:100%;max-height:460px;object-fit:cover;border-radius:8px;margin:16px 0 32px}.body{font-size:16px;line-height:1.9;color:#415047}.body h2,.body h3{line-height:1.25;color:#203a32;margin:32px 0 12px}.body p{margin:0 0 18px}.body ul,.body ol{padding-left:24px}.tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:34px}.tags span{border-radius:3px;background:#e9f1df;padding:7px 12px;font-size:11px;color:#416d47}.bottom{padding:18px 0 30px;border-top:1px solid #e4e9e5;color:#6f7c72;font-size:12px}.bottom a{margin-right:18px;color:#47794b}</style></head><body><header class="top"><nav class="nav"><a class="brand" href="/">mytokenwallet.</a><a href="/blog">Journal</a></nav></header><main class="wrap"><a class="back" href="/blog">← Back to journal</a><article class="article"><div class="category">${esc(article.category || 'Field notes')} · MyTokenWallet Journal</div><h1 class="h1">${esc(article.title)}</h1><p class="date">Updated ${esc(article.updated_at || article.created_at || '')}</p>${cover}<div class="body">${body}</div><div class="tags">${tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div></article></main><footer class="bottom"><a href="/">Home</a><a href="/security">Security</a><a href="/sitemap.xml">XML sitemap</a><a href="/sitemap.txt">Text sitemap</a></footer></body></html>`)
  } catch (error) {
    console.error('Unable to render article:', error)
    return response.status(502).send('Unable to load this story right now')
  }
}
