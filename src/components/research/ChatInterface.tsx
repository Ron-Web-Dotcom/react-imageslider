import { useState } from 'react'
import { useAgent } from '@blinkdotnew/react'
import { Sparkles, X, Search as SearchIcon } from 'lucide-react'
import { searchAgent, researchAgent } from '../../features/research/research-agent'
import { SearchBar } from './SearchBar'
import { WorkingTimeline } from './WorkingTimeline'
import { AnswerView } from './AnswerView'

interface ChatInterfaceProps {
  onAddImage: (url: string, alt: string) => void
  onClose: () => void
}

export const ChatInterface = ({ onAddImage, onClose }: ChatInterfaceProps) => {
  const [hasSearched, setHasSearched] = useState(false)
  const [mode, setMode] = useState<'search' | 'research'>('search')

  const { messages, isLoading, sendMessage } = useAgent({
    agent: mode === 'research' ? researchAgent : searchAgent,
    onFinish: (result) => {
      console.log('Search finished', result)
    }
  })

  const handleSearch = async (query: string, searchMode: 'search' | 'research') => {
    setHasSearched(true)
    setMode(searchMode)
    await sendMessage(query)
  }

  return (
    <div className="flex flex-col h-full bg-card relative overflow-hidden animate-fade-in shadow-2xl border border-brand-search/10 rounded-2xl">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border/40 bg-brand-search/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-search/10 flex items-center justify-center text-brand-search">
            <SearchIcon size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">AI Image Search</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-60">Research & Add</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-xl transition-smooth text-muted-foreground hover:text-foreground"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth">
        {!hasSearched ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-brand-search/5 flex items-center justify-center text-brand-search relative">
              <Sparkles className="w-10 h-10 animate-pulse" />
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-brand-search text-white flex items-center justify-center text-[10px] font-bold shadow-lg shadow-brand-search/20">
                AI
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Search and Add Images</h2>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                Describe the images you're looking for, or search a topic to get insights and visuals to add to your slider.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, i) => (
              <div key={msg.id || i}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end animate-slide-up">
                    <div className="bg-brand-search text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm font-medium shadow-lg shadow-brand-search/10 max-w-[85%]">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="animate-slide-up space-y-4">
                    <WorkingTimeline 
                      parts={msg.parts || []}
                      isComplete={i < messages.length - 1 || !isLoading}
                      mode={mode}
                      onAddImage={onAddImage}
                    />
                    <div className="bg-muted/30 rounded-2xl rounded-tl-none p-5 border border-border/40 shadow-sm">
                      <AnswerView 
                        content={msg.content} 
                        isComplete={i < messages.length - 1 || !isLoading} 
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="animate-pulse space-y-4">
                <WorkingTimeline parts={[]} isComplete={false} mode={mode} onAddImage={() => {}} />
                <div className="h-24 bg-muted/30 rounded-2xl border border-dashed flex items-center justify-center text-muted-foreground text-xs font-medium tracking-widest uppercase">
                  Gathering Insights...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Search Bar */}
      <div className="p-4 border-t border-border/40 bg-background/80 backdrop-blur-sm">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} compact />
      </div>
    </div>
  )
}
