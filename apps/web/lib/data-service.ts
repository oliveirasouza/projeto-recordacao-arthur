import { db } from "./db"
import { moments, frames, mediaFiles } from "./schema"
import { desc, eq, sql } from "drizzle-orm"

export interface MomentType {
  id: number
  userId?: string | null
  mediaUrl: string
  type: string
  title: string
  date: Date
  caption: string | null
  frameId: string | null
  mediaStatus?: string | null // 'ready' | 'processing' | 'failed'
  category?: string | null // Novo: categoria no menu Momentos
  dreamCategory?: string | null // Novo: categoria no menu Galeria dos Sonhos
  duration?: string | null // Novo: duração do vídeo
}

export interface FrameType {
  id: string
  name: string
  borderClass: string
}

export const fallbackFrames: FrameType[] = [
  { id: "gold", name: "Borda Dourada", borderClass: "border-4 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)] rounded-xl" },
  { id: "polaroid", name: "Polaroid Clássica", borderClass: "bg-white p-3 pb-12 shadow-xl rounded-none border border-neutral-200" },
  { id: "soccer", name: "Estrelas do Futebol", borderClass: "border-4 border-blue-400 bg-sky-50/50 rounded-xl relative shadow-md" },
]

export const fallbackMoments: MomentType[] = [
  {
    id: 1,
    mediaUrl: "/first_goal.png",
    type: "image",
    title: "Seu Primeiro Golo!",
    date: new Date("2024-05-13T10:00:00Z"),
    caption: "A alegria pura! A primeira conquista.",
    frameId: "soccer",
    userId: "seed-user-id",
    category: "Momentos",
  },
  {
    id: 2,
    mediaUrl: "/dribble_training.png",
    type: "image",
    title: "Sonhando Alto",
    date: new Date("2024-04-30T14:30:00Z"),
    caption: "O esforço diário rumo ao topo.",
    frameId: "gold",
    userId: "seed-user-id",
    dreamCategory: "Galeria de Sonhos",
  },
  {
    id: 3,
    mediaUrl: "/game_day.png",
    type: "image",
    title: "Dia de Jogo",
    date: new Date("2024-06-15T09:00:00Z"),
    caption: "Emoção em campo!",
    frameId: "polaroid",
    userId: "seed-user-id",
    category: "Momentos",
  },
  {
    id: 4,
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    type: "video",
    title: "Golaço de Falta!",
    date: new Date("2024-06-10T16:00:00Z"),
    caption: "A bola fez a curva perfeita direto no ângulo!",
    frameId: "soccer",
    userId: "seed-user-id",
  },
]

// In-memory array for runtime testing if database is not active
const inMemoryMoments: MomentType[] = []

export async function getMoments(): Promise<MomentType[]> {
  try {
    const list = await db
      .select({
        id: moments.id,
        userId: moments.userId,
        mediaUrl: moments.mediaUrl,
        type: moments.type,
        title: moments.title,
        date: moments.date,
        caption: moments.caption,
        frameId: moments.frameId,
        mediaStatus: mediaFiles.status,
        category: moments.category,
        dreamCategory: moments.dreamCategory,
        duration: moments.duration,
      })
      .from(moments)
      .leftJoin(mediaFiles, sql`${moments.mediaUrl} = concat('/api/media/', ${mediaFiles.id})`)
      .orderBy(desc(moments.date))
    return list
  } catch (error) {
    console.warn("Database connection failed, using memory fallback for moments:", error instanceof Error ? error.message : error)
    return [...fallbackMoments, ...inMemoryMoments].sort((a, b) => b.date.getTime() - a.date.getTime())
  }
}

export async function getFrames(): Promise<FrameType[]> {
  try {
    return await db.select().from(frames)
  } catch (error) {
    console.warn("Database connection failed, using fallback for frames:", error instanceof Error ? error.message : error)
    return fallbackFrames
  }
}

export async function addMoment(data: {
  title: string
  type: string
  mediaUrl: string
  date: Date
  caption: string
  frameId: string
  userId?: string | null
  category?: string | null
  dreamCategory?: string | null
  duration?: string | null
}): Promise<MomentType> {
  try {
    const [inserted] = await db.insert(moments).values({
      title: data.title,
      type: data.type,
      mediaUrl: data.mediaUrl,
      date: data.date,
      caption: data.caption,
      frameId: data.frameId,
      userId: data.userId || null,
      category: data.category || null,
      dreamCategory: data.dreamCategory || null,
      duration: data.duration || null,
    }).returning()
    if (!inserted) {
      throw new Error("Falha ao retornar registro inserido")
    }
    return inserted
  } catch (error) {
    console.warn("Database insert failed, fallback to memory storage:", error instanceof Error ? error.message : error)
    const newMoment: MomentType = {
      id: Math.floor(Math.random() * 1000000) + 10,
      title: data.title,
      type: data.type,
      mediaUrl: data.mediaUrl,
      date: data.date,
      caption: data.caption,
      frameId: data.frameId,
      userId: data.userId || null,
      category: data.category || null,
      dreamCategory: data.dreamCategory || null,
      duration: data.duration || null,
    }
    inMemoryMoments.push(newMoment)
    return newMoment
  }
}

