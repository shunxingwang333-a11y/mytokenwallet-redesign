const escapeXml = value => String(value).replace(/[<>&"']/g, ch => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[ch]))

export default async function handler(request, response) {
  const requestUrl = new URL(request.url, `https://${request.headers.host || 'localhost'}`)
  const origin = `${request.headers['x-forwarded-proto'] || 'https'}://${request.headers.host}`
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !key) return response.status(503).send('Sitemap is temporarily unavailable')

  try {
    const endpoint = new URL('/rest/v1/articles', supabaseUrl)
    endpoint.searchParams.set('select', 'id,slug,updated_at,created_at')
    endpoint.searchParams.set('status', 'eq.published')
    endpoint.searchParams.set('order', 'updated_at.desc.nullslast')
    const result = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!result.ok) throw new Error(`Supabase returned ${result.status}`)
    const articles = await result.json()
    const fixed = ['/', '/wallet-download', '/security', '/asset-operations', '/explore', '/blog']
    const pages = [
      ...fixed.map(path => ({ url: `${origin}${path}` })),
      ...articles.map(article => ({
        url: `${origin}/blog/${encodeURIComponent(article.slug || article.id)}`,
        updated: article.updated_at || article.created_at,
      })),
    ]
    response.setHeader('Cache-Control', 'no-store')
    if (requestUrl.searchParams.get('format') === 'txt') {
      response.setHeader('Content-Type', 'text/plain; charset=utf-8')
      return response.status(200).send(pages.map(page => page.url).join('\n'))
    }
    const urls = pages.map(page => `  <url><loc>${escapeXml(page.url)}</loc>${page.updated ? `<lastmod>${new Date(page.updated).toISOString()}</lastmod>` : ''}</url>`).join('\n')
    response.setHeader('Content-Type', 'application/xml; charset=utf-8')
    return response.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`)
  } catch (error) {
    console.error('Sitemap generation failed:', error)
    return response.status(502).send('Unable to load published article URLs')
  }
}
