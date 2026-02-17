import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AnswerViewProps {
  content: string | undefined
  isComplete: boolean
}

export const AnswerView = ({ content, isComplete }: AnswerViewProps) => {
  const safeContent = typeof content === 'string' ? content : ''
  
  const { cleanContent, sources } = useMemo(() => {
    if (!safeContent) return { cleanContent: '', sources: [] }
    
    const lines = safeContent.split('\n')
    const sourcesIdx = lines.findIndex(l => /sources?|references?/i.test(l))
    
    if (sourcesIdx === -1) return { cleanContent: safeContent, sources: [] }
    
    const clean = lines.slice(0, sourcesIdx).join('\n')
    const extractedLines = lines.slice(sourcesIdx + 1)
      .map((line, idx) => {
        const match = line.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/) || 
                      line.match(/(?:(.+?):\s*)?(https?:\/\/[^\s]+)/)
        return match ? { title: match[1] || `Source ${idx + 1}`, url: match[2], index: idx + 1 } : null
      }).filter(Boolean) as { title: string, url: string, index: number }[]

    return { cleanContent: clean, sources: extractedLines }
  }, [safeContent])

  if (!cleanContent) return null

  return (
    <div className="space-y-6 animate-fade-in py-6">
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-muted-foreground/90 prose-headings:font-bold prose-headings:tracking-tight prose-a:text-brand-search hover:prose-a:text-brand-search-glow transition-smooth">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {cleanContent}
        </ReactMarkdown>
      </div>

      {isComplete && sources.length > 0 && (
        <div className="pt-6 border-t border-border/40 space-y-3">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
            Sources & References
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sources.map((s, i) => (
              <a 
                key={i} 
                href={s.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-brand-search/20 hover:bg-muted/50 transition-smooth group"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-search/10 flex items-center justify-center text-[10px] font-bold text-brand-search group-hover:scale-110 transition-smooth">
                  {s.index}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate group-hover:text-brand-search transition-smooth">{s.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate opacity-60">{new URL(s.url).hostname}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
