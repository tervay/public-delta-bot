import { routes, type VercelConfig } from '@vercel/config/v1'

export const config: VercelConfig = {
  rewrites: [routes.rewrite('/', '/api/page')],
  crons: [{ path: '/api/snapshot', schedule: '0 10 * * *' }],
}
