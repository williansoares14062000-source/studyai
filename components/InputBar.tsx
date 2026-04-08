'use client'
import { useState, useRef, KeyboardEvent, useCallback } from 'react'
import { Camera, Paperclip, Send, X } from 'lucide-react'

interface InputBarProps {
  onSend: (text: string, imageFile?: File) => void
  disabled?: boolean
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [text, setText] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const applyImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 10MB.')
      return
    }
    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) applyImage(file)
  }

  const handleSend = () => {
    if ((!text.trim() && !selectedImage) || disabled) return
    onSend(text.trim(), selectedImage || undefined)
    setText('')
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="bg-[#F0F0F0] p-2 border-t border-gray-200">
      {imagePreview && (
        <div className="relative inline-block mb-2 ml-1">
          <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-300" />
          <button
            onClick={removeImage}
            className="absolute -top-1 -right-1 bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-gray-800"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageSelect}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Anexar imagem"
        >
          <Paperclip size={22} />
        </button>

        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Tirar foto"
        >
          <Camera size={22} />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={selectedImage ? 'Faça uma pergunta sobre a imagem...' : 'Escreva sua pergunta...'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-white rounded-2xl px-4 py-2 text-sm outline-none resize-none min-h-[40px] max-h-[120px] border border-gray-200 focus:border-[#128C7E] transition-colors disabled:opacity-50"
          style={{ height: 'auto' }}
        />

        <button
          onClick={handleSend}
          disabled={(!text.trim() && !selectedImage) || disabled}
          className="bg-[#128C7E] text-white p-2 rounded-full hover:bg-[#0e7269] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          title="Enviar"
        >
          <Send size={22} />
        </button>
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-1">
        Enter para enviar • Shift+Enter para nova linha
      </p>
    </div>
  )
}
