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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          
          <div className="relative space-y-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
                <p className="text-muted-foreground">Sign in to your Slick Pic account</p>
              </div>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => blink.auth.signInWithGoogle()}
                className="w-full h-12 flex items-center justify-center gap-3 bg-background border hover:bg-muted transition-smooth rounded-xl font-medium shadow-sm active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 1.2-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
              
              <button
                onClick={() => blink.auth.signInWithApple()}
                className="w-full h-12 flex items-center justify-center gap-3 bg-foreground text-background hover:opacity-90 transition-smooth rounded-xl font-medium shadow-sm active:scale-[0.98]"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.96.95-2.12 1.43-3.48 1.43-1.2 0-2.3-.4-3.3-1.2-1-.8-2.1-1.2-3.3-1.2-1.36 0-2.52.48-3.48 1.43-.16.16-.36.24-.52.24s-.36-.08-.52-.24c-.16-.16-.24-.36-.24-.52 0-.16.08-.36.24-.52 1.16-1.16 2.56-1.74 4.2-1.74 1.2 0 2.3.4 3.3 1.2 1 .8 2.1 1.2 3.3 1.2 1.64 0 3.04-.58 4.2-1.74.16-.16.36-.24.52-.24.16 0 .36.08.52.24.16.16.24.36.24.52 0 .16-.08.36-.24.52zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                Continue with Apple
              </button>
              
              <button
                onClick={() => blink.auth.signInWithGitHub()}
                className="w-full h-12 flex items-center justify-center gap-3 bg-[#24292F] text-white hover:opacity-90 transition-smooth rounded-xl font-medium shadow-sm active:scale-[0.98]"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Continue with GitHub
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form 
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value
                if (email) blink.auth.sendMagicLink(email)
                toast.success("Magic link sent!")
              }}
            >
              <input
                name="email"
                type="email"
                required
                placeholder="name@example.com"
                className="w-full h-12 px-4 rounded-xl border bg-muted focus:ring-2 focus:ring-primary outline-none transition-smooth"
              />
              <button
                type="submit"
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-smooth active:scale-[0.98]"
              >
                Send Magic Link
              </button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="#" className="underline hover:text-primary transition-smooth">Terms of Service</a> and{" "}
              <a href="#" className="underline hover:text-primary transition-smooth">Privacy Policy</a>.
            </p>
          </div>
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
