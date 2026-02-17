import { useState } from "react"
import { Sparkles, Loader2, Menu, X } from "lucide-react"
import { useSliders } from "./hooks/useSliders"
import { Sidebar } from "./components/layout/Sidebar"
import { MainContent } from "./components/layout/MainContent"
import { Toaster } from "sonner"
import { blink } from "./lib/blink"

export default function App() {
  const {
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
  } = useSliders()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary font-medium shadow-lg shadow-primary/5">
              <Sparkles className="w-4 h-4" />
              AI-Powered Portfolio Experience
            </div>
            <h1 className="text-6xl font-bold tracking-tight text-foreground">
              Slick Pic <span className="text-primary italic">Slider</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Generate stunning, interactive image sliders with AI. Showcase your vision with professional aesthetics and accessible navigation.
            </p>
          </div>
          <button
            onClick={() => blink.auth.login()}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:scale-105 transition-smooth shadow-xl shadow-primary/20"
          >
            Get Started Free
          </button>
        </div>
      </div>
    )
  }

  const activeSlider = sliders.find(s => s.id === activeSliderId) || null
  const activeImages = activeSlider ? JSON.parse(activeSlider.imagesJson) : []

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      <Toaster 
        position="bottom-right" 
        richColors 
        theme="dark"
        toastOptions={{
          style: {
            borderRadius: '1rem',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
          }
        }}
      />
      
      {/* Mobile Toggle */}
      {viewMode === 'admin' && (
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-primary text-primary-foreground rounded-full shadow-xl shadow-primary/30 transition-smooth active:scale-90"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      )}

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      {viewMode === 'admin' && (
        <div className={`
          fixed lg:static inset-y-0 left-0 z-40 w-80 
          transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 transition-transform duration-300 ease-in-out
        `}>
          <Sidebar 
            sliders={sliders}
            isLoadingSliders={isLoadingSliders}
            activeSliderId={activeSliderId}
            setActiveSliderId={(id) => {
              setActiveSliderId(id)
              setIsSidebarOpen(false)
            }}
            onGenerate={handleGenerateSlider}
            onUpload={handleUploadImages}
            onDeleteSlider={handleDeleteSlider}
            user={user}
            isGenerating={isGenerating}
            isUploading={isUploading}
          />
        </div>
      )}

      {/* Main Content */}
      <MainContent 
        activeSlider={activeSlider}
        activeImages={activeImages}
        viewMode={viewMode}
        handleUpdateName={handleUpdateName}
        handleUpdateTransition={handleUpdateTransition}
        handleUpdateImages={handleUpdateImages}
      />
    </div>
  )
}
