"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MomentType } from "@/lib/data-service"
import { MomentCard } from "./moment-card"
import { MomentDetailDialog } from "./moment-detail-dialog"
import { UploadForm } from "./upload-form"
import { Star, Heart, Trophy } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { sendContactEmailAction } from "@/app/actions"

interface DashboardContainerProps {
  session: any
  initialMoments: MomentType[]
}

export function DashboardContainer({ session, initialMoments }: DashboardContainerProps) {
  const [momentsList, setMomentsList] = useState<MomentType[]>(initialMoments)
  const [selectedMoment, setSelectedMoment] = useState<MomentType | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("inicio")
  const router = useRouter()

  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactMsg, setContactMsg] = useState("")
  const [contactSent, setContactSent] = useState(false)
  const [isSendingContact, setIsSendingContact] = useState(false)
  const [contactError, setContactError] = useState("")

  // Categorias dinâmicas extraídas dos momentos cadastrados
  const categories = Array.from(
    new Set(
      momentsList
        .filter((m) => m.type === "image" && m.category)
        .map((m) => m.category)
    )
  ).filter((c): c is string => typeof c === "string" && c.trim() !== "").sort()

  const dreamCategories = Array.from(
    new Set(
      momentsList
        .filter((m) => m.type === "image" && m.dreamCategory)
        .map((m) => m.dreamCategory)
    )
  ).filter((c): c is string => typeof c === "string" && c.trim() !== "").sort()

  const [activeCategory, setActiveCategory] = useState<string>("")
  const [activeDreamCategory, setActiveDreamCategory] = useState<string>("")

  // Paginação
  const itemsPerPage = 10
  const [momentsPage, setMomentsPage] = useState(1)
  const [dreamPage, setDreamPage] = useState(1)
  const [videosPage, setVideosPage] = useState(1)

  // Sync state on server validation / props updates
  useEffect(() => {
    setMomentsList(initialMoments)
    if (selectedMoment) {
      const updated = initialMoments.find((m) => m.id === selectedMoment.id)
      if (updated) {
        setSelectedMoment(updated)
      }
    }
  }, [initialMoments, selectedMoment])

  // Sync active categories
  useEffect(() => {
    if (categories.length > 0) {
      if (!activeCategory || !categories.includes(activeCategory)) {
        setActiveCategory(categories[0]!)
      }
    } else {
      setActiveCategory("")
    }
  }, [momentsList])

  useEffect(() => {
    if (dreamCategories.length > 0) {
      if (!activeDreamCategory || !dreamCategories.includes(activeDreamCategory)) {
        setActiveDreamCategory(dreamCategories[0]!)
      }
    } else {
      setActiveDreamCategory("")
    }
  }, [momentsList])

  // Polling automático para atualizar a lista enquanto houver vídeos processando
  useEffect(() => {
    const hasProcessing = momentsList.some((m) => m.mediaStatus === "processing")
    if (!hasProcessing) return

    const interval = setInterval(() => {
      console.log("[Dashboard] Verificando status dos vídeos em processamento...")
      router.refresh()
    }, 4000)

    return () => clearInterval(interval)
  }, [momentsList, router])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setMomentsPage(1)
    setDreamPage(1)
    setVideosPage(1)
  }

  const handleSelectMoment = (moment: MomentType) => {
    setSelectedMoment(moment)
    setIsModalOpen(true)
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactName || !contactEmail || !contactMsg) return
    setIsSendingContact(true)
    setContactError("")
    try {
      const res = await sendContactEmailAction(contactName, contactEmail, contactMsg)
      if (res.success) {
        setContactSent(true)
        setContactName("")
        setContactEmail("")
        setContactMsg("")
        setTimeout(() => {
          setContactSent(false)
        }, 5000)
      } else {
        setContactError(res.error || "Ocorreu um erro ao enviar a mensagem.")
      }
    } catch (err) {
      setContactError("Erro ao conectar com o servidor.")
    } finally {
      setIsSendingContact(false)
    }
  }

  // Filtragem de fotos da Home (limitar a 4 fotos)
  const homePhotos = momentsList.filter((m) => m.type === "image").slice(0, 4)

  // Filtragem de fotos do Momentos
  const filteredMomentsPhotos = momentsList.filter(
    (m) => m.type === "image" && m.category === activeCategory
  )
  const totalMomentsPages = Math.ceil(filteredMomentsPhotos.length / itemsPerPage) || 1
  const paginatedMoments = filteredMomentsPhotos.slice(
    (momentsPage - 1) * itemsPerPage,
    momentsPage * itemsPerPage
  )

  // Filtragem de fotos da Galeria dos Sonhos (apenas com dreamCategory ativa)
  const filteredDreamPhotos = momentsList.filter(
    (m) => m.type === "image" && m.dreamCategory === activeDreamCategory
  )
  const totalDreamPages = Math.ceil(filteredDreamPhotos.length / itemsPerPage) || 1
  const paginatedDream = filteredDreamPhotos.slice(
    (dreamPage - 1) * itemsPerPage,
    dreamPage * itemsPerPage
  )

  // Filtragem de vídeos (sem categorias)
  const allVideos = momentsList.filter((m) => m.type === "video")
  const totalVideosPages = Math.ceil(allVideos.length / itemsPerPage) || 1
  const paginatedVideos = allVideos.slice(
    (videosPage - 1) * itemsPerPage,
    videosPage * itemsPerPage
  )

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden font-sans text-neutral-100 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/stadium_background.png')" }}
    >
      {/* HEADER NAVBAR */}
      <header className="bg-slate-950/80 border-b-2 border-cyan-500/40 backdrop-blur-md text-white py-3 px-6 md:px-12 flex flex-col lg:flex-row items-center justify-between shadow-lg z-10 w-full lg:w-[85%] lg:mx-auto rounded-b-2xl mt-0">
        <div className="flex flex-col items-center lg:items-start mb-3 lg:mb-0">
          <div className="flex items-center gap-1.5 text-2xl font-black tracking-widest font-orbitron text-cyan-400">
            ARTHUR
          </div>
          <span className="text-[9px] font-bold tracking-widest text-emerald-400 mt-0.5 uppercase font-orbitron">
            Guerreiro & Sonhador ⚽
          </span>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex flex-wrap justify-center gap-1.5 md:gap-3 text-xs md:text-sm font-semibold">
          <button
            onClick={() => handleTabChange("inicio")}
            className={`px-4 py-1.5 font-orbitron rounded-lg border transition-all cursor-pointer ${activeTab === "inicio"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              : "bg-slate-950/60 border-slate-900 text-slate-400 hover:text-white"
              }`}
          >
            Início
          </button>
          <button
            onClick={() => handleTabChange("momentos")}
            className={`px-4 py-1.5 font-orbitron rounded-lg border transition-all cursor-pointer ${activeTab === "momentos"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              : "bg-slate-950/60 border-slate-900 text-slate-400 hover:text-white"
              }`}
          >
            Momentos
          </button>
          <button
            onClick={() => handleTabChange("galeria")}
            className={`px-4 py-1.5 font-orbitron rounded-lg border transition-all cursor-pointer ${activeTab === "galeria"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              : "bg-slate-950/60 border-slate-900 text-slate-400 hover:text-white"
              }`}
          >
            Galeria de Sonhos
          </button>
          <button
            onClick={() => handleTabChange("videos")}
            className={`px-4 py-1.5 font-orbitron rounded-lg border transition-all cursor-pointer ${activeTab === "videos"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              : "bg-slate-950/60 border-slate-900 text-slate-400 hover:text-white"
              }`}
          >
            Vídeos
          </button>
          <button
            onClick={() => handleTabChange("contato")}
            className={`px-4 py-1.5 font-orbitron rounded-lg border transition-all cursor-pointer ${activeTab === "contato"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              : "bg-slate-950/60 border-slate-900 text-slate-400 hover:text-white"
              }`}
          >
            Contato
          </button>
        </nav>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow w-full lg:w-[85%] lg:mx-auto bg-slate-950/60 backdrop-blur-md px-6 md:px-12 py-8 z-10 shadow-2xl border-x border-slate-900">

        {/* HERO BANNER SECTION (Only visible on Home 'inicio') */}
        {activeTab === "inicio" && (
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900/90 text-white shadow-xl p-8 md:p-10 mb-10 flex flex-col md:flex-row items-center gap-8 justify-between border border-cyan-500/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-400/5 rounded-full blur-xl pointer-events-none" />

            <div className="flex-1 space-y-4 max-w-lg text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-semibold tracking-wider text-emerald-400 font-orbitron uppercase">
                <Trophy className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                O Futuro Craque
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-neon-green font-orbitron uppercase italic">
                Arthur: O Futuro Craque!
              </h1>
              <h2 className="text-xl md:text-2xl font-bold text-cyan-300 font-orbitron">
                Onde os Sonhos se Tornam Realidade.
              </h2>
              <p className="text-xs md:text-sm text-neutral-300 leading-relaxed font-medium">
                Acompanhe a linda jornada do Craque nos campos e na vida. Cada jogada, cada sorriso, uma recordação eterna.
              </p>
            </div>

            <div className="relative shrink-0 w-56 h-72 rounded-2xl border-2 border-cyan-400 bg-slate-950/90 shadow-[0_0_25px_rgba(6,182,212,0.3)] overflow-hidden p-3 flex flex-col items-center justify-between">
              {/* FIFA Card Style */}
              <div className="absolute top-2 left-3 text-[10px] font-bold text-cyan-400 font-orbitron uppercase">
                OVR 99
              </div>
              <div className="w-full h-[78%] overflow-hidden rounded-xl bg-gradient-to-b from-cyan-950 to-slate-950 border border-slate-800 relative">
                <img
                  src="/hero_arthur.png"
                  alt="Arthur"
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="text-center w-full">
                <div className="text-sm font-black text-neutral-100 font-orbitron uppercase tracking-widest">
                  Arthur
                </div>
                <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
                  Futuro Craque ⚽
                </div>
              </div>
            </div>
          </section>
        )}

        {/* DYNAMIC TAB RENDERING */}
        {activeTab === "contato" ? (
          <div className="max-w-xl mx-auto py-6">
            <div className="bg-slate-900/90 border-2 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)] rounded-2xl overflow-hidden p-6 md:p-8 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="text-center pb-6">
                <span className="text-4xl">📬</span>
                <h2 className="text-2xl font-black text-neutral-100 font-orbitron mt-2 uppercase tracking-wider">Mande uma Mensagem</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Deixe uma mensagem de incentivo para o Arthur ou entre em contato com a família!
                </p>
              </div>

              {contactSent ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-6 rounded-xl text-center space-y-2 animate-in fade-in duration-300 font-orbitron">
                  <span className="text-3xl">🎉</span>
                  <h3 className="font-bold text-base uppercase">Mensagem Enviada!</h3>
                  <p className="text-xs">Obrigado pelo carinho. Sua mensagem foi registrada!</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  {contactError && (
                    <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
                      {contactError}
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="contact-name" className="text-xs font-semibold text-neutral-300">Seu Nome</Label>
                    <Input
                      id="contact-name"
                      placeholder="Ex: Tio Ricardo"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                      disabled={isSendingContact}
                      className="h-9 text-xs rounded-lg border-slate-850 focus-visible:ring-cyan-500 bg-slate-950 text-neutral-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contact-email" className="text-xs font-semibold text-neutral-300">Seu E-mail</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="seuemail@exemplo.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                      disabled={isSendingContact}
                      className="h-9 text-xs rounded-lg border-slate-850 focus-visible:ring-cyan-500 bg-slate-950 text-neutral-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contact-msg" className="text-xs font-semibold text-neutral-300">Mensagem de Apoio</Label>
                    <Textarea
                      id="contact-msg"
                      placeholder="Deixe palavras de força para nosso guerreiro e sonhador..."
                      value={contactMsg}
                      onChange={(e) => setContactMsg(e.target.value)}
                      required
                      disabled={isSendingContact}
                      className="min-h-[100px] text-xs rounded-lg border-slate-850 focus-visible:ring-cyan-500 resize-none bg-slate-950 text-neutral-100"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSendingContact}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-4 rounded-lg shadow-md hover:shadow-lg transition-colors font-orbitron uppercase tracking-wider cursor-pointer"
                  >
                    {isSendingContact ? "Enviando..." : "Enviar Mensagem ⚽"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className={activeTab === "inicio" ? "grid grid-cols-1 lg:grid-cols-3 gap-8" : "w-full"}>

            {/* LEFT AREA: GALLERY & VIDEOS */}
            <div className={activeTab === "inicio" ? "lg:col-span-2 space-y-10" : "w-full space-y-10"}>

              {activeTab === "inicio" && (
                <div>
                  <div className="flex flex-col items-center md:items-start mb-6 pb-2 border-b border-cyan-500/25">
                    <h2 className="text-2xl font-bold text-neutral-100 font-orbitron flex items-center gap-2 uppercase tracking-wide">
                      🏆 Nossa Jornada
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">Recordações e fotos em destaque</p>
                  </div>

                  {homePhotos.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/80 rounded-xl border border-slate-800">
                      <p className="text-neutral-400 text-sm">Nenhuma foto cadastrada ainda.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {homePhotos.map((moment) => (
                          <MomentCard key={moment.id} moment={moment} onSelect={handleSelectMoment} />
                        ))}
                      </div>
                      <div className="flex justify-center mt-8">
                        <Button
                          onClick={() => handleTabChange("momentos")}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 font-orbitron uppercase tracking-wider"
                        >
                          Ver Mais Recordações ⚽
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "momentos" && (
                <div>
                  <div className="flex flex-col items-center md:items-start mb-6 pb-2 border-b border-cyan-500/25">
                    <h2 className="text-2xl font-bold text-neutral-100 font-orbitron flex items-center gap-2 uppercase tracking-wide">
                      ⚽ Todas as Recordações
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">Linha do tempo completa (fotos por categoria)</p>
                  </div>

                  {/* Filtro de categorias horizontais */}
                  {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6 pb-2 border-b border-slate-900 overflow-x-auto scrollbar-thin">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setActiveCategory(cat)
                            setMomentsPage(1)
                          }}
                          className={`px-4 py-1.5 font-orbitron rounded-lg border text-xs tracking-wide transition-all cursor-pointer ${activeCategory === cat
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredMomentsPhotos.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/80 rounded-xl border border-slate-800">
                      <p className="text-neutral-400 text-sm">Nenhuma recordação cadastrada nesta categoria.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedMoments.map((moment) => (
                          <MomentCard key={moment.id} moment={moment} onSelect={handleSelectMoment} />
                        ))}
                      </div>

                      {/* Paginação */}
                      {totalMomentsPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-900 pt-6 mt-8">
                          <p className="text-xs text-neutral-400">
                            Mostrando <span className="font-semibold text-neutral-200">
                              {(momentsPage - 1) * itemsPerPage + 1}
                            </span> a <span className="font-semibold text-neutral-200">
                              {Math.min(momentsPage * itemsPerPage, filteredMomentsPhotos.length)}
                            </span> de <span className="font-semibold text-neutral-200">
                              {filteredMomentsPhotos.length}
                            </span> fotos
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={momentsPage === 1}
                              onClick={() => setMomentsPage(momentsPage - 1)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer text-xs font-orbitron uppercase tracking-widest shadow-neon-green"
                            >
                              Anterior
                            </Button>
                            <div className="flex items-center justify-center bg-amber-950/40 text-amber-300 h-8 px-3 rounded-lg text-xs font-bold border border-amber-500/25 font-orbitron">
                              Página {momentsPage} de {totalMomentsPages}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={momentsPage === totalMomentsPages}
                              onClick={() => setMomentsPage(momentsPage + 1)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer text-xs font-orbitron uppercase tracking-widest shadow-neon-green"
                            >
                              Próxima
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "galeria" && (
                <div>
                  <div className="flex flex-col items-center md:items-start mb-6 pb-2 border-b border-cyan-500/25">
                    <h2 className="text-2xl font-bold text-neutral-100 font-orbitron flex items-center gap-2 uppercase tracking-wide">
                      ⭐ Galeria de Sonhos
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">Fotos com molduras temáticas selecionadas por categoria</p>
                  </div>

                  {/* Filtro de categorias de sonho horizontais */}
                  {dreamCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6 pb-2 border-b border-slate-900 overflow-x-auto scrollbar-thin">
                      {dreamCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setActiveDreamCategory(cat)
                            setDreamPage(1)
                          }}
                          className={`px-4 py-1.5 font-orbitron rounded-lg border text-xs tracking-wide transition-all cursor-pointer ${activeDreamCategory === cat
                            ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredDreamPhotos.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/80 rounded-xl border border-slate-800">
                      <p className="text-neutral-400 text-sm">Nenhuma foto cadastrada nesta categoria da galeria.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedDream.map((moment) => (
                          <MomentCard key={moment.id} moment={moment} onSelect={handleSelectMoment} />
                        ))}
                      </div>

                      {/* Paginação */}
                      {totalDreamPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-900 pt-6 mt-8">
                          <p className="text-xs text-neutral-400">
                            Mostrando <span className="font-semibold text-neutral-200">
                              {(dreamPage - 1) * itemsPerPage + 1}
                            </span> a <span className="font-semibold text-neutral-200">
                              {Math.min(dreamPage * itemsPerPage, filteredDreamPhotos.length)}
                            </span> de <span className="font-semibold text-neutral-200">
                              {filteredDreamPhotos.length}
                            </span> fotos
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={dreamPage === 1}
                              onClick={() => setDreamPage(dreamPage - 1)}

                              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer text-xs font-orbitron uppercase tracking-widest shadow-neon-green"
                            >
                              Anterior
                            </Button>
                            <div className="flex items-center justify-center bg-amber-950/40 text-amber-300 h-8 px-3 rounded-lg text-xs font-bold border border-amber-500/25 font-orbitron">
                              Página {dreamPage} de {totalDreamPages}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={dreamPage === totalDreamPages}
                              onClick={() => setDreamPage(dreamPage + 1)}

                              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer text-xs font-orbitron uppercase tracking-widest shadow-neon-green"
                            >
                              Próxima
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "videos" && (
                <div>
                  <div className="flex flex-col items-center md:items-start mb-6 pb-2 border-b border-cyan-500/25">
                    <h2 className="text-2xl font-bold text-neutral-100 font-orbitron flex items-center gap-2 uppercase tracking-wide">
                      🎥 Vídeos do Arthur
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">Assista aos melhores momentos no futebol</p>
                  </div>

                  {allVideos.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/80 rounded-xl border border-slate-800">
                      <p className="text-neutral-400 text-sm">Nenhum vídeo cadastrado.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedVideos.map((moment) => (
                          <MomentCard key={moment.id} moment={moment} onSelect={handleSelectMoment} />
                        ))}
                      </div>

                      {/* Paginação */}
                      {totalVideosPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-900 pt-6 mt-8">
                          <p className="text-xs text-neutral-400">
                            Mostrando <span className="font-semibold text-neutral-200">
                              {(videosPage - 1) * itemsPerPage + 1}
                            </span> a <span className="font-semibold text-neutral-200">
                              {Math.min(videosPage * itemsPerPage, allVideos.length)}
                            </span> de <span className="font-semibold text-neutral-200">
                              {allVideos.length}
                            </span> vídeos
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={videosPage === 1}
                              onClick={() => setVideosPage(videosPage - 1)}
                              className="h-8 text-xs cursor-pointer rounded-lg border-slate-800 hover:bg-slate-900 text-neutral-300"
                            >
                              Anterior
                            </Button>
                            <div className="flex items-center justify-center bg-cyan-950/40 text-cyan-300 h-8 px-3 rounded-lg text-xs font-bold border border-cyan-500/25 font-orbitron">
                              Página {videosPage} de {totalVideosPages}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={videosPage === totalVideosPages}
                              onClick={() => setVideosPage(videosPage + 1)}
                              className="h-8 text-xs cursor-pointer rounded-lg border-slate-800 hover:bg-slate-900 text-neutral-300"
                            >
                              Próxima
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>

            {/* RIGHT AREA: UPLOAD PANEL CONTAINER */}
            {activeTab === "inicio" && (
              <div className="lg:col-span-1">
                <div className="sticky top-6">
                  <UploadForm
                    session={session}
                    initialMoments={momentsList}
                    onUploadSuccess={(category) => {
                      if (category === "Momentos") {
                        handleTabChange("momentos")
                      } else if (category === "Galeria de Sonhos") {
                        handleTabChange("galeria")
                      } else if (category === "Vídeos") {
                        handleTabChange("videos")
                      }
                    }}
                  />
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950/80 border-t-2 border-cyan-500/40 backdrop-blur-md text-white py-6 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between shadow-lg z-10 mt-10 w-full lg:w-[85%] lg:mx-auto rounded-t-2xl">
        <div className="text-center md:text-left text-xs mb-4 md:mb-0">
          <p className="font-semibold text-neutral-200">
            2026 Arthur: Guerreiro & Sonhador | Recordações com Amor
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            Feito com carinho para registrar uma infância brilhante.
          </p>
        </div>

        {/* SOCIAL LINKS */}
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-white transition-colors" title="Facebook">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>
          <a href="#" className="hover:text-white transition-colors" title="Instagram">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
          <a href="#" className="hover:text-white transition-colors" title="Youtube">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
            </svg>
          </a>
          <a href="#" className="text-lg hover:text-white transition-colors select-none font-bold" title="TikTok">
            🎵
          </a>
        </div>
      </footer>

      {/* DETAIL MODAL LIGHTBOX */}
      <MomentDetailDialog
        moment={selectedMoment}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        session={session}
        onDeleteSuccess={(id) => {
          setMomentsList((prev) => prev.filter((m) => m.id !== id))
          setSelectedMoment(null)
        }}
        onEditSuccess={(updated) => {
          setMomentsList((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)))
          setSelectedMoment(null)
        }}
        existingCategories={categories}
        existingDreamCategories={dreamCategories}
      />
    </div>
  )
}
