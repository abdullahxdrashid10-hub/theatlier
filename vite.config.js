import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function devApiCuratorPlugin() {
  return {
    name: 'dev-api-curator',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/curator' && req.method === 'POST') {
          try {
            const { default: handler } = await import('./api/curator.js')
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              const syntheticReq = new Request('http://localhost/api/curator', {
                method: 'POST',
                headers: req.headers,
                body: body || null,
              })
              const response = await handler(syntheticReq)
              res.statusCode = response.status
              for (const [key, value] of response.headers.entries()) {
                res.setHeader(key, value)
              }
              if (response.body) {
                const reader = response.body.getReader()
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  res.write(value)
                }
                res.end()
              } else {
                res.end()
              }
            })
          } catch (err) {
            console.error('Error executing dev api/curator:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devApiCuratorPlugin()],
  server: {
    watch: {
      usePolling: true,
      interval: 150,
    },
  },
})