export async function updateMoment(
  id: number | string,
  data: {
    title: string
    type: string
    mediaUrl: string
    date: Date
    caption: string
    frameId: string
    category?: string | null
    dreamCategory?: string | null
    duration?: string | null
  }
): Promise<MomentType> {
  const numericId = typeof id === "string" ? parseInt(id, 10) : id
  if (isNaN(numericId)) {
    throw new Error("ID inválido para atualização")
  }

  try {
    const [updated] = await db
      .update(moments)
      .set({
        title: data.title,
        type: data.type,
        mediaUrl: data.mediaUrl,
        date: data.date,
        caption: data.caption,
        frameId: data.frameId,
        category: data.category || null,
        dreamCategory: data.dreamCategory || null,
        duration: data.duration || null,
      })
      .where(eq(moments.id, numericId))
      .returning()
    
    if (!updated) {
      throw new Error("Momento não encontrado ou erro ao atualizar")
    }
    return updated
  } catch (error) {
    console.warn("Database update failed, fallback to memory storage:", error instanceof Error ? error.message : error)
    
    const idx = inMemoryMoments.findIndex((m) => m.id === numericId)
    if (idx !== -1) {
      const current = inMemoryMoments[idx]!
      const updatedMoment: MomentType = {
        id: current.id,
        userId: current.userId,
        title: data.title,
        type: data.type,
        mediaUrl: data.mediaUrl,
        date: data.date,
        caption: data.caption,
        frameId: data.frameId,
        category: data.category || null,
        dreamCategory: data.dreamCategory || null,
        duration: data.duration || null,
      }
      inMemoryMoments[idx] = updatedMoment
      return updatedMoment
    }
    
    const fallbackIdx = fallbackMoments.findIndex((m) => m.id === id)
    if (fallbackIdx !== -1) {
      const current = fallbackMoments[fallbackIdx]!
      const updatedMoment: MomentType = {
        id: current.id,
        userId: current.userId,
        title: data.title,
        type: data.type,
        mediaUrl: data.mediaUrl,
        date: data.date,
        caption: data.caption,
        frameId: data.frameId,
        category: data.category || null,
        dreamCategory: data.dreamCategory || null,
        duration: data.duration || null,
      }
      fallbackMoments[fallbackIdx] = updatedMoment
      return updatedMoment
    }
    throw new Error("Momento não encontrado no fallback de memória")
  }
}

export async function deleteMoment(id: number | string): Promise<boolean> {
  const numericId = typeof id === "string" ? parseInt(id, 10) : id
  if (isNaN(numericId)) return false

  try {
    const deleted = await db.delete(moments).where(eq(moments.id, numericId)).returning()
    if (deleted.length > 0) {
      return true
    }
    
    // If database connection was successful but row was not found, check memory arrays
    const idx = inMemoryMoments.findIndex((m) => m.id === numericId)
    if (idx !== -1) {
      inMemoryMoments.splice(idx, 1)
      return true
    }
    const fallbackIdx = fallbackMoments.findIndex((m) => m.id === numericId)
    if (fallbackIdx !== -1) {
      fallbackMoments.splice(fallbackIdx, 1)
      return true
    }
    return false
  } catch (error) {
    console.warn("Database delete failed, fallback to memory storage:", error instanceof Error ? error.message : error)
    const idx = inMemoryMoments.findIndex((m) => m.id === numericId)
    if (idx !== -1) {
      inMemoryMoments.splice(idx, 1)
      return true
    }
    const fallbackIdx = fallbackMoments.findIndex((m) => m.id === numericId)
    if (fallbackIdx !== -1) {
      fallbackMoments.splice(fallbackIdx, 1)
      return true
    }
    return false
  }
}

export async function getMomentById(id: number | string): Promise<MomentType | null> {
  const numericId = typeof id === "string" ? parseInt(id, 10) : id
  if (isNaN(numericId)) return null

  try {
    const [moment] = await db
      .select({
        id: moments.id,
        userId: moments.userId,
        mediaUrl: moments.mediaUrl,
        type: moments.type,
        title: moments.title,
        date: moments.date,
        caption: moments.caption,
        frameId: moments.frameId,
        mediaStatus: mediaFiles.status,
        category: moments.category,
        dreamCategory: moments.dreamCategory,
        duration: moments.duration,
      })
      .from(moments)
      .leftJoin(mediaFiles, sql`${moments.mediaUrl} = concat('/api/media/', ${mediaFiles.id})`)
      .where(eq(moments.id, numericId))
    if (moment) return moment
  } catch (error) {
    console.warn("Database lookup failed, fallback to memory storage")
  }
  const m = inMemoryMoments.find((x) => x.id === numericId) || fallbackMoments.find((x) => x.id === numericId)
  return m || null
}
