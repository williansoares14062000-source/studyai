import { useState } from 'react'
import ConfidenceBadge from './ConfidenceBadge'
import ImageLightbox from './ImageLightbox'
import { ZoomIn } from 'lucide-react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  shortAnswer?: string
  imageUrls?: string[]
  imageLabel?: string
  confidence?: number
  sources?: string[]
  confidence_label?: string
  timestamp: Date
  error?: boolean
}

interface MessageBubbleProps {
  message: Message
}

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />)
      continue
    }

    if (/^[\*\-] /.test(line.trim())) {
      const content = line.trim().replace(/^[\*\-] /, '')
      elements.push(
        <div key={key++} className="flex gap-2 text-sm text-gray-800 leading-relaxed">
          <span className="text-[#128C7E] font-bold flex-shrink-0 mt-0.5">•</span>
          <span>{applyInlineFormatting(content)}</span>
        </div>
      )
      continue
    }

    elements.push(
      <p key={key++} className="text-sm text-gray-800 leading-relaxed">
        {applyInlineFormatting(line)}
      </p>
    )
  }

  return elements
}

function applyInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(<strong key={match.index} className="font-semibold text-gray-900">{match[1]}</strong>)
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
        <div
          className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm ${
            isUser
              ? 'bg-[#DCF8C6] rounded-tr-none'
              : message.error
              ? 'bg-red-50 border border-red-200 rounded-tl-none'
              : 'bg-white rounded-tl-none'
          }`}
        >
          {/* User images - clickable thumbnails */}
          {isUser && message.imageUrls && message.imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.imageUrls.map((url, i) => (
                <div
                  key={i}
                  className="relative group cursor-pointer"
                  onClick={() => setLightboxSrc(url)}
                >
                  <img
                    src={url}
                    alt={`Imagem ${i + 1}`}
                    className="rounded-md max-h-48 max-w-[200px] object-cover border border-gray-200 group-hover:brightness-90 transition-all"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/40 rounded-full p-1.5">
                      <ZoomIn size={18} className="text-white" />
                    </div>
                  </div>
                  {message.imageUrls!.length > 1 && (
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] rounded px-1">
                      {i + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* User text */}
          {isUser ? (
            message.text && (
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {message.text}
              </p>
            )
          ) : message.error ? (
            <p className="text-sm text-gray-800 leading-relaxed">{message.text}</p>
          ) : (
            <div className="space-y-2">
              {/* Image label for multi-image responses */}
              {message.imageLabel && (
                <div className="text-xs font-semibold text-[#128C7E] uppercase tracking-wide border-b border-[#128C7E]/20 pb-1 mb-1">
                  {message.imageLabel}
                </div>
              )}

              {message.shortAnswer && (
                <div className="bg-[#128C7E]/10 border-l-4 border-[#128C7E] rounded-r-lg px-3 py-2">
                  <p className="text-xs font-semibold text-[#128C7E] uppercase tracking-wide mb-0.5">
                    Resposta
                  </p>
                  <p className="text-sm font-semibold text-gray-900 leading-snug">
                    {message.shortAnswer}
                  </p>
                </div>
              )}

              {message.text && (
                <div className="space-y-1">
                  {message.shortAnswer && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">
                      Explicação
                    </p>
                  )}
                  {renderMarkdown(message.text)}
                </div>
              )}
            </div>
          )}

          {!isUser && !message.error && message.confidence !== undefined && (
            <ConfidenceBadge
              confidence={message.confidence}
              sources={message.sources || []}
              label={message.confidence_label}
            />
          )}

          <div className={`text-[10px] text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {time}
          </div>
        </div>
      </div>
    </>
  )
}
