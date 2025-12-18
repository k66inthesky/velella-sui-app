import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import walletRoutes from './routes/wallet.routes.js'
import objectRoutes from './routes/object.routes.js'

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/wallet', walletRoutes)
app.use('/api/object', objectRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
