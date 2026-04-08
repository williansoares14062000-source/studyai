'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import MessageBubble, { Message } from './MessageBubble'
import InputBar from './InputBar'
import { BookOpen, Settings, X, Trash2 } from 'lucide-react'

const STORAGE_KEY = 'study_assistant_messages'
const API_KEY_STORAGE = 'gemini_api_key'

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [tempApiKey, setTempApiKey] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE) || ''
    setApiKey(savedKey)
    setTempApiKey(savedKey)

    if (!savedKey) {
      setShowSettings(true)
    }

    const savedMessages = localStorage.getItem(STORAGE_KEY)
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages)
        setMessages(parsed.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })))
      } catch {}
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    }
  }, [messages])

  const saveApiKey = () => {
    const key = tempApiKey.trim()
    if (!key) return
    setApiKey(key)
    localStorage.setItem(API_KEY_STORAGE, key)
    setShowSettings(false)
  }

  const clearChat = () => {
    if (confirm('Limpar todo o histórico?')) {
      setMessages([])
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const handleSend = useCallback(async (text: string, imageFile?: File) => {
    if (!apiKey) {
      setShowSettings(true)
      return
    }

    let imageBase64: string | undefined
    let imageMimeType: string | undefined
    let imageUrl: string | undefined

    if (imageFile) {
      imageMimeType = imageFile.type
      imageUrl = URL.createObjectURL(imageFile)
      const buffer = await imageFile.arrayBuffer()
      imageBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text || (imageFile ? '📷 Imagem enviada para análise' : ''),
      imageUrl,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, imageBase64, imageMimeType, apiKey }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro desconhecido')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.answer,
        confidence: data.confidence,
        sources: data.sources,
        confidence_label: data.confidence_label,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Erro: ${error.message}`,
        timestamp: new Date(),
        error: true,
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [apiKey])

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-lg">
      {/* Header */}
      <div className="bg-[#128C7E] text-white px-4 py-3 flex items-center justify-between shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-base leading-tight">Assistente de Estudos</h1>
            <p className="text-xs text-white/70">Powered by Gemini AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            title="Limpar conversa"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={() => { setTempApiKey(apiKey); setShowSettings(true) }}
            className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            title="Configurações"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Configurar API Key</h2>
              {apiKey && (
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Insira sua chave da API do Google Gemini. Ela fica salva apenas no seu dispositivo.
            </p>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#128C7E]"
              onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
              autoFocus
            />
            <button
              onClick={saveApiKey}
              disabled={!tempApiKey.trim()}
              className="w-full bg-[#128C7E] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#0e7269] disabled:opacity-50 transition-colors"
            >
              Salvar
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              A chave não é enviada para nenhum servidor externo além do Google.
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-3"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d9d9d9\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-12">
            <div className="bg-[#128C7E]/10 p-6 rounded-full mb-4">
              <BookOpen size={48} className="text-[#128C7E]" />
            </div>
            <h2 className="font-semibold text-gray-700 mb-2">Assistente de Estudos</h2>
            <p className="text-sm max-w-xs">
              Faça perguntas ou envie fotos de matérias, exercícios ou prints para obter respostas precisas com fontes.
            </p>
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <p>📝 Digite sua dúvida</p>
              <p>📷 Envie um print ou foto</p>
              <p>✅ Receba resposta com % de precisão</p>
            </div>
          </div>
        )}

        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex justify-start mb-2">
            <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-[#128C7E] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#128C7E] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#128C7E] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <InputBar onSend={handleSend} disabled={isLoading} />
    </div>
  )
}
