import app from './app'
import dotenv from 'dotenv'

dotenv.config()

// Check for critical environment variables and warn if missing
if (!process.env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL is not set. Prisma will fail to connect without it.')
}
if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Using a default secret is insecure for production.')
}

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
