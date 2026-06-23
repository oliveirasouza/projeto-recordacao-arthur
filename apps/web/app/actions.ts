"use server"

import { auth } from "../auth"
import { addMoment, updateMoment, deleteMoment, getMomentById } from "../lib/data-service"
import { revalidatePath } from "next/cache"
import { db } from "../lib/db"
import { mediaFiles } from "../lib/schema"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"
import { startVideoCompressionInBackground } from "../lib/video-optimizer"

export interface ActionResponse {
  success: boolean
  error?: string
}

export async function uploadMomentAction(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const session = await auth()

  // Guard clause for authentication
  if (!session) {
    return { success: false, error: "Não autorizado. Por favor faça login com a senha de acesso para adicionar momentos." }
  }

  const title = formData.get("title") as string | null
  const caption = formData.get("caption") as string | null
  const dateStr = formData.get("date") as string | null
  const frameId = formData.get("frameId") as string | null
  const file = formData.get("file") as File | null
  const category = formData.get("category") as string | null
  const duration = formData.get("duration") as string | null

  if (!title || !dateStr || !frameId || !category) {
    return { success: false, error: "Campos obrigatórios não preenchidos (Título, Data, Moldura ou Categoria)." }
  }

  if (!file || file.size === 0) {
    return { success: false, error: "Por favor, selecione uma foto ou vídeo para carregar." }
  }

  const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|ogg|mov|mkv|avi|flv|wmv|3gp)$/i.test(file.name)

  if (category === "Vídeos" && !isVideo) {
    return { success: false, error: "Por favor, selecione um arquivo de vídeo para o menu Vídeos." }
  }
  if (category !== "Vídeos" && isVideo) {
    return { success: false, error: "Por favor, selecione uma imagem para este menu." }
  }

  let finalCategory: string | null = null
  let finalDreamCategory: string | null = null
  let finalDuration: string | null = null
  const mediaType = isVideo ? "video" : "image"

  if (category === "Momentos") {
    finalCategory = "Momentos"
  } else if (category === "Galeria de Sonhos") {
    finalDreamCategory = "Galeria de Sonhos"
  } else if (category === "Vídeos") {
    finalDuration = duration
  }

  let mediaUrl = ""

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileId = randomUUID()

    const [insertedFile] = await db
      .insert(mediaFiles)
      .values({
        id: fileId,
        filename: file.name,
        mimetype: file.type,
        data: buffer,
        status: isVideo ? "processing" : "ready",
      })
      .returning()

    if (!insertedFile) {
      throw new Error("Falha ao salvar o arquivo no banco de dados.")
    }

    mediaUrl = `/api/media/${insertedFile.id}`

    // Dispara a compressão em background se for um vídeo
    if (isVideo) {
      startVideoCompressionInBackground(insertedFile.id, file.name, buffer).catch((err) => {
        console.error("[Actions] Erro ao disparar compressão de vídeo:", err)
      })
    }
  } catch (err) {
    console.error("File save error:", err)
    return { success: false, error: "Ocorreu um erro ao salvar o arquivo no banco de dados." }
  }

  try {
    await addMoment({
      title,
      type: mediaType,
      mediaUrl,
      date: new Date(dateStr),
      caption: caption || "",
      frameId,
      userId: session.user?.id || null,
      category: finalCategory,
      dreamCategory: finalDreamCategory,
      duration: finalDuration,
    })

    revalidatePath("/")
    return { success: true }
  } catch (err) {
    console.error("Database insert error:", err)
    return { success: false, error: "Erro ao registrar o momento no banco de dados." }
  }
}

