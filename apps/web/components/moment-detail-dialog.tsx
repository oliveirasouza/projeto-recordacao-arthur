"use client"

import { useActionState, useEffect, useState, startTransition } from "react"
import { MomentType } from "@/lib/data-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { Calendar, Trash2, Edit3, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { editMomentAction, deleteMomentAction } from "@/app/actions"
import { compressImageClientSide } from "@/lib/image-optimizer"

interface MomentDetailDialogProps {
  moment: MomentType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  session: any
  onDeleteSuccess?: (id: number) => void
  onEditSuccess?: (moment: MomentType) => void
  existingCategories?: string[]
  existingDreamCategories?: string[]
}

export function MomentDetailDialog({
  moment,
  open,
  onOpenChange,
  session,
  onDeleteSuccess,
  onEditSuccess,
  existingCategories = [],
  existingDreamCategories = [],
}: MomentDetailDialogProps) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view")
  const [fileName, setFileName] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)

  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video">("image")

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCompressing(true)
    try {
      const formData = new FormData(e.currentTarget)
      const file = formData.get("file") as File | null

      if (file && file.size > 0 && file.type.startsWith("image/")) {
        const compressedBlob = await compressImageClientSide(file)
        const newFilename = file.name.replace(/\.[^/.]+$/, "") + ".webp"
        formData.set("file", compressedBlob, newFilename)
      }

      startTransition(() => {
        formAction(formData)
      })
    } catch (err) {
      console.error("Erro na compressão client-side (edit):", err)
      const formData = new FormData(e.currentTarget)
      startTransition(() => {
        formAction(formData)
      })
    } finally {
      setIsCompressing(false)
    }
  }

  // React 19 action state for Editing
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    setErrorMsg("")
    const res = await editMomentAction(prevState, formData)
    if (res.success && moment) {
      const category = formData.get("category") as string | null
      const duration = formData.get("duration") as string | null

      let finalCategory: string | null = null
      let finalDreamCategory: string | null = null
      let finalDuration: string | null = null

      if (category === "Momentos") {
        finalCategory = "Momentos"
      } else if (category === "Galeria de Sonhos") {
        finalDreamCategory = "Galeria de Sonhos"
      } else if (category === "Vídeos") {
        finalDuration = duration
      }

      const updated: MomentType = {
        id: moment.id,
        title: formData.get("title") as string,
        date: new Date(formData.get("date") as string),
        caption: formData.get("caption") as string,
        frameId: formData.get("frameId") as string,
        type: category === "Vídeos" ? "video" : "image",
        mediaUrl: moment.mediaUrl, // fallback
        category: finalCategory,
        dreamCategory: finalDreamCategory,
        duration: finalDuration,
      }
      onEditSuccess?.(updated)
      setMode("view")
      onOpenChange(false)
    } else if (res.error) {
      setErrorMsg(res.error)
    }
    return res
  }, null)

  // Reset when dialog state changes
  useEffect(() => {
    if (open) {
      setMode("view")
      setErrorMsg("")
      setFileName("")
      if (moment) {
        setSelectedMediaType(moment.type as "image" | "video")
        if (moment.type === "video") {
          setSelectedCategory("Vídeos")
        } else if (moment.dreamCategory) {
          setSelectedCategory("Galeria de Sonhos")
        } else {
          setSelectedCategory("Momentos")
        }
      }
    }
  }, [open, moment])

  if (!moment) return null

  const formattedDate = new Date(moment.date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const handleDelete = async () => {
    setIsDeleting(true)
    setErrorMsg("")
    try {
      const res = await deleteMomentAction(moment.id)
      if (res.success) {
        onDeleteSuccess?.(moment.id)
        onOpenChange(false)
      } else {
        setErrorMsg(res.error || "Erro ao excluir o momento.")
      }
    } catch (e) {
      setErrorMsg("Ocorreu um erro ao excluir.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] overflow-y-auto bg-slate-950/95 border-2 border-cyan-500/40 text-neutral-100 shadow-2xl p-6 relative left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 fixed">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
        {/* VIEW MODE */}
        {mode === "view" && (
          <>
            <DialogHeader className="mb-3">
              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between items-start gap-4 mt-1">
                <DialogTitle className="text-2xl font-bold text-neutral-100 font-orbitron uppercase tracking-wider">
                  {moment.title}
                </DialogTitle>

                {/* Admin controls */}
                {session && (
                  <div className="flex items-center gap-2 mr-6 shrink-0 z-20">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMode("edit")}
                      className="text-xs gap-1 hover:text-cyan-300 border-slate-800 hover:border-cyan-500 bg-slate-900 rounded-lg cursor-pointer font-orbitron"
                    >
                      <Edit3 className="w-3 h-3" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setMode("confirm-delete")}
                      className="text-xs gap-1 rounded-lg cursor-pointer bg-red-650 hover:bg-red-550 text-white font-orbitron"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remover
                    </Button>
                  </div>
                )}
              </div>
            </DialogHeader>

            {moment.type === "video" && moment.mediaStatus === "processing" && (
              <div className="mb-3.5 p-3.5 bg-amber-950/40 border border-amber-600/30 text-neutral-300 rounded-xl flex items-start gap-3 text-xs leading-relaxed animate-pulse">
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-400 font-orbitron uppercase tracking-wide">Otimizando Vídeo em Segundo Plano...</p>
                  <p className="text-neutral-400 mt-0.5">
                    Este vídeo está sendo processado para redução de tamanho e carregamento instantâneo.
                    Você já pode assisti-lo em qualidade original; a versão comprimida ficará pronta em instantes.
                  </p>
                </div>
              </div>
            )}
            <div className="relative w-full overflow-hidden rounded-xl bg-slate-900/40 flex items-center justify-center border border-slate-850">
              {moment.type === "video" ? (
                <video
                  src={moment.mediaUrl}
                  controls
                  autoPlay
                  className="max-h-[50vh] max-w-full w-full object-contain"
                />
              ) : (
                <img
                  src={moment.mediaUrl}
                  alt={moment.title}
                  className="max-h-[50vh] max-w-full w-full object-contain"
                />
              )}
            </div>

            {moment.type === "image" && moment.category && (
              <div className="mt-4 flex flex-wrap gap-2 z-10 relative font-orbitron">
                <span className="text-[10px] bg-slate-950 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  📂 Categoria: {moment.category}
                </span>
                {moment.dreamCategory && (
                  <span className="text-[10px] bg-slate-950 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                    ✨ Galeria: {moment.dreamCategory}
                  </span>
                )}
              </div>
            )}

            {moment.type === "video" && moment.duration && (
              <div className="mt-4 z-10 relative font-orbitron">
                <span className="text-[10px] bg-slate-950 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  ⏱️ Duração: {moment.duration}
                </span>
              </div>
            )}

            {moment.caption && (
              <div className="mt-6 p-4 rounded-xl bg-slate-950/60 border border-slate-900 relative">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-16 h-16 bg-cyan-500/5 rounded-full blur-md" />
                <span className="absolute -top-3 left-4 bg-cyan-600 text-white text-[10px] px-3 py-0.5 rounded-full font-orbitron font-extrabold uppercase tracking-wider shadow-sm select-none">
                  Mensagem Motivacional
                </span>
                <p className="text-neutral-200 italic text-sm md:text-base pt-1 leading-relaxed">
                  &ldquo;{moment.caption}&rdquo;
                </p>
              </div>
            )}
          </>
        )}

        {mode === "edit" && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <DialogHeader className="pb-4 border-b border-cyan-500/20">
              <DialogTitle className="text-xl font-bold text-cyan-400 font-orbitron uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                Editar Recordação
              </DialogTitle>
            </DialogHeader>

            {errorMsg && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 animate-bounce" />
                {errorMsg}
              </div>
            )}

            {/* Hidden field for ID */}
            <input type="hidden" name="id" value={moment.id} />

            <div className="space-y-1">
              <Label htmlFor="edit-title" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Título do Momento</Label>
              <Input
                id="edit-title"
                name="title"
                defaultValue={moment.title}
                required
                className="h-9 text-xs rounded-lg border-slate-800 focus-visible:ring-emerald-500 bg-slate-950 text-neutral-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-date" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Data</Label>
                <Input
                  id="edit-date"
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date(moment.date).toISOString().split("T")[0]}
                  className="h-9 text-xs rounded-lg border-slate-800 focus-visible:ring-emerald-500 bg-slate-950 text-neutral-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-frameId" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Estilo de Moldura</Label>
                <select
                  id="edit-frameId"
                  name="frameId"
                  defaultValue={moment.frameId || "soccer"}
                  className="w-full h-9 px-3 text-xs border border-slate-800 rounded-lg outline-none bg-slate-950 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-neutral-200 font-orbitron uppercase tracking-wide"
                  required
                >
                  <option value="soccer">Estrelas do Futebol ⚽</option>
                  <option value="gold">Borda Dourada ✨</option>
                  <option value="polaroid">Polaroid Clássica 📸</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-caption" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Mensagem Motivacional</Label>
              <Textarea
                id="edit-caption"
                name="caption"
                defaultValue={moment.caption || ""}
                placeholder="Ex: A persistência transforma sonhos em realidade!"
                className="min-h-[60px] text-xs rounded-lg border-slate-800 focus-visible:ring-emerald-500 resize-none bg-slate-950 text-neutral-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-category" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Categoria</Label>
              <select
                id="edit-category"
                name="category"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                }}
                className="w-full h-9 px-3 text-xs border border-slate-800 rounded-lg outline-none bg-slate-950 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-neutral-200 font-orbitron uppercase tracking-wide"
                required
              >
                <option value="Momentos">Momentos</option>
                <option value="Galeria de Sonhos">Galeria de Sonhos</option>
                <option value="Vídeos">Vídeos</option>
              </select>
            </div>

            {selectedCategory === "Vídeos" && (
              <div className="space-y-1 p-3 bg-slate-950 border border-slate-900 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="edit-duration" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">
                  Duração do Vídeo
                </Label>
                <Input
                  id="edit-duration"
                  name="duration"
                  defaultValue={moment.duration || ""}
                  placeholder="Ex: 0:45 ou 1:20"
                  className="h-9 text-xs rounded-lg border-slate-800 focus-visible:ring-emerald-500 bg-slate-950 text-neutral-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Substituir Foto ou Vídeo (Opcional)</Label>
              <div className="border-2 border-dashed border-cyan-500/30 rounded-xl p-6 text-center hover:border-cyan-400 hover:bg-cyan-500/5 cursor-pointer relative">
                <span className="text-neutral-300 text-[10px] font-medium font-orbitron uppercase tracking-wide">
                  {fileName ? fileName : "Selecione um arquivo para substituir"}
                </span>
                <input
                  type="file"
                  name="file"
                  accept="image/*,video/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setFileName(file.name)
                      if (file.type.startsWith("video/") || /\.(mp4|webm|ogg|mov|mkv|avi|flv|wmv|3gp)$/i.test(file.name)) {
                        setSelectedMediaType("video")
                      } else {
                        setSelectedMediaType("image")
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode("view")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer text-xs font-orbitron uppercase tracking-widest shadow-neon-green"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || isCompressing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer text-xs font-orbitron uppercase tracking-widest shadow-neon-green"
              >
                {isCompressing ? "Otimizando..." : isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        )}

        {/* CONFIRM DELETE MODE */}
        {mode === "confirm-delete" && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-500 font-orbitron uppercase tracking-wider flex items-center gap-1.5">
                <Trash2 className="w-5 h-5 text-red-500" />
                Excluir Recordação?
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 bg-red-950/40 border border-red-500/20 text-red-300 rounded-xl text-xs space-y-2">
              <p className="font-bold font-orbitron tracking-wide">ESTA AÇÃO É DEFINITIVA!</p>
              <p>Você excluirá permanentemente a recordação &ldquo;{moment.title}&rdquo; do banco de dados e do servidor.</p>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode("view")}
                disabled={isDeleting}
                className="rounded-lg cursor-pointer text-xs border-slate-800 hover:bg-slate-900 text-neutral-300 font-orbitron"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg cursor-pointer text-xs bg-red-650 hover:bg-red-550 text-white font-orbitron uppercase tracking-wider"
              >
                {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
