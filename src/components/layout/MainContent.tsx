import { Sparkles, Wand2, Trash2, Upload } from "lucide-react"
import { Slider, ImageData } from "../../hooks/useSliders"
import { ImageSlider } from "../../ImageSlider"
import { useState } from "react"
import { blink } from "../../lib/blink"
import { toast } from "sonner"

type MainContentProps = {
  activeSlider: Slider | null
  activeImages: ImageData[]
  viewMode: 'admin' | 'public'
  handleUpdateName: (id: string, name: string) => void
  handleUpdateTransition: (id: string, transitionType: 'slide' | 'fade') => void
  handleUpdateImages: (id: string, images: ImageData[]) => void
}

export function MainContent({
  activeSlider,
  activeImages,
  viewMode,
  handleUpdateName,
  handleUpdateTransition,
  handleUpdateImages
}: MainContentProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState("")

  const handleVariateImage = async (index: number) => {
    if (!activeSlider) return
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
        handleUpdateImages(activeSlider.id, updatedImages)
        toast.success("Variation added!", { id: toastId })
      }
    } catch (error) {
      console.error("Variation failed:", error)
      toast.error("Failed to generate variation", { id: toastId })
    }
  }

  const handleDeleteImage = (index: number) => {
    if (!activeSlider) return
    if (activeImages.length <= 1) {
      toast.error("A slider must have at least one image.")
      return
    }
    const updatedImages = activeImages.filter((_, i) => i !== index)
    handleUpdateImages(activeSlider.id, updatedImages)
    toast.success("Image removed from slider")
  }

  const handleUploadNewImages = async (files: FileList) => {
    if (!files || files.length === 0 || !activeSlider) return
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
      handleUpdateImages(activeSlider.id, [...activeImages, ...newImages])
      toast.success("Images added successfully!", { id: toastId })
    } catch (err) {
      toast.error("Failed to add images", { id: toastId })
    }
  }

  if (!activeSlider) {
    return (
      <main className="flex-1 h-screen flex flex-col items-center justify-center text-center space-y-4 p-8">
        <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
          <Sparkles className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold">Select or Create a Slider</h2>
        <p className="text-muted-foreground max-w-sm">
          Use the Magic Generator on the left to create a stunning slider from any theme you can imagine.
        </p>
      </main>
    )
  }

  return (
    <main className={`flex-1 h-screen overflow-y-auto p-8 lg:p-12 ${viewMode === 'public' ? 'bg-background' : ''}`}>
      {viewMode === 'public' && (
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

      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault()
                  handleUpdateName(activeSlider.id, editingName)
                  setIsEditingName(false)
                }} 
                className="flex items-center gap-2"
              >
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
            <p className="text-muted-foreground">Preview your interactive AI-powered slider.</p>
          </div>

          <div className="flex gap-3 items-center">
            <div className="flex bg-muted p-1 rounded-xl shadow-inner border border-border/50">
              <button
                onClick={() => handleUpdateTransition(activeSlider.id, 'slide')}
                className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-smooth ${
                  activeSlider.transitionType === 'slide' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Slide
              </button>
              <button
                onClick={() => handleUpdateTransition(activeSlider.id, 'fade')}
                className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-smooth ${
                  activeSlider.transitionType === 'fade' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Fade
              </button>
            </div>

            <button 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/slider/${activeSlider.id}`)
                toast.success("Public link copied to clipboard!")
              }}
              className="px-4 py-2 border rounded-xl hover:bg-muted transition-smooth flex items-center gap-2 text-sm font-medium shadow-sm bg-card"
            >
              Share
            </button>
          </div>
        </div>

        <div className="aspect-[16/10] w-full rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/50">
          <ImageSlider 
            images={activeImages} 
            transitionType={activeSlider.transitionType || 'slide'} 
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Manage Assets</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {activeImages.map((img, i) => (
              <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border bg-muted shadow-sm hover:shadow-md transition-smooth">
                <img src={img.url} alt={img.alt} className="w-full h-full object-cover group-hover:scale-110 transition-smooth" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-smooth flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <span className="text-white text-[10px] font-bold uppercase tracking-wider mb-1">Slide {i+1}</span>
                  
                  <div className="flex flex-wrap justify-center gap-2">
                    <button 
                      onClick={() => handleVariateImage(i)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold flex items-center gap-1 hover:scale-105 transition-smooth shadow-lg shadow-primary/20"
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

                  <div className="mt-2">
                    <a 
                      href={img.url} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/70 hover:text-white text-[10px] font-medium transition-smooth border-b border-white/20 hover:border-white"
                    >
                      View Full
                    </a>
                  </div>
                </div>
              </div>
            ))}
            
            <label className="flex flex-col items-center justify-center gap-2 aspect-square rounded-2xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-smooth cursor-pointer group bg-muted/20">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-smooth">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Add More</span>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => e.target.files && handleUploadNewImages(e.target.files)}
              />
            </label>
          </div>
        </div>
      </div>
    </main>
  )
}
