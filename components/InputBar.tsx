'use client'
import { useState, useRef, KeyboardEvent, useCallback } from 'react'
import { Camera, Paperclip, Send, X } from 'lucide-react'

interface InputBarProps {
  onSend: (text: string, imageFiles: File[]) => void
  disabled?: boolean
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [text, setText] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const addImages = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    const valid = arr.filter(f => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > 10 * 1024 * 1024) {
        alert(`"${f.name}" é muito grande. Máximo 10MB.`)
        return false
      }
      return true
    })
    if (valid.length === 0) return

    setSelectedImages(prev => [...prev, ...valid])
    valid.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        setImagePreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addImages(e.target.files)
    }
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = () => {
    if ((!text.trim() && selectedImages.length === 0) || disabled) return
    onSend(text.trim(), selectedImages)
    setText('')
    setSelectedImages([])
    setImagePreviews([])
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

  const hasImages = selectedImages.length > 0

  return (
    <div className="bg-[#F0F0F0] p-2 border-t border-gray-200">
      {hasImages && (
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          {imagePreviews.map((preview, i) => (
            <div key={i} className="relative flex-shrink-0">
              <img
                src={preview}
                alt={`Imagem ${i + 1}`}
                className="h-16 w-16 object-cover rounded-lg border border-gray-300"
              />
              {selectedImages.length > 1 && (
                <span className="absolute bottom-0 left-0 bg-black/60 text-white text-[9px] rounded-bl-lg rounded-tr-lg px-1">
                  {i + 1}
                </span>
              )}
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-gray-800"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Anexar imagens"
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
          placeholder={hasImages ? `Pergunta sobre ${selectedImages.length > 1 ? `${selectedImages.length} imagens` : 'a imagem'}...` : 'Escreva sua pergunta...'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-white rounded-2xl px-4 py-2 text-sm outline-none resize-none min-h-[40px] max-h-[120px] border border-gray-200 focus:border-[#128C7E] transition-colors disabled:opacity-50"
          style={{ height: 'auto' }}
        />

        <button
          onClick={handleSend}
          disabled={(!text.trim() && selectedImages.length === 0) || disabled}
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
