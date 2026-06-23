import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import os from "os"
import { db } from "./db"
import { mediaFiles } from "./schema"
import { eq } from "drizzle-orm"

// Resolve the FFmpeg path dynamically
async function getFFmpegPath(): Promise<string | null> {
  // 1. Try using the npm package 'ffmpeg-static'
  try {
    const ffmpegStatic = await import("ffmpeg-static")
    const ffmpegPath = ffmpegStatic.default || (ffmpegStatic as any)
    if (ffmpegPath && typeof ffmpegPath === "string" && fs.existsSync(ffmpegPath)) {
      return ffmpegPath
    }
  } catch (err) {
    console.warn("ffmpeg-static não pôde ser carregado, usando fallback de sistema:", err)
  }

  // 2. Fallback to system ffmpeg command
  return "ffmpeg"
}

/**
 * Comprime um arquivo de vídeo de forma assíncrona usando FFmpeg.
 * Redimensiona a resolução para largura máxima de 1280px (720p), mantendo a proporção,
 * converte para codec H.264 e áudio AAC, ajustando o bitrate (CRF 28).
 * Atualiza o status e os dados comprimidos no banco de dados.
 */
export async function startVideoCompressionInBackground(
  fileId: string,
  filename: string,
  buffer: Buffer
): Promise<void> {
  console.log(`[Video Processing] Iniciando otimização do arquivo: ${fileId} (${filename})...`)

  let tempDir = ""
  try {
    // 1. Cria um diretório temporário único
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-proc-"))
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
    const inputPath = path.join(tempDir, `input_${cleanFilename}`)
    const outputPath = path.join(tempDir, `output_${cleanFilename.replace(/\.[^/.]+$/, "")}.mp4`)

    // Escreve o buffer original para o arquivo temporário
    fs.writeFileSync(inputPath, buffer)

    // 2. Busca o caminho do executável FFmpeg
    const ffmpegPath = await getFFmpegPath()
    if (!ffmpegPath) {
      console.warn(`[Video Processing] FFmpeg não encontrado no sistema. Preservando vídeo original para o arquivo: ${fileId}`)
      await db.update(mediaFiles).set({ status: "ready" }).where(eq(mediaFiles.id, fileId))
      return
    }

    console.log(`[Video Processing] FFmpeg localizado em: ${ffmpegPath}. Iniciando compressão...`)

    // 3. Executa o FFmpeg em segundo plano
    // -y: Sobrescreve arquivos de saída existentes
    // -i: Arquivo de entrada
    // -vf: Escalonamento para largura máxima 1280px, mantendo aspecto. '-2' garante que a altura seja par.
    // -vcodec: Codec H.264
    // -crf: 28 (Equilibra compressão alta com ótima qualidade visual)
    // -preset: fast (Equilibra tempo de CPU com tamanho)
    // -acodec: Codec de áudio AAC
    const ffmpegArgs = [
      "-y",
      "-i",
      inputPath,
      "-vf",
      "scale='min(1280,iw)':-2",
      "-vcodec",
      "libx264",
      "-crf",
      "28",
      "-preset",
      "fast",
      "-acodec",
      "aac",
      "-strict",
      "experimental",
      outputPath,
    ]

    const proc = spawn(ffmpegPath, ffmpegArgs)

    proc.stderr.on("data", (data) => {
      // É possível monitorar o progresso decodificando o stderr se necessário
    })

    const exitCode = await new Promise<number>((resolve, reject) => {
      proc.on("close", (code) => {
        resolve(code ?? 0)
      })
      proc.on("error", (err) => {
        reject(err)
      })
    })

    if (exitCode !== 0) {
      throw new Error(`FFmpeg finalizado com código de erro ${exitCode}`)
    }

    // 4. Lê o arquivo comprimido gerado
    if (!fs.existsSync(outputPath)) {
      throw new Error("Arquivo de saída do FFmpeg não encontrado")
    }
    const outputBuffer = fs.readFileSync(outputPath)

    // 5. Atualiza a tabela com o novo buffer otimizado e muda status para 'ready'
    await db
      .update(mediaFiles)
      .set({
        data: outputBuffer,
        mimetype: "video/mp4",
        status: "ready",
      })
      .where(eq(mediaFiles.id, fileId))

    console.log(
      `[Video Processing] Sucesso! Vídeo ${fileId} comprimido de ${buffer.length} para ${outputBuffer.length} bytes (Redução de ${Math.round(
        (1 - outputBuffer.length / buffer.length) * 100
      )}%).`
    )
  } catch (err) {
    console.error(`[Video Processing] Erro ao comprimir o vídeo ${fileId}:`, err)
    // Marca o status como 'failed' para liberar a UI, mas preserva a mídia original para que continue funcionando
    await db
      .update(mediaFiles)
      .set({ status: "failed" })
      .where(eq(mediaFiles.id, fileId))
      .catch((dbErr) => {
        console.error("[Video Processing] Erro ao registrar falha de compressão no banco:", dbErr)
      })
  } finally {
    // 6. Remove diretórios temporários
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true })
      } catch (rmErr) {
        console.warn("[Video Processing] Falha ao excluir diretório temporário:", rmErr)
      }
    }
  }
}
