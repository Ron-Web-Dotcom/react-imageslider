import { useState, useEffect } from "react"
import { Sparkles, Image as ImageIcon, Trash2, LogOut, Loader2, Wand2, Upload, Search } from "lucide-react"
import { blink } from "./lib/blink"
import { ImageSlider } from "./ImageSlider"
import { toast, Toaster } from "sonner"
import { ChatInterface } from "./components/research/ChatInterface"
import { cn } from "./lib/utils"

type Slider = {
  id: string
  name: string
  imagesJson: string
  createdAt: string
}

type ImageData = {
  url: string
  alt: string
}

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [sliders, setSliders] = useState<Slider[]>([])
  const [isLoadingSliders, setIsLoadingSliders] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [activeSliderId, setActiveSliderId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [selectedStyle, setSelectedStyle] = useState("Cinematic")
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null)
  const [editPrompt, setEditPrompt] = useState("")
  const [isEditingImage, setIsEditingImage] = useState(false)
  const [isProcessingEdit, setIsProcessingEdit] = useState(false)

  const styles = [
    { name: "Cinematic", prompt: "Cinematic lighting, 4k, high resolution, minimalist aesthetic" },
    { name: "Vintage", prompt: "Vintage film style, grainy texture, warm tones, 70s aesthetic" },
    { name: "3D Render", prompt: "Octane render, 3D digital art, vibrant colors, futuristic" },
    { name: "Oil Painting", prompt: "Impressionist oil painting, visible brushstrokes, rich textures" },
    { name: "Noir", prompt: "Black and white photography, high contrast, dramatic shadows, moody" }
  ]

  useEffect(() => {
    return blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setIsLoadingAuth(state.isLoading)
      if (state.user) {
        fetchSliders()
      }
    })
  }, [])

  const fetchSliders = async () => {
    setIsLoadingSliders(true)
    try {
      const data = await blink.db.table("sliders").list({
        orderBy: { createdAt: "desc" }
      }) as Slider[]
      setSliders(data)
      if (data.length > 0 && !activeSliderId) {
        setActiveSliderId(data[0].id)
      }
    } catch (error) {
      console.error("Failed to fetch sliders:", error)
    } finally {
      setIsLoadingSliders(false)
    }
  }

  const handleGenerateSlider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt || isGenerating) return
    setIsGenerating(true)
    const toastId = toast.loading("AI is crafting your slider images...")

    try {
      // 1. Generate images using AI
      const currentStyle = styles.find(s => s.name === selectedStyle)?.prompt || styles[0].prompt
      const { data } = await blink.ai.generateImage({
        prompt: `A professional photography series of: ${prompt}. ${currentStyle}.`,
        n: 4,
        model: "fal-ai/nano-banana-pro",
        size: "1024x1024"
      })

      const newImages: ImageData[] = data.map((img, i) => ({
        url: img.url || "",
        alt: `${prompt} - Image ${i + 1}`
      }))

      // 2. Save to DB
      const newSlider = await blink.db.table("sliders").create({
        userId: user.id,
        name: prompt.substring(0, 30) || "AI Generated Slider",
        imagesJson: JSON.stringify(newImages)
      }) as Slider

      setSliders(prev => [newSlider, ...prev])
      setActiveSliderId(newSlider.id)
      setPrompt("")
      toast.success("Slider generated successfully!", { id: toastId })
    } catch (error) {
      console.error("Generation failed:", error)
      toast.error("Failed to generate slider. Please try again.", { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setIsUploading(true)
    const toastId = toast.loading(`Uploading ${files.length} images...`)
    
    try {
      const uploadPromises = Array.from(files).map(file => 
        blink.storage.upload(file, `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`)
      )
      const results = await Promise.all(uploadPromises)
      
      const newImages: ImageData[] = results.map((res: any, i) => ({
        url: res.publicUrl,
        alt: `Uploaded image ${i + 1}`
      }))

      const newSlider = await blink.db.table("sliders").create({
        userId: user.id,
        name: `Gallery ${new Date().toLocaleDateString()}`,
        imagesJson: JSON.stringify(newImages)
      }) as Slider

      setSliders(prev => [newSlider, ...prev])
      setActiveSliderId(newSlider.id)
      toast.success("Slider created from uploads!", { id: toastId })
    } catch (error) {
      console.error("Upload failed:", error)
      toast.error("Failed to upload images.", { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteSlider = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this slider?")) return
    try {
      await blink.db.table("sliders").delete(id)
      setSliders(prev => prev.filter(s => s.id !== id))
      if (activeSliderId === id) {
        setActiveSliderId(null)
      }
      toast.success("Slider deleted")
    } catch (error) {
      toast.error("Failed to delete slider")
    }
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSliderId || !editingName) return
    try {
      await blink.db.table("sliders").update(activeSliderId, {
        name: editingName
      })
      setSliders(prev => prev.map(s => s.id === activeSliderId ? { ...s, name: editingName } : s))
      setIsEditingName(false)
      toast.success("Name updated")
    } catch (error) {
      toast.error("Failed to update name")
    }
  }

  const handleEditImage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingImageIndex === null || !activeSliderId || !editPrompt || isProcessingEdit) return
    
    setIsProcessingEdit(true)
    const toastId = toast.loading("AI is reimagining your image...")
    
    try {
      const activeSlider = sliders.find(s => s.id === activeSliderId)
      if (!activeSlider) return
      
      const currentImages = JSON.parse(activeSlider.imagesJson) as ImageData[]
      const targetImage = currentImages[editingImageIndex]
      
      const { data } = await blink.ai.modifyImage({
        images: [targetImage.url],
        prompt: editPrompt
      })
      
      if (data?.[0]?.url) {
        const newImages = [...currentImages]
        newImages[editingImageIndex] = {
          ...targetImage,
          url: data[0].url
        }
        
        await blink.db.table("sliders").update(activeSliderId, {
          imagesJson: JSON.stringify(newImages)
        })
        
        setSliders(prev => prev.map(s => s.id === activeSliderId ? { ...s, imagesJson: JSON.stringify(newImages) } : s))
        setEditingImageIndex(null)
        setEditPrompt("")
        setIsEditingImage(false)
        toast.success("Image transformed successfully!", { id: toastId })
      }
    } catch (error) {
      console.error("Edit failed:", error)
      toast.error("Failed to edit image. Try a different prompt.", { id: toastId })
    } finally {
      setIsProcessingEdit(false)
    }
  }

  const handleAddImage = async (url: string, alt: string) => {
    if (!activeSliderId) {
      toast.error("Please select a slider first")
      return
    }

    try {
      const activeSlider = sliders.find(s => s.id === activeSliderId)
      if (!activeSlider) return

      const currentImages = JSON.parse(activeSlider.imagesJson) as ImageData[]
      const newImages = [...currentImages, { url, alt }]

      await blink.db.table("sliders").update(activeSliderId, {
        imagesJson: JSON.stringify(newImages)
      })

      setSliders(prev => prev.map(s => s.id === activeSliderId ? { ...s, imagesJson: JSON.stringify(newImages) } : s))
      toast.success("Image added to slider")
    } catch (error) {
      console.error("Failed to add image:", error)
      toast.error("Failed to add image to slider")
    }
  }

  const activeSlider = sliders.find(s => s.id === activeSliderId)
  const activeImages: ImageData[] = activeSlider ? JSON.parse(activeSlider.imagesJson) : []

  if (isLoadingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-2xl space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary font-medium">
              <Sparkles className="w-4 h-4" />
              AI-Powered Image Experience
            </div>
            <h1 className="text-6xl font-bold tracking-tight text-foreground">
              Slick Pic <span className="text-primary">Slider</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Generate stunning, interactive image sliders with AI. Showcase your vision with professional aesthetics and accessible navigation.
            </p>
          </div>
          <button
            onClick={() => blink.auth.login()}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:scale-105 transition-smooth shadow-lg shadow-primary/20"
          >
            Get Started Free
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Toaster position="top-center" richColors />
      
      {/* Dynamic Blurred Background */}
      {activeSlider && activeImages.length > 0 && (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center scale-110 transition-all duration-1000 blur-[80px] opacity-20"
            style={{ backgroundImage: `url(${activeImages[0].url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background/50" />
        </div>
      )}

      {/* AI Search Slide-over */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] transform transition-transform duration-500 ease-in-out p-4",
          isSearchOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <ChatInterface 
          onAddImage={handleAddImage} 
          onClose={() => setIsSearchOpen(false)} 
        />
      </div>

      {/* Backdrop */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsSearchOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className="w-80 h-screen border-r bg-card flex flex-col">
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
              <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 hover-scale transition-smooth cursor-pointer">
                <Upload className="w-5 h-5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleUploadImages}
                  disabled={isUploading}
                />
              </label>
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-brand-search/50 hover:bg-brand-search/5 hover-scale transition-smooth cursor-pointer group"
              >
                <Search className="w-5 h-5 text-brand-search" />
                <span className="text-[10px] font-bold uppercase tracking-wider">AI Search</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleGenerateSlider} className="space-y-3 pt-2 border-t">
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
                {styles.map((style) => (
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
                        ? "bg-primary/5 border-primary"
                        : "hover:bg-muted border-transparent"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{slider.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(slider.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSlider(slider.id, e)}
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
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              {user.display_name?.[0] || user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">
                {user.display_name || "New Explorer"}
              </div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
            <button
              onClick={() => blink.auth.logout()}
              className="p-2 hover:bg-background rounded-lg transition-smooth"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-8 lg:p-12">
        {activeSlider ? (
          <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-4">
                {isEditingName ? (
                  <form onSubmit={handleUpdateName} className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      className="text-3xl font-bold tracking-tight bg-transparent border-b border-primary outline-none w-full"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                    />
                  </form>
                ) : (
                  <h2 
                    className="text-3xl font-bold tracking-tight truncate cursor-pointer hover:text-primary transition-smooth"
                    onClick={() => {
                      setEditingName(activeSlider.name)
                      setIsEditingName(true)
                    }}
                  >
                    {activeSlider.name}
                  </h2>
                )}
                <p className="text-muted-foreground">Preview your interactive AI-generated slider.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                    toast.success("Link copied to clipboard!")
                  }}
                  className="px-4 py-2 border rounded-xl hover:bg-muted transition-smooth flex items-center gap-2"
                >
                  Share
                </button>
              </div>
            </div>

            <div className="aspect-[16/10] w-full">
              <ImageSlider images={activeImages} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {activeImages.map((img, i) => (
                <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border hover-lift">
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover group-hover:scale-110 transition-smooth" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-smooth flex flex-col items-center justify-center gap-2">
                    <span className="text-white text-xs font-bold uppercase tracking-wider">Image {i+1}</span>
                    <a 
                      href={img.url} 
                      download 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-white/20 hover:bg-white/40 rounded-lg text-white text-[10px] font-bold backdrop-blur-sm transition-smooth hover-scale"
                    >
                      Open Original
                    </a>
                    <button
                      onClick={() => {
                        setEditingImageIndex(i)
                        setEditPrompt("")
                        setIsEditingImage(true)
                      }}
                      className="px-3 py-1 bg-primary/20 hover:bg-primary/40 rounded-lg text-white text-[10px] font-bold backdrop-blur-sm transition-smooth hover-scale"
                    >
                      Edit with AI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
              <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold">Select or Create a Slider</h2>
            <p className="text-muted-foreground max-w-sm">
              Use the Magic Generator on the left to create a stunning slider from any theme you can imagine.
            </p>
          </div>
        )}
      </main>

      {/* Image Edit Modal */}
      {isEditingImage && editingImageIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card p-6 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Edit Image</h3>
              <button onClick={() => {
                setIsEditingImage(false)
                setEditingImageIndex(null)
                setEditPrompt("")
              }} className="text-muted-foreground hover:text-foreground transition-smooth">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleEditImage} className="space-y-4">
              <div className="relative">
                <textarea
                  rows={3}
                  placeholder="Describe the changes you want..."
                  className="w-full p-3 rounded-xl border bg-muted focus:ring-2 focus:ring-primary outline-none transition-smooth resize-none"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isProcessingEdit || !editPrompt}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-smooth disabled:opacity-50"
              >
                {isProcessingEdit ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Transform Image
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
