import { useState, useEffect } from "react"
import { Sparkles, Image as ImageIcon, Trash2, LogOut, Loader2, Wand2, Upload } from "lucide-react"
import { blink } from "./lib/blink"
import { ImageSlider } from "./ImageSlider"
import { toast, Toaster } from "sonner"

type Slider = {
  id: string
  name: string
  imagesJson: string
  transitionType: 'slide' | 'fade'
  createdAt: string
  userId: string
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
  const [viewMode, setViewMode] = useState<'admin' | 'public'>('admin')

  useEffect(() => {
    // Check for public slider ID in URL
    const path = window.location.pathname
    const match = path.match(/\/slider\/([^\/]+)/)
    if (match) {
      const publicId = match[1]
      fetchPublicSlider(publicId)
      setViewMode('public')
    }

    return blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setIsLoadingAuth(state.isLoading)
      if (state.user && !match) {
        fetchSliders()
      }
    })
  }, [])

  const fetchPublicSlider = async (id: string) => {
    setIsLoadingSliders(true)
    try {
      const data = await blink.db.table("sliders").get(id) as Slider
      if (data) {
        setSliders([data])
        setActiveSliderId(data.id)
      }
    } catch (error) {
      console.error("Failed to fetch public slider:", error)
      toast.error("Slider not found or private")
    } finally {
      setIsLoadingSliders(false)
    }
  }

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

  const handleDeleteImage = async (index: number) => {
    if (!activeSlider || !activeSliderId) return
    if (activeImages.length <= 1) {
      toast.error("A slider must have at least one image.")
      return
    }

    try {
      const updatedImages = activeImages.filter((_, i) => i !== index)
      await blink.db.table("sliders").update(activeSliderId, {
        imagesJson: JSON.stringify(updatedImages)
      })
      setSliders(prev => prev.map(s => s.id === activeSliderId ? { ...s, imagesJson: JSON.stringify(updatedImages) } : s))
      toast.success("Image removed from slider")
    } catch (error) {
      toast.error("Failed to remove image")
    }
  }

  const handleVariateImage = async (index: number) => {
    if (!activeSlider || !activeSliderId) return
    const targetImg = activeImages[index]
    const toastId = toast.loading("AI is imagining a variation...")
    
    try {
      const { data } = await blink.ai.generateImage({
        prompt: `A variation of this image: ${targetImg.alt}. Maintain the same style and mood.`,
        images: [targetImg.url],
        n: 1,
        model: "fal-ai/nano-banana-pro",
        size: "1024x1024"
      })

      if (data?.[0]?.url) {
        const newImg: ImageData = {
          url: data[0].url,
          alt: `Variation of ${targetImg.alt}`
        }
        const updatedImages = [...activeImages]
        updatedImages.splice(index + 1, 0, newImg)
        
        await blink.db.table("sliders").update(activeSliderId, {
          imagesJson: JSON.stringify(updatedImages)
        })
        setSliders(prev => prev.map(s => s.id === activeSliderId ? { ...s, imagesJson: JSON.stringify(updatedImages) } : s))
        toast.success("Variation added!", { id: toastId })
      }
    } catch (error) {
      console.error("Variation failed:", error)
      toast.error("Failed to generate variation", { id: toastId })
    }
  }

  const activeSlider = sliders.find(s => s.id === activeSliderId)
  const activeImages: ImageData[] = activeSlider ? JSON.parse(activeSlider.imagesJson) : []

  const styles = [
    { name: "Cinematic", prompt: "Cinematic lighting, 4k, high resolution, minimalist aesthetic" },
    { name: "Vintage", prompt: "Vintage film style, grainy texture, warm tones, 70s aesthetic" },
    { name: "3D Render", prompt: "Octane render, 3D digital art, vibrant colors, futuristic" },
    { name: "Oil Painting", prompt: "Impressionist oil painting, visible brushstrokes, rich textures" },
    { name: "Noir", prompt: "Black and white photography, high contrast, dramatic shadows, moody" }
  ]

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
    <div className="flex h-screen bg-background">
      <Toaster position="top-center" richColors />
      
      {/* Sidebar */}
      {viewMode === 'admin' && (
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
                <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-smooth cursor-pointer">
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
                <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30">
                  <Sparkles className="w-5 h-5 text-primary/50" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AI Gen</span>
                </div>
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
                {user.display_name?.[0] || user.email?.[0]?.toUpperCase() || "U"}
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
      )}

      {/* Main Content */}
      <main className={`flex-1 h-screen overflow-y-auto p-8 lg:p-12 ${viewMode === 'public' ? 'bg-background' : ''}`}>
        {viewMode === 'public' && activeSlider && (
          <div className="fixed top-4 left-4 z-50">
            <button 
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 glass rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-smooth"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              Create Your Own
            </button>
          </div>
        )}
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
              <div className="flex gap-3 items-center">
                <div className="flex bg-muted p-1 rounded-xl">
                  <button
                    onClick={async () => {
                      if (!activeSliderId) return
                      await blink.db.table("sliders").update(activeSliderId, { transitionType: 'slide' })
                      setSliders(prev => prev.map(s => s.id === activeSliderId ? { ...s, transitionType: 'slide' } : s))
                      toast.success("Transition set to Slide")
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-smooth ${
                      activeSlider.transitionType === 'slide' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Slide
                  </button>
                  <button
                    onClick={async () => {
                      if (!activeSliderId) return
                      await blink.db.table("sliders").update(activeSliderId, { transitionType: 'fade' })
                      setSliders(prev => prev.map(s => s.id === activeSliderId ? { ...s, transitionType: 'fade' } : s))
                      toast.success("Transition set to Fade")
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-smooth ${
                      activeSlider.transitionType === 'fade' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Fade
                  </button>
                </div>

                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/slider/${activeSliderId}`)
                    toast.success("Public link copied to clipboard!")
                  }}
                  className="px-4 py-2 border rounded-xl hover:bg-muted transition-smooth flex items-center gap-2 text-sm font-medium"
                >
                  Share
                </button>
              </div>
            </div>

            <div className="aspect-[16/10] w-full">
              <ImageSlider 
                images={activeImages} 
                transitionType={activeSlider.transitionType || 'slide'} 
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {activeImages.map((img, i) => (
                <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border">
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover group-hover:scale-110 transition-smooth" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-smooth flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <span className="text-white text-[10px] font-bold uppercase tracking-wider mb-1">Image {i+1}</span>
                    
                    <div className="flex flex-wrap justify-center gap-2">
                      <button 
                        onClick={() => handleVariateImage(i)}
                        className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold flex items-center gap-1 hover:scale-105 transition-smooth"
                        title="AI Variation"
                      >
                        <Wand2 className="w-3 h-3" />
                        Variate
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteImage(i)}
                        className="p-2 bg-destructive/20 hover:bg-destructive text-destructive-foreground rounded-lg transition-smooth"
                        title="Remove from Slider"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="mt-2 space-y-1">
                      <a 
                        href={img.url} 
                        download 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-white/70 hover:text-white text-[9px] font-medium transition-smooth"
                      >
                        Open Original
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add More Trigger */}
              <label className="flex flex-col items-center justify-center gap-2 aspect-square rounded-2xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-smooth cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-smooth">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Add Images</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={async (e) => {
                    const files = e.target.files
                    if (!files || files.length === 0 || !activeSliderId) return
                    const toastId = toast.loading(`Adding ${files.length} images...`)
                    try {
                      const uploadPromises = Array.from(files).map(file => 
                        blink.storage.upload(file, `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`)
                      )
                      const results = await Promise.all(uploadPromises)
                      const newImages: ImageData[] = results.map((res: any, i) => ({
                        url: res.publicUrl,
                        alt: `Added image ${activeImages.length + i + 1}`
                      }))
                      const updatedImages = [...activeImages, ...newImages]
                      await blink.db.table("sliders").update(activeSliderId, {
                        imagesJson: JSON.stringify(updatedImages)
                      })
                      setSliders(prev => prev.map(s => s.id === activeSliderId ? { ...s, imagesJson: JSON.stringify(updatedImages) } : s))
                      toast.success("Images added successfully!", { id: toastId })
                    } catch (err) {
                      toast.error("Failed to add images", { id: toastId })
                    }
                  }}
                />
              </label>
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
    </div>
  )
}