export async function editMomentAction(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const session = await auth()

  if (!session) {
    return { success: false, error: "Não autorizado. Por favor faça login com a senha de acesso para alterar momentos." }
  }

  const idStr = formData.get("id") as string | null
  const title = formData.get("title") as string | null
  const caption = formData.get("caption") as string | null
  const dateStr = formData.get("date") as string | null
  const frameId = formData.get("frameId") as string | null
  const file = formData.get("file") as File | null

  const category = formData.get("category") as string | null
  const duration = formData.get("duration") as string | null

  if (!category) {
    return { success: false, error: "Categoria é obrigatória." }
  }

  if (!idStr || !title || !dateStr || !frameId) {
    return { success: false, error: "Campos obrigatórios não preenchidos (ID, Título, Data ou Moldura)." }
  }

  const id = parseInt(idStr, 10)
  const oldMoment = await getMomentById(id)
  if (!oldMoment) {
    return { success: false, error: "Momento não encontrado." }
  }

  let mediaUrl = oldMoment.mediaUrl
  let mediaType = oldMoment.type

  // If a new file was uploaded, replace the old file
  if (file && file.size > 0) {
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|ogg|mov|mkv|avi|flv|wmv|3gp)$/i.test(file.name)
    mediaType = isVideo ? "video" : "image"
    try {
      // 1. Delete old file from database if it was a DB media file
      if (oldMoment.mediaUrl.startsWith("/api/media/")) {
        const oldId = oldMoment.mediaUrl.replace("/api/media/", "")
        await db.delete(mediaFiles).where(eq(mediaFiles.id, oldId))
      }

      // 2. Save new file
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const fileId = randomUUID()

      const [insertedFile] = await db
        .insert(mediaFiles)
        .values({
          id: fileId,
          filename: file.name,
          mimetype: file.type,
          data: buffer,
          status: isVideo ? "processing" : "ready",
        })
        .returning()

      if (!insertedFile) {
        throw new Error("Falha ao salvar o novo arquivo no banco de dados.")
      }

      mediaUrl = `/api/media/${insertedFile.id}`

      // Dispara a compressão em background se for um vídeo
      if (isVideo) {
        startVideoCompressionInBackground(insertedFile.id, file.name, buffer).catch((err) => {
          console.error("[Actions Edit] Erro ao disparar compressão de vídeo:", err)
        })
      }
    } catch (err) {
      console.error("File replace error:", err)
      return { success: false, error: "Ocorreu um erro ao salvar o novo arquivo no banco de dados." }
    }
  }

  if (category === "Vídeos" && mediaType !== "video") {
    return { success: false, error: "Por favor, selecione um arquivo de vídeo para a categoria Vídeos." }
  }
  if (category !== "Vídeos" && mediaType === "video") {
    return { success: false, error: `Por favor, selecione uma imagem para a categoria ${category}.` }
  }

  let finalCategory: string | null = null
  let finalDreamCategory: string | null = null
  let finalDuration: string | null = null

  if (category === "Momentos") {
    finalCategory = "Momentos"
  } else if (category === "Galeria de Sonhos") {
    finalDreamCategory = "Galeria de Sonhos"
  } else if (category === "Vídeos" || category === "Videos") {
    finalDuration = duration
  }

  try {
    await updateMoment(id, {
      title,
      type: mediaType,
      mediaUrl,
      date: new Date(dateStr),
      caption: caption || "",
      frameId,
      category: finalCategory,
      dreamCategory: finalDreamCategory,
      duration: finalDuration,
    })

    revalidatePath("/")
    return { success: true }
  } catch (err) {
    console.error("Database update error:", err)
    return { success: false, error: "Erro ao atualizar o momento no banco de dados." }
  }
}

export async function deleteMomentAction(momentId: number | string): Promise<ActionResponse> {
  const session = await auth()

  if (!session) {
    return { success: false, error: "Não autorizado. Por favor faça login com a senha de acesso para excluir momentos." }
  }

  const numericId = typeof momentId === "string" ? parseInt(momentId, 10) : momentId
  if (isNaN(numericId)) {
    return { success: false, error: "ID de momento inválido." }
  }

  try {
    const moment = await getMomentById(numericId)
    if (!moment) {
      return { success: false, error: "Momento não encontrado." }
    }

    // Delete associated uploaded file
    if (moment.mediaUrl.startsWith("/api/media/")) {
      const fileId = moment.mediaUrl.replace("/api/media/", "")
      await db.delete(mediaFiles).where(eq(mediaFiles.id, fileId)).catch((err) => {
        console.warn("Failed to delete media file from database on moment deletion:", err)
      })
    }

    const success = await deleteMoment(numericId)
    if (!success) {
      return { success: false, error: "Não foi possível excluir o momento." }
    }

    revalidatePath("/")
    return { success: true }
  } catch (err) {
    console.error("Database delete error:", err)
    return { success: false, error: "Erro ao excluir o momento no banco de dados." }
  }
}

export async function sendContactEmailAction(
  name: string,
  email: string,
  message: string
): Promise<ActionResponse> {
  const apiKey = process.env.RESEND_API_KEY
  const toEmail = process.env.CONTACT_EMAIL

  if (!name || !email || !message) {
    return { success: false, error: "Preencha todos os campos do formulário." }
  }

  if (!apiKey) {
    console.warn("RESEND_API_KEY is not defined. Email send skipped.")
    return {
      success: false,
      error: "O serviço de e-mail não está configurado. Por favor, configure a variável RESEND_API_KEY no arquivo .env."
    }
  }

  const targetEmail = toEmail || "contato@guerreiroesonhador.com"

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Arthur Recordações <onboarding@resend.dev>",
        to: targetEmail,
        subject: `Nova mensagem de apoio de ${name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0284c7; margin-bottom: 20px;">Nova Mensagem de Apoio para o Arthur! ⚽</h2>
            <p>Você recebeu uma nova mensagem enviada a partir do painel de recordações.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p><strong>Nome do Remetente:</strong> ${name}</p>
            <p><strong>E-mail de Contato:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Mensagem de Incentivo:</strong></p>
            <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0284c7; font-style: italic; border-radius: 4px;">
              "${message}"
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #64748b; text-align: center;">Este é um e-mail automático enviado pelo sistema de recordações do Arthur.</p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      let errorMessage = `Falha ao enviar: ${res.statusText}`
      try {
        const errJson = await res.json()
        if (errJson && errJson.message) {
          errorMessage = errJson.message
        }
      } catch (_) {
        // Ignorar falha de parser json
      }
      console.error("Resend API error:", errorMessage)
      return { success: false, error: errorMessage }
    }

    const data = await res.json()
    console.log("Email sent successfully via Resend:", data.id)
    return { success: true }
  } catch (error) {
    console.error("Email send error:", error)
    return { success: false, error: "Ocorreu um erro inesperado ao enviar a mensagem." }
  }
}

