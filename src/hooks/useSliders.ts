import { useState, useEffect } from "react"
import { blink } from "../lib/blink"
import { toast } from "sonner"
import { SLIDER_STYLES } from "../lib/constants"

export type Slider = {
  id: string
  name: string
  imagesJson: string
  transitionType: 'slide' | 'fade'
  createdAt: string
  userId: string
}

export type ImageData = {
  url: string
  alt: string
}

export function useSliders() {
  const [user, setUser] = useState<any>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [sliders, setSliders] = useState<Slider[]>([])
  const [isLoadingSliders, setIsLoadingSliders] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [activeSliderId, setActiveSliderId] = useState<string | null>(null)
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

  const handleGenerateSlider = async (prompt: string, selectedStyle: string): Promise<boolean> => {
    if (!prompt || isGenerating || !user) return false
    setIsGenerating(true)
    const toastId = toast.loading("AI is crafting your slider images...")

    try {
      const currentStyle = SLIDER_STYLES.find(s => s.name === selectedStyle)?.prompt || SLIDER_STYLES[0].prompt
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

      const newSlider = await blink.db.table("sliders").create({
        userId: user.id,
        name: prompt.substring(0, 30) || "AI Generated Slider",
        imagesJson: JSON.stringify(newImages),
        transitionType: 'slide'
      }) as Slider

      setSliders(prev => [newSlider, ...prev])
      setActiveSliderId(newSlider.id)
      toast.success("Slider generated successfully!", { id: toastId })
      return true
    } catch (error) {
      console.error("Generation failed:", error)
      toast.error("Failed to generate slider. Please try again.", { id: toastId })
      return false
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUploadImages = async (files: FileList) => {
    if (!files || files.length === 0 || !user) return
    
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
        imagesJson: JSON.stringify(newImages),
        transitionType: 'slide'
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

  const handleDeleteSlider = async (id: string) => {
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

  const handleUpdateName = async (id: string, name: string) => {
    try {
      await blink.db.table("sliders").update(id, { name })
      setSliders(prev => prev.map(s => s.id === id ? { ...s, name } : s))
      toast.success("Name updated")
    } catch (error) {
      toast.error("Failed to update name")
    }
  }

  const handleUpdateTransition = async (id: string, transitionType: 'slide' | 'fade') => {
    try {
      await blink.db.table("sliders").update(id, { transitionType })
      setSliders(prev => prev.map(s => s.id === id ? { ...s, transitionType } : s))
      toast.success(`Transition set to ${transitionType === 'slide' ? 'Slide' : 'Fade'}`)
    } catch (error) {
      toast.error("Failed to update transition")
    }
  }

  const handleUpdateImages = async (id: string, images: ImageData[]) => {
    try {
      await blink.db.table("sliders").update(id, {
        imagesJson: JSON.stringify(images)
      })
      setSliders(prev => prev.map(s => s.id === id ? { ...s, imagesJson: JSON.stringify(images) } : s))
    } catch (error) {
      toast.error("Failed to update images")
    }
  }

  return {
    user,
    isLoadingAuth,
    sliders,
    isLoadingSliders,
    isGenerating,
    isUploading,
    activeSliderId,
    setActiveSliderId,
    viewMode,
    handleGenerateSlider,
    handleUploadImages,
    handleDeleteSlider,
    handleUpdateName,
    handleUpdateTransition,
    handleUpdateImages
  }
}
