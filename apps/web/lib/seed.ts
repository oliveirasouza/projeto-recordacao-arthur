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

    // 3. Seed Moments
    const sampleMoments = [
      {
        title: "Seu Primeiro Golo!",
        type: "image",
        mediaUrl: "/first_goal.png",
        date: new Date("2024-05-13T10:00:00Z"),
        caption: "A alegria pura! A primeira conquista.",
        frameId: "soccer",
        userId: seedUserId,
        category: "Momentos",
        dreamCategory: null,
        duration: null,
      },
      {
        title: "Sonhando Alto",
        type: "image",
        mediaUrl: "/dribble_training.png",
        date: new Date("2024-04-30T14:30:00Z"),
        caption: "O esforço diário rumo ao topo.",
        frameId: "gold",
        userId: seedUserId,
        category: null,
        dreamCategory: "Galeria de Sonhos",
        duration: null,
      },
      {
        title: "Dia de Jogo",
        type: "image",
        mediaUrl: "/game_day.png",
        date: new Date("2024-06-15T09:00:00Z"),
        caption: "Emoção em campo!",
        frameId: "polaroid",
        userId: seedUserId,
        category: "Momentos",
        dreamCategory: null,
        duration: null,
      },
      {
        title: "Golaço de Falta!",
        type: "video",
        mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        date: new Date("2024-06-10T16:00:00Z"),
        caption: "A bola fez a curva perfeita direto no ângulo!",
        frameId: "soccer",
        userId: seedUserId,
        category: null,
        dreamCategory: null,
        duration: "0:15",
      },
    ]

    console.log("Clearing and re-inserting sample moments...")
    await db.delete(schema.moments)
    for (const moment of sampleMoments) {
      await db.insert(schema.moments).values(moment)
    }

    console.log("Seeding completed successfully!")
  } catch (error) {
    console.error("Seeding failed:", error)
  } finally {
    await pool.end()
  }
}

main()
