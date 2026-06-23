import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema"
import { eq } from "drizzle-orm"

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/arthur_db"
console.log("Connecting to database for seeding...")
const pool = new Pool({ connectionString })
const db = drizzle(pool, { schema })

async function main() {
  try {
    console.log("Seeding started...")

    // 1. Seed Frames
    const defaultFrames = [
      { id: "gold", name: "Borda Dourada", borderClass: "border-4 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] rounded-xl" },
      { id: "polaroid", name: "Polaroid Clássica", borderClass: "bg-white p-3 pb-12 shadow-2xl rounded-sm border border-neutral-200" },
      { id: "soccer", name: "Estrelas do Futebol", borderClass: "border-4 border-blue-400 bg-blue-50/10 rounded-xl relative shadow-md" },
    ]

    for (const frame of defaultFrames) {
      const existing = await db.select().from(schema.frames).where(eq(schema.frames.id, frame.id))
      if (existing.length === 0) {
        console.log(`Inserting frame: ${frame.name}`)
        await db.insert(schema.frames).values(frame)
      } else {
        console.log(`Frame ${frame.name} already exists.`)
      }
    }

    // 2. Seed Default Admin/Seed User
    const seedUserId = "seed-user-id"
    const existingUser = await db.select().from(schema.users).where(eq(schema.users.id, seedUserId))
    if (existingUser.length === 0) {
      console.log("Inserting seed user...")
      await db.insert(schema.users).values({
        id: seedUserId,
        name: "Arthur Administrador",
        email: "arthur@guerreiro.com",
        image: null,
      })
    } else {
      console.log("Seed user already exists.")
    }

    const adminUserId = "admin-user-id"
    const existingAdminUser = await db.select().from(schema.users).where(eq(schema.users.id, adminUserId))
    if (existingAdminUser.length === 0) {
      console.log("Inserting admin user...")
      await db.insert(schema.users).values({
        id: adminUserId,
        name: "Arthur Administrador",
        email: "admin@guerreiroesonhador.com",
        image: null,
      })
    } else {
      console.log("Admin user already exists.")
    }


    console.log("Seeding completed successfully!")
  } catch (error) {
    console.error("Seeding failed:", error)
  } finally {
    await pool.end()
  }
}

main()
