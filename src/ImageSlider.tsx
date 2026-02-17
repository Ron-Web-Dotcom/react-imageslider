import { useState, useEffect } from "react"
import { ArrowBigLeft, ArrowBigRight, Sparkles, Loader2 } from "lucide-react"
import { blink } from "./lib/blink"
import "./image-slider.css"

type ImageSliderProps = {
  images: {
    url: string
    alt: string
  }[]
}

export function ImageSlider({ images }: ImageSliderProps) {
  const [imageIndex, setImageIndex] = useState(0)
  const [caption, setCaption] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Clear caption when image changes
  useEffect(() => {
    setCaption(null)
  }, [imageIndex])

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
    } catch (error) {
      console.error("AI Analysis failed:", error)
      setCaption("Beautifully captured moment.")
    } finally {
      setIsAnalyzing(false)
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
          <span className="ai-caption-text">
            {caption}
          </span>
        </div>
      )}

      {/* Main Slider Area */}
      <div className="slider-inner" style={{ transform: `translateX(${-100 * imageIndex}%)` }}>
        {images.map(({ url, alt }, index) => (
          <img
            key={`${url}-${index}`}
            src={url}
            alt={alt}
            aria-hidden={imageIndex !== index}
            className="img-slider-img"
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

      {/* AI Insight Button */}
      <button
        onClick={analyzeCurrentImg}
        disabled={isAnalyzing}
        className="absolute top-4 right-4 z-20 glass p-2 rounded-full text-white transition-smooth hover:scale-110 active:scale-95 disabled:opacity-50"
        title="AI Insight"
      >
        {isAnalyzing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5" />
        )}
      </button>

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