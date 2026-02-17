import { useState, useEffect } from "react"
import { ArrowBigLeft, ArrowBigRight, Sparkles, Loader2, Play, Pause, Maximize, Volume2 } from "lucide-react"
import { blink } from "./lib/blink"
import "./image-slider.css"

type ImageSliderProps = {
  images: {
    url: string
    alt: string
  }[]
  transitionType?: 'slide' | 'fade'
}

export function ImageSlider({ images, transitionType = 'slide' }: ImageSliderProps) {
  const [imageIndex, setImageIndex] = useState(0)
  const [caption, setCaption] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const autoPlayInterval = 5000 // 5 seconds

  // Clear caption when image changes
  useEffect(() => {
    setCaption(null)
    setProgress(0)
    setIsSpeaking(false)
  }, [imageIndex])

  // Auto-play logic
  useEffect(() => {
    if (isAutoPlaying) {
      const startTime = Date.now()
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const newProgress = Math.min((elapsed / autoPlayInterval) * 100, 100)
        setProgress(newProgress)
        
        if (newProgress >= 100) {
          showNextImage()
        }
      }, 50)
      
      return () => clearInterval(interval)
    }
  }, [isAutoPlaying, imageIndex])

  function showNextImage() {
    setImageIndex(index => {
      if (index === images.length - 1) return 0
      return index + 1
    })
  }

  function showPrevImage() {
    setImageIndex(index => {
      if (index === 0) return images.length - 1
      return index - 1
    })
  }

  const analyzeCurrentImg = async () => {
    if (isAnalyzing) return
    setIsAnalyzing(true)
    try {
      const currentImg = images[imageIndex]
      const { text } = await blink.ai.generateText({
        messages: [
          {
            role: "system",
            content: "You are an AI image analyst for a high-end photography slider. Describe the image concisely and artistically in one short sentence. Focus on mood and style."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this image for a photography portfolio:" },
              { type: "image", image: currentImg.url }
            ]
          }
        ]
      })
      setCaption(text)
      // Auto speak if caption generated
      speakText(text)
    } catch (error) {
      console.error("AI Analysis failed:", error)
      setCaption("Beautifully captured moment.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const speakText = async (text: string) => {
    if (isSpeaking || !text) return
    setIsSpeaking(true)
    try {
      const { url } = await blink.ai.generateSpeech({
        text,
        voice: "nova"
      })
      const audio = new Audio(url)
      audio.onended = () => setIsSpeaking(false)
      await audio.play()
    } catch (error) {
      console.error("Speech generation failed:", error)
      setIsSpeaking(false)
    }
  }

  const toggleFullScreen = () => {
    const element = document.querySelector(".slider-container")
    if (!element) return
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <section
      aria-label="Slick Pic Slider"
      className="slider-container group"
    >
      <a href="#after-image-slider-controls" className="skip-link">
        Skip Slider Controls
      </a>

      {/* AI Caption Overlay */}
      {caption && (
        <div className="ai-caption">
          <div className="flex items-center gap-3 ai-caption-text group/caption">
            <span className="flex-1">
              {caption}
            </span>
            <button 
              onClick={() => speakText(caption)}
              className={`p-1.5 rounded-full hover:bg-white/20 transition-smooth ${isSpeaking ? 'animate-pulse text-primary' : 'text-white'}`}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {isAutoPlaying && (
        <div className="absolute top-0 left-0 w-full h-1 z-20 bg-white/10 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main Slider Area */}
      <div 
        className={`slider-inner ${transitionType === 'fade' ? 'transition-fade' : ''}`} 
        style={transitionType === 'slide' ? { transform: `translateX(${-100 * imageIndex}%)` } : {}}
      >
        {images.map(({ url, alt }, index) => (
          <img
            key={`${url}-${index}`}
            src={url}
            alt={alt}
            aria-hidden={imageIndex !== index}
            className={`img-slider-img ${transitionType === 'fade' ? (index === imageIndex ? 'opacity-100' : 'opacity-0 pointer-events-none') : ''}`}
            style={transitionType === 'fade' ? { position: 'absolute', inset: 0 } : {}}
          />
        ))}
      </div>

      {/* Controls */}
      <button
        onClick={showPrevImage}
        className="img-slider-btn left-0 opacity-0 group-hover:opacity-100"
        aria-label="Previous Image"
      >
        <ArrowBigLeft />
      </button>

      <button
        onClick={showNextImage}
        className="img-slider-btn right-0 opacity-0 group-hover:opacity-100"
        aria-label="Next Image"
      >
        <ArrowBigRight />
      </button>

      {/* Bottom Bar Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex gap-2">
        <button
          onClick={toggleFullScreen}
          className="glass p-2 rounded-full text-white transition-smooth hover:scale-110 active:scale-95"
          title="Toggle Full Screen"
        >
          <Maximize className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className="glass p-2 rounded-full text-white transition-smooth hover:scale-110 active:scale-95"
          title={isAutoPlaying ? "Pause Auto-play" : "Resume Auto-play"}
        >
          {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={analyzeCurrentImg}
          disabled={isAnalyzing}
          className="glass p-2 rounded-full text-white transition-smooth hover:scale-110 active:scale-95 disabled:opacity-50"
          title="AI Insight"
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </button>

        {caption && (
          <button
            onClick={() => speakText(caption)}
            disabled={isSpeaking}
            className={`glass p-2 rounded-full text-white transition-smooth hover:scale-110 active:scale-95 disabled:opacity-50 ${isSpeaking ? 'animate-pulse' : ''}`}
            title="Listen to Insight"
          >
            {isSpeaking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Dots Navigation */}
      <div className="dots-container">
        {images.map((_, index) => (
          <button
            key={index}
            className={`img-slider-dot-btn ${index === imageIndex ? 'active' : ''}`}
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => setImageIndex(index)}
          />
        ))}
      </div>

      <div id="after-image-slider-controls" />
    </section>
  )
}