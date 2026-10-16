export async function notify(content: string) {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) throw new Error('DISCORD_WEBHOOK_URL is not set')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, allowed_mentions: { parse: ['everyone'] } }),
  })
  if (!res.ok) throw new Error(`Discord webhook returned ${res.status}`)
}
