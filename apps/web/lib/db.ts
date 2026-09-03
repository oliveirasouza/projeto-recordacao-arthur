import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn("DATABASE_URL is not defined in environment variables. Falling back to default local connection.")
}

// In development, we fallback to a default local postgres connection if DATABASE_URL is not set
const finalConnectionString = connectionString || "postgresql://postgres:postgres@localhost:5432/arthur_db"

const isNeon = finalConnectionString.includes("neon.tech") || finalConnectionString.includes("sslmode=require")

const pool = new Pool({
  connectionString: finalConnectionString,
  ssl: isNeon ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000,
})

// Prevent background pg pool errors from crashing the Node/Next.js process when the database is offline
pool.on("error", (err) => {
  console.warn("PostgreSQL Pool connection error:", err.message)
})

export const db = drizzle(pool, { schema })
export type DbClient = typeof db
