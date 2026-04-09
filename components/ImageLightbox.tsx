'use client'
import { useEffect } from 'react'
import { X, ZoomIn } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  onClose: () => void
}

export default function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
      >
        <X size={24} />
      </button>
      <img
        src={src}
        alt="Visualização"
        className="max-w-full max-h-full object-contain rounded-lg select-none"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}
