import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Client } from "pg"
import { resolve } from "path"

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/arthur_db"

async function main() {
  console.log("Starting database migrations...")
  
  const client = new Client({
    connectionString,
  })

  try {
    await client.connect()
    console.log("Connected to database successfully.")
    
    const db = drizzle(client)
    
    // Resolve migration path
    const migrationsFolder = resolve(process.cwd(), "./drizzle")
    console.log(`Reading migrations from: ${migrationsFolder}`)
    
    await migrate(db, { migrationsFolder })
    
    console.log("Migrations applied successfully!")
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
