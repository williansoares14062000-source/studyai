import ConfidenceBadge from './ConfidenceBadge'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  imageUrl?: string
  confidence?: number
  sources?: string[]
  confidence_label?: string
  timestamp: Date
  error?: boolean
}

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
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
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Imagem enviada"
            className="rounded-md mb-2 max-h-48 w-auto object-contain"
          />
        )}

        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {message.text}
        </p>

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
  )
}
