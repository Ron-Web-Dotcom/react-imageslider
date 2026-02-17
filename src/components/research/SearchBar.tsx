import { useState, useRef } from 'react'
import { Search, ArrowRight, Globe, Paperclip, Compass } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SearchBarProps {
  onSearch: (query: string, mode: 'search' | 'research') => void
  isLoading: boolean
  compact?: boolean
}

export const SearchBar = ({ onSearch, isLoading, compact }: SearchBarProps) => {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'search' | 'research'>('search')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const [activeTooltip, setActiveTooltip] = useState<'search' | 'research' | null>(null)
  const [arrowOffset, setArrowOffset] = useState(0)
  const tooltipTimeoutRef = useRef<any>(null)

  const handleMouseEnter = (triggerMode: 'search' | 'research', e: React.MouseEvent<HTMLButtonElement>) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
    setActiveTooltip(triggerMode)
    const buttonRect = e.currentTarget.getBoundingClientRect()
    const parentRect = (e.currentTarget.offsetParent as HTMLElement)?.getBoundingClientRect() || { left: 0 }
    setArrowOffset(buttonRect.left - parentRect.left + buttonRect.width / 2)
  }

  const handleMouseLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => setActiveTooltip(null), 300)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return
    onSearch(query, mode)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form 
      onSubmit={handleSubmit}
      className={cn(
        "relative flex flex-col bg-card border border-border/40",
        "focus-within:border-border/60 focus-within:shadow-sm",
        compact ? "rounded-3xl p-3" : "rounded-2xl p-4"
      )}
    >
      <textarea
        ref={textareaRef}
        placeholder="Search for images or topics to add to your slider..."
        rows={1}
        className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 resize-none min-h-[24px]"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="flex items-center justify-between mt-3 px-1 relative">
        <div className="relative">
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-[10px]">
            <button 
              type="button" 
              onClick={() => setMode('search')}
              onMouseEnter={(e) => handleMouseEnter('search', e)}
              onMouseLeave={handleMouseLeave}
              className={cn(
                "p-2 rounded-[8px] transition-smooth", 
                mode === 'search' ? "bg-background shadow-sm text-brand-search" : "text-muted-foreground"
              )}
            >
              <Search size={16} strokeWidth={2.5} />
            </button>
            <button 
              type="button" 
              onClick={() => setMode('research')}
              onMouseEnter={(e) => handleMouseEnter('research', e)}
              onMouseLeave={handleMouseLeave}
              className={cn(
                "p-2 rounded-[8px] transition-smooth", 
                mode === 'research' ? "bg-background shadow-sm text-brand-search" : "text-muted-foreground"
              )}
            >
              <Compass size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div 
            className={cn(
              "absolute bottom-full mb-3 left-0 z-50 transition-all duration-200 origin-bottom",
              activeTooltip ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            )} 
            style={{ width: '280px' }}
            onMouseEnter={() => tooltipTimeoutRef.current && clearTimeout(tooltipTimeoutRef.current)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="bg-[#18181b] text-white rounded-xl p-4 shadow-2xl">
              <h4 className="font-medium text-sm">
                {activeTooltip === 'search' ? 'Quick Search' : 'Deep Research'}
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                {activeTooltip === 'search' 
                  ? 'Find specific images and fast answers.' 
                  : 'In-depth analysis and broad image search.'}
              </p>
              <div className="mt-3 text-xs font-medium text-brand-search-glow">
                Powered by Gemini 1.5 Flash
              </div>
            </div>
            <div className="absolute -bottom-1 w-2 h-2 bg-[#18181b] rotate-45"
              style={{ left: arrowOffset + 4 }} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="p-2 text-muted-foreground/70 hover:text-foreground rounded-full transition-smooth">
            <Globe size={18} />
          </button>
          <button type="button" className="p-2 text-muted-foreground/70 hover:text-foreground rounded-full transition-smooth">
            <Paperclip size={18} />
          </button>
          <button 
            type="submit" 
            disabled={!query.trim() || isLoading}
            className={cn(
              "p-2 rounded-full transition-smooth disabled:opacity-50",
              query.trim() ? "bg-brand-search text-white shadow-lg shadow-brand-search/20" : "bg-muted text-muted-foreground"
            )}
          >
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </form>
  )
}
