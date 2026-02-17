import { ImageIcon, Upload, Sparkles, Wand2, Loader2, Trash2, LogOut } from "lucide-react"
import { Slider } from "../../hooks/useSliders"
import { blink } from "../../lib/blink"
import { useState } from "react"
import { SLIDER_STYLES } from "../../lib/constants"

type SidebarProps = {
  sliders: Slider[]
  isLoadingSliders: boolean
  activeSliderId: string | null
  setActiveSliderId: (id: string | null) => void
  onGenerate: (prompt: string, style: string) => Promise<boolean>
  onUpload: (files: FileList) => void
  onDeleteSlider: (id: string) => void
  user: any
  isGenerating: boolean
  isUploading: boolean
}

/**
 * Sidebar Component
 * Manages the user's collection of sliders and provides creation tools (AI generation and uploads).
 * 
 * @param {SidebarProps} props - Sidebar properties
 * @returns {JSX.Element} The rendered sidebar
 */
export function Sidebar({
  sliders,
  isLoadingSliders,
  activeSliderId,
  setActiveSliderId,
  onGenerate,
  onUpload,
  onDeleteSlider,
  user,
  isGenerating,
  isUploading
}: SidebarProps) {
  const [prompt, setPrompt] = useState("")
  const [selectedStyle, setSelectedStyle] = useState("Cinematic")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await onGenerate(prompt, selectedStyle)
    if (success) setPrompt("")
  }

  return (
    <aside className="w-80 h-screen border-r bg-card flex flex-col fixed lg:static inset-y-0 z-40 -translate-x-full lg:translate-x-0 transition-transform duration-300">
      <div className="h-20 flex items-center px-6 border-b">
        <span className="text-xl font-bold tracking-tight flex items-center gap-2">
          <ImageIcon className="text-primary" />
          Slick Pic
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Create New
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-smooth cursor-pointer">
              <Upload className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => e.target.files && onUpload(e.target.files)}
                disabled={isUploading}
              />
            </label>
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 opacity-50">
              <Sparkles className="w-5 h-5 text-primary/50" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">AI Assist <br/> Ready</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Magic Generator
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Type a theme... (e.g. Cyberpunk City)"
              className="w-full pl-10 pr-4 py-3 rounded-xl border bg-muted focus:ring-2 focus:ring-primary outline-none transition-smooth"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Artistic Style
            </label>
            <div className="flex flex-wrap gap-2">
              {SLIDER_STYLES.map((style) => (
                <button
                  key={style.name}
                  type="button"
                  onClick={() => setSelectedStyle(style.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-smooth ${
                    selectedStyle === style.name
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating || !prompt}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-smooth disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Slider
              </>
            )}
          </button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your Sliders
            </label>
            <span className="text-xs text-muted-foreground">{sliders.length} items</span>
          </div>
          <div className="space-y-2">
            {isLoadingSliders ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : sliders.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground bg-muted rounded-xl border border-dashed">
                No sliders yet. Generate one above!
              </div>
            ) : (
              sliders.map((slider) => (
                <button
                  key={slider.id}
                  onClick={() => setActiveSliderId(slider.id)}
                  className={`w-full group p-3 rounded-xl border text-left flex items-center gap-3 transition-smooth ${
                    activeSliderId === slider.id
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "hover:bg-muted border-transparent"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-smooth ${
                    activeSliderId === slider.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}>
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{slider.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-tight">
                      {new Date(slider.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSlider(slider.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:text-destructive transition-smooth"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t mt-auto">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
            {user.display_name?.[0] || user.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate">
              {user.display_name || "New Explorer"}
            </div>
            <div className="text-[10px] text-muted-foreground truncate opacity-70">{user.email}</div>
          </div>
          <button
            onClick={() => blink.auth.logout()}
            className="p-2 hover:bg-background rounded-lg transition-smooth text-muted-foreground hover:text-foreground"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
