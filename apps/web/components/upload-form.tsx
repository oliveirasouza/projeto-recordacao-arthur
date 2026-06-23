"use client"

import { useActionState, useState, startTransition, useEffect } from "react"
import { uploadMomentAction } from "@/app/actions"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card"
import { LogIn, LogOut, Upload, Loader2, Sparkles, Eye, EyeOff } from "lucide-react"
import { signIn, signOut } from "next-auth/react"
import { compressImageClientSide } from "@/lib/image-optimizer"

import { MomentType } from "@/lib/data-service"

interface UploadFormProps {
  session: any
  initialMoments: MomentType[]
  onUploadSuccess?: (category: string) => void
}

export function UploadForm({ session, initialMoments, onUploadSuccess }: UploadFormProps) {
  const [fileName, setFileName] = useState<string>("")
  const [state, formAction, isPending] = useActionState(uploadMomentAction, null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null)
  const [localError, setLocalError] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("Momentos")

  useEffect(() => {
    if (state?.success) {
      setFileName("")
      setMediaType(null)
      const prevCategory = selectedCategory
      setSelectedCategory("Momentos")
      setLocalError("")
      const form = document.getElementById("add-moment-form") as HTMLFormElement | null
      form?.reset()
      onUploadSuccess?.(prevCategory)
    }
  }, [state])

  const handleLocalSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError("")
    setIsLoggingIn(true)
    try {
      const res = await signIn("credentials", {
        password,
        redirect: false,
      })
      if (res?.error) {
        setAuthError("Senha incorreta! Tente novamente.")
      } else {
        window.location.reload()
      }
    } catch (err) {
      setAuthError("Erro na autenticação local.")
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLocalError("")
    setIsCompressing(true)
    try {
      const formData = new FormData(e.currentTarget)
      const file = formData.get("file") as File | null

      if (file && file.size > 60 * 1024 * 1024) {
        setLocalError("O arquivo selecionado é muito grande. O limite máximo é de 60MB.")
        setIsCompressing(false)
        return
      }

      const isVideoFile = file && (file.type.startsWith("video/") || /\.(mp4|webm|ogg|mov|mkv|avi|flv|wmv|3gp)$/i.test(file.name))

      if (selectedCategory === "Vídeos") {
        if (!file || file.size === 0) {
          setLocalError("Por favor, selecione um arquivo de vídeo.")
          setIsCompressing(false)
          return
        }
        if (!isVideoFile) {
          setLocalError("Por favor, selecione um arquivo de vídeo para a categoria Vídeos.")
          setIsCompressing(false)
          return
        }
      } else {
        if (!file || file.size === 0) {
          setLocalError("Por favor, selecione uma imagem.")
          setIsCompressing(false)
          return
        }
        if (isVideoFile) {
          setLocalError(`Por favor, selecione uma imagem para a categoria ${selectedCategory}.`)
          setIsCompressing(false)
          return
        }
      }

      if (file && file.size > 0 && file.type.startsWith("image/")) {
        const compressedBlob = await compressImageClientSide(file)
        const newFilename = file.name.replace(/\.[^/.]+$/, "") + ".webp"
        formData.set("file", compressedBlob, newFilename)
      }

      startTransition(() => {
        formAction(formData)
      })
    } catch (err) {
      console.error("Erro na compressão client-side:", err)
      const formData = new FormData(e.currentTarget)
      startTransition(() => {
        formAction(formData)
      })
    } finally {
      setIsCompressing(false)
    }
  }

  if (!session) {
    return (
      <Card className="bg-carbon border-hud-cyan relative overflow-hidden text-neutral-100 rounded-xl border-2 py-4">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
        <svg className="w-full h-8 text-cyan-500/15 absolute top-0 left-0 pointer-events-none" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path d="M0,10 Q25,20 50,10 T100,10" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M0,12 Q25,5 50,12 T100,12" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
        </svg>

        <CardHeader className="text-center pb-4 relative z-10">
          <div className="mx-auto w-12 h-12 bg-cyan-950/40 rounded-full flex items-center justify-center mb-2 border border-cyan-500/30">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <CardTitle className="text-lg font-bold text-neutral-100 font-orbitron uppercase tracking-wider text-neon-cyan">Adicionar Recordação</CardTitle>
          <CardDescription className="text-xs text-neutral-400">
            Apenas administradores podem adicionar recordações. Digite a senha de acesso local.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-6 relative z-10">
          <form onSubmit={handleLocalSignIn} className="space-y-4">
            {authError && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-center animate-shake">
                {authError}
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="access-password" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wider">Senha de Acesso</Label>
              <div className="relative">
                <Input
                  id="access-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ex: arthur123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9 text-xs rounded-lg border-slate-800 focus-visible:ring-cyan-500 bg-slate-950 text-neutral-100 pr-10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 gap-2 shadow-neon-cyan transition-all rounded-lg cursor-pointer text-xs font-orbitron uppercase tracking-widest"
            >
              <LogIn className="w-4 h-4" />
              {isLoggingIn ? "Autenticando..." : "Entrar no Painel"}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-carbon border-hud-green relative overflow-hidden text-neutral-100 rounded-xl border-2 py-4">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
      <svg className="w-full h-8 text-emerald-500/15 absolute top-0 left-0 pointer-events-none" viewBox="0 0 100 20" preserveAspectRatio="none">
        <path d="M0,10 Q25,20 50,10 T100,10" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M0,12 Q25,5 50,12 T100,12" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
      </svg>

      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 relative z-10">
        <div>
          <CardTitle className="text-base font-bold text-neutral-100 font-orbitron uppercase tracking-wider text-neon-green">
            Olá, {session.user?.name?.split(" ")[0]}!
          </CardTitle>
          <CardDescription className="text-[11px] text-neutral-400">Adicione novas recordações do Arthur.</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          className="text-neutral-400 hover:text-red-400 transition-colors cursor-pointer rounded-full"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="relative z-10">
        <form id="add-moment-form" onSubmit={handleSubmit} className="space-y-4">
          {(localError || state?.error) && (
            localError ? (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
                {localError}
              </div>
            ) : state?.error?.startsWith("<div") ? (
              <div dangerouslySetInnerHTML={{ __html: state.error }} />
            ) : (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
                {state?.error}
              </div>
            )
          )}
          {state?.success && !localError && (
            <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg">
              Recordação adicionada com sucesso!
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="title" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Título do Momento</Label>
            <Input
              id="title"
              name="title"
              placeholder="Ex: Golaço na Final!"
              required
              className="h-9 text-xs rounded-lg border-slate-800 focus-visible:ring-emerald-500 bg-slate-950 text-neutral-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="date" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Data</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
                className="h-9 text-xs rounded-lg border-slate-800 focus-visible:ring-emerald-500 bg-slate-950 text-neutral-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="frameId" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Estilo de Moldura</Label>
              <select
                id="frameId"
                name="frameId"
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
            <Label htmlFor="category" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Categoria</Label>
            <select
              id="category"
              name="category"
              value={selectedCategory}
              onChange={(e) => {
                const newCategoryValue = e.target.value
                setSelectedCategory(newCategoryValue)
                setLocalError("")
                
                // Clear file input if it is incompatible with new target category type
                const fileInput = document.getElementById("add-moment-file-input") as HTMLInputElement | null
                const file = fileInput?.files?.[0]
                if (file) {
                  const isVideoFile = file.type.startsWith("video/") || /\.(mp4|webm|ogg|mov|mkv|avi|flv|wmv|3gp)$/i.test(file.name)
                  if (newCategoryValue === "Vídeos" && !isVideoFile) {
                    setLocalError("O arquivo selecionado anteriormente não é um vídeo. Por favor, selecione um vídeo.")
                    setFileName("")
                    if (fileInput) fileInput.value = ""
                  } else if (newCategoryValue !== "Vídeos" && isVideoFile) {
                    setLocalError("O arquivo selecionado anteriormente não é uma imagem. Por favor, selecione uma imagem.")
                    setFileName("")
                    if (fileInput) fileInput.value = ""
                  }
                }
              }}
              className="w-full h-9 px-3 text-xs border border-slate-800 rounded-lg outline-none bg-slate-950 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-neutral-200 font-orbitron uppercase tracking-wide"
              required
            >
              <option value="Momentos">Momentos</option>
              <option value="Galeria de Sonhos">Galeria de Sonhos</option>
              <option value="Vídeos">Vídeos</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="caption" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Mensagem Motivacional</Label>
            <Textarea
              id="caption"
              name="caption"
              placeholder="Ex: Onde os sonhos se tornam realidade!"
              className="min-h-[60px] text-xs rounded-lg border-slate-800 focus-visible:ring-emerald-500 resize-none bg-slate-950 text-neutral-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {selectedCategory === "Vídeos" && (
            <div className="space-y-1 p-3 bg-slate-950 border border-slate-900 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
              <Label htmlFor="duration" className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">
                Duração do Vídeo
              </Label>
              <Input
                id="duration"
                name="duration"
                placeholder="Ex: 0:45 ou 1:20"
                className="h-9 text-xs rounded-lg border-slate-800 focus-visible:ring-emerald-500 bg-slate-950 text-neutral-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-neutral-300 font-orbitron uppercase tracking-wide">Foto ou Vídeo</Label>
            <div className="border-2 border-dashed border-slate-800 rounded-lg p-4 bg-slate-950/60 hover:bg-slate-900/60 hover:border-emerald-500/50 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2">
              <Upload className="w-7 h-7 text-emerald-400 mb-1" />
              <p className="text-[10px] text-neutral-200 font-medium font-orbitron uppercase tracking-wide">
                {fileName ? fileName : "Selecionar Arquivo"}
              </p>
              <p className="text-[8px] text-neutral-400 mt-0.5 font-medium">
                {selectedCategory === "Vídeos" ? "Formatos de vídeo (Máx. 60MB)" : "Formatos de imagem (Máx. 60MB)"}
              </p>
              <input
                id="add-moment-file-input"
                type="file"
                name="file"
                accept={selectedCategory === "Vídeos" ? "video/*" : "image/*"}
                required
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 60 * 1024 * 1024) {
                      setLocalError("O arquivo selecionado é muito grande. O limite máximo é de 60MB.")
                      setFileName("")
                      return
                    }

                    const isVideoFile = file.type.startsWith("video/") || /\.(mp4|webm|ogg|mov|mkv|avi|flv|wmv|3gp)$/i.test(file.name)
                    if (selectedCategory === "Vídeos" && !isVideoFile) {
                      setLocalError("Para a categoria Vídeos, por favor selecione um arquivo de vídeo.")
                      setFileName("")
                      e.target.value = ""
                      return
                    }
                    if (selectedCategory !== "Vídeos" && isVideoFile) {
                      setLocalError(`Para a categoria ${selectedCategory}, por favor selecione uma imagem.`);
                      setFileName("")
                      e.target.value = ""
                      return
                    }

                    setLocalError("")
                    setFileName(file.name)
                    if (isVideoFile) {
                      setMediaType("video")
                    } else {
                      setMediaType("image")
                    }
                  } else {
                    setFileName("")
                    setMediaType(null)
                    setLocalError("")
                  }
                }}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending || isCompressing}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-lg shadow-neon-green gap-2 cursor-pointer transition-all font-orbitron uppercase tracking-widest"
          >
            {isCompressing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                OTIMIZANDO IMAGEM...
              </>
            ) : isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                CARREGANDO ARQUIVO...
              </>
            ) : (
              "Level Up ⚽"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
