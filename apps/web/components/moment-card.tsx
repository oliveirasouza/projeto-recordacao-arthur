"use client"

import { MomentType } from "@/lib/data-service"
import { Calendar, Play, Loader2, Trophy, Star, Shield } from "lucide-react"

interface MomentCardProps {
  moment: MomentType
  onSelect: (moment: MomentType) => void
}

export function MomentCard({ moment, onSelect }: MomentCardProps) {
  const formattedDate = new Date(moment.date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })

  const isPolaroid = moment.frameId === "polaroid"
  const isGold = moment.frameId === "gold"
  const isSoccer = moment.frameId === "soccer"

  // Gaming-themed HUD frame styles
  let frameWrapperClass = ""
  let titleColorClass = "text-neutral-100"
  let badgeColorClass = "bg-slate-950 text-cyan-400 border-cyan-500/30"

  if (isPolaroid) {
    // Polaroid is now "Skill Challenge" Bronze-bordered frame
    frameWrapperClass = "bg-carbon border-2 border-amber-600/70 shadow-[0_0_15px_rgba(217,119,6,0.25)] p-3 pb-5 rounded-xl hover:shadow-[0_0_25px_rgba(217,119,6,0.45)] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
    titleColorClass = "text-amber-400 font-orbitron uppercase tracking-wider text-xs font-bold"
    badgeColorClass = "bg-slate-950 text-amber-400 border-amber-600/30"
  } else if (isGold) {
    // Legendary / Gold FUT card frame style
    frameWrapperClass = "bg-carbon border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.35)] p-3 rounded-xl hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
    titleColorClass = "text-yellow-400 font-orbitron uppercase tracking-wider text-sm font-bold"
    badgeColorClass = "bg-slate-950 text-yellow-400 border-yellow-500/30"
  } else {
    // Soccer default (Cyber/Cyan LED frame style)
    frameWrapperClass = "bg-carbon border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] p-3 rounded-xl hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
    titleColorClass = "text-cyan-400 font-orbitron uppercase tracking-wider text-sm font-bold"
    badgeColorClass = "bg-slate-950 text-cyan-400 border-cyan-500/30"
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${frameWrapperClass} group overflow-hidden relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2`}
      onClick={() => onSelect(moment)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(moment)
        }
      }}
      aria-label={`Ver detalhes de: ${moment.title}`}
    >
      {/* Decorative soccer balls / stars for soccer frame */}
      {isSoccer && (
        <>
          <div className="absolute top-1 left-2 select-none z-10 flex items-center gap-1">
            <span className="text-[10px] font-bold text-cyan-400/80 font-orbitron tracking-widest uppercase">MATCH</span>
          </div>
          <span className="absolute -bottom-1 -right-1 text-base select-none z-10 filter drop-shadow opacity-75">⚽</span>
          <span className="absolute -top-1 -right-1 text-xs select-none z-10 filter drop-shadow text-cyan-400 animate-pulse">✨</span>
        </>
      )}

      {/* Decorative stars / tags for gold frame */}
      {isGold && (
        <>
          <div className="absolute top-1 left-2 select-none z-10 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-yellow-500 animate-bounce" />
            <span className="text-[9px] font-bold text-yellow-500 font-orbitron tracking-wider uppercase">LEGENDARY</span>
          </div>
          <span className="absolute -bottom-1.5 -left-1.5 text-base select-none z-10 text-yellow-600 opacity-60">⭐</span>
          <span className="absolute -top-1 -right-1 text-xs select-none z-10 text-yellow-400 animate-pulse">✨</span>
        </>
      )}

      {/* Decorative tag for Polaroid (Skill Challenge) */}
      {isPolaroid && (
        <>
          <div className="absolute top-1 left-2 select-none z-10 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="text-[9px] font-bold text-amber-500 font-orbitron tracking-wider uppercase">CHALLENGE</span>
          </div>
          <span className="absolute -top-1 -right-1 text-xs select-none z-10 text-amber-400 animate-pulse">✨</span>
        </>
      )}

      {/* Media container */}
      <div className={`relative w-full overflow-hidden rounded-lg flex items-center justify-center bg-slate-950 border border-slate-900 mt-3.5 ${isPolaroid ? "aspect-square" : "aspect-[4/3]"}`}>
        {moment.type === "video" ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {moment.mediaStatus === "processing" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-neutral-300 gap-2 z-10">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                <span className="text-[9px] uppercase font-extrabold tracking-wider text-amber-400 font-orbitron">Otimizando vídeo...</span>
              </div>
            ) : null}
            <video src={moment.mediaUrl} className="w-full h-full object-contain opacity-90" muted playsInline />
            {moment.mediaStatus !== "processing" && (
              <>
                {moment.duration && (
                  <div className="absolute top-2 right-2 bg-slate-950/85 text-cyan-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/20 z-10 font-mono">
                    {moment.duration}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                  <div className="w-11 h-11 bg-cyan-600/90 hover:bg-cyan-500 text-white rounded-full flex items-center justify-center shadow-neon-cyan transition-transform group-hover:scale-110">
                    <Play className="fill-current w-4 h-4 ml-0.5" />
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <img
            src={moment.mediaUrl}
            alt={moment.title}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
      </div>

      {/* Info details */}
      {isPolaroid ? (
        <div className="mt-3 text-center">
          <p className="font-orbitron font-bold text-sm text-amber-400 tracking-wider line-clamp-1 group-hover:text-amber-300 transition-colors">
            {moment.title}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-neutral-400 font-mono">
            <Calendar className="w-3.5 h-3.5 text-amber-500/80" />
            <span>{formattedDate}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 px-0.5">
          <div className="flex justify-between items-center gap-2">
            <h3 className={`font-bold text-sm line-clamp-1 transition-colors ${titleColorClass}`}>
              {moment.title}
            </h3>
            <span className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold shrink-0 ${badgeColorClass}`}>
              {formattedDate}
            </span>
          </div>
          {moment.caption && (
            <p className="text-[11px] text-neutral-400 mt-1.5 line-clamp-2 italic leading-relaxed">
              &ldquo;{moment.caption}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  )
}
