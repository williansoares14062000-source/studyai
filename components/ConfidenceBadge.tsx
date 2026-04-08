interface ConfidenceBadgeProps {
  confidence: number
  sources: string[]
  label?: string
}

export default function ConfidenceBadge({ confidence, sources, label }: ConfidenceBadgeProps) {
  const getColor = () => {
    if (confidence >= 90) return 'bg-green-100 text-green-800 border-green-300'
    if (confidence >= 70) return 'bg-blue-100 text-blue-800 border-blue-300'
    if (confidence >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  const getIcon = () => {
    if (confidence >= 90) return '✓'
    if (confidence >= 70) return '◎'
    if (confidence >= 50) return '⚠'
    return '⚠'
  }

  return (
    <div className={`mt-2 px-2 py-1 rounded-lg border text-xs ${getColor()}`}>
      <div className="font-semibold">
        {getIcon()} {confidence}% de precisão
      </div>
      {label && <div className="mt-0.5 opacity-80">{label}</div>}
      {sources && sources.length > 0 && (
        <div className="mt-0.5 opacity-80 break-all">
          Fontes: {sources.join(', ')}
        </div>
      )}
    </div>
  )
}
