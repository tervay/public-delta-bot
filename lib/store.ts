import { get, put } from '@vercel/blob'

export async function readJson<T>(pathname: string, fresh = false): Promise<T | null> {
  const result = await get(pathname, { access: 'private', useCache: !fresh })
  if (!result || result.statusCode !== 200) return null
  return (await new Response(result.stream).json()) as T
}

export async function writeJson(pathname: string, data: unknown) {
  await put(pathname, JSON.stringify(data), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 3600,
  })
}
