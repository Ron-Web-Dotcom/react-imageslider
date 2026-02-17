import { Search, Check, Loader2, Plus } from 'lucide-react'

interface Source {
  title: string
  url: string
  image?: string
}

interface WorkingTimelineProps {
  parts: any[]
  isComplete: boolean
  mode: 'search' | 'research'
  onAddImage: (url: string, alt: string) => void
}

export const WorkingTimeline = ({ parts, isComplete, mode, onAddImage }: WorkingTimelineProps) => {
  const toolCalls = parts.filter(p => p.type === 'tool-invocation')
  const searchQueries = toolCalls.filter(t => t.toolName === 'webSearch').map(t => t.args?.query)
  
  // Extract images from search results if available
  const sources = toolCalls
    .filter(t => t.toolName === 'webSearch' && t.state === 'result')
    .flatMap(t => t.result?.results || []) as Source[]

  const imagesFound = sources.filter(s => {
    const isImg = s.image || s.url.match(/\.(jpeg|jpg|gif|png|webp)/i)
    return isImg
  })

  if (parts.length === 0 && !isComplete) return null

  return (
    <div className="space-y-4 animate-fade-in py-4 border-b border-border/40">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
        {isComplete ? (
          <div className="w-4 h-4 rounded-full bg-brand-search/20 flex items-center justify-center text-brand-search">
            <Check size={10} strokeWidth={3} />
          </div>
        ) : (
          <Loader2 size={12} className="animate-spin text-brand-search" />
        )}
        <span>{isComplete ? "Analysis Complete" : `${mode === 'research' ? 'Deep ' : ''}Searching...`}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {searchQueries.map((q, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-search/5 border border-brand-search/20 rounded-full text-xs text-brand-search font-medium animate-slide-up">
            <Search size={10} strokeWidth={2.5} />
            <span className="truncate max-w-[150px]">{q}</span>
          </div>
        ))}
      </div>

      {imagesFound.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Suggested Images
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {imagesFound.map((img, i) => (
              <div key={i} className="flex-shrink-0 group relative w-24 h-24 rounded-lg overflow-hidden border border-border/40 hover:border-brand-search/50 transition-smooth">
                <img 
                  src={img.image || img.url} 
                  alt={img.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-smooth" 
                />
                <button 
                  onClick={() => onAddImage(img.image || img.url, img.title)}
                  className="absolute inset-0 bg-brand-search/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-smooth"
                  title="Add to slider"
                >
                  <Plus size={24} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
