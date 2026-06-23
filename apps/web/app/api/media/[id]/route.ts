import { db } from "../../../../lib/db"
import { mediaFiles } from "../../../../lib/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return new Response("ID não fornecido", { status: 400 })
    }

    const [file] = await db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.id, id))

    if (!file) {
      return new Response("Arquivo não encontrado", { status: 404 })
    }

    const range = request.headers.get("range")
    const totalSize = file.data.length

    if (range) {
      // Parse Range header: e.g. "bytes=0-100000" or "bytes=0-"
      const parts = range.replace(/bytes=/, "").split("-")
      const startStr = parts[0]
      const endStr = parts[1]

      const start = startStr ? parseInt(startStr, 10) : 0
      const end = endStr ? parseInt(endStr, 10) : totalSize - 1

      if (start >= totalSize || end >= totalSize || start > end) {
        return new Response("Requested range not satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalSize}`,
          },
        })
      }

      const chunkSize = (end - start) + 1
      const chunk = file.data.slice(start, end + 1)

      const headers = new Headers()
      headers.set("Content-Type", file.mimetype)
      headers.set("Content-Range", `bytes ${start}-${end}/${totalSize}`)
      headers.set("Accept-Ranges", "bytes")
      headers.set("Content-Length", chunkSize.toString())
      headers.set("Cache-Control", "public, max-age=31536000, immutable")

      return new Response(new Uint8Array(chunk), {
        status: 206, // Partial Content
        headers,
      })
    }

    // Default response (full file)
    const headers = new Headers()
    headers.set("Content-Type", file.mimetype)
    headers.set("Accept-Ranges", "bytes")
    headers.set("Content-Length", totalSize.toString())
    headers.set("Cache-Control", "public, max-age=31536000, immutable")

    return new Response(new Uint8Array(file.data), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Erro ao servir mídia:", error)
    return new Response("Erro interno do servidor", { status: 500 })
  }
}
