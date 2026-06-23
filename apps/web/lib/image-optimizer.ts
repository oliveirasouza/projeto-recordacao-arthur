/**
 * Otimiza uma imagem no lado do cliente usando HTML5 Canvas.
 * Redimensiona a imagem se ela for maior que as dimensões máximas (1920x1080)
 * mantendo a proporção, remove os metadados e converte para WebP (qualidade 0.8).
 */
export function compressImageClientSide(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Apenas processa se for realmente uma imagem
    if (!file.type.startsWith("image/")) {
      return resolve(file)
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        const MAX_WIDTH = 1920
        const MAX_HEIGHT = 1080

        // Redimensionamento proporcional se a imagem for excessivamente grande
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const widthRatio = MAX_WIDTH / width
          const heightRatio = MAX_HEIGHT / height
          const bestRatio = Math.min(widthRatio, heightRatio)

          width = Math.round(width * bestRatio)
          height = Math.round(height * bestRatio)
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          return reject(new Error("Não foi possível obter o contexto 2D do Canvas"))
        }

        // Desenha a imagem no canvas (isso remove metadados EXIF/GPS implicitamente)
        ctx.drawImage(img, 0, 0, width, height)

        // Converte para WebP com qualidade 0.8
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              // Se falhar a conversão para WebP, tenta JPEG como fallback
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) {
                    resolve(jpegBlob)
                  } else {
                    reject(new Error("Erro ao converter a imagem para blob"))
                  }
                },
                "image/jpeg",
                0.8
              )
            }
          },
          "image/webp",
          0.8
        )
      }
      img.onerror = (err) => reject(err)
      img.src = event.target?.result as string
    }
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}
