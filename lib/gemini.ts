import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { SYSTEM_PROMPT, buildUserMessage } from './prompts'

export interface GeminiResponse {
  short_answer?: string
  answer: string
  confidence: number
  sources: string[]
  confidence_label: string
  has_image_analysis: boolean
}

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
]

const generationConfig = {
  temperature: 0.1,
  maxOutputTokens: 16384,
}

function cleanResponseText(text: string): string {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1')
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '')
  return cleaned.trim()
}

function extractJSON(text: string): GeminiResponse | null {
  const cleaned = cleanResponseText(text)

  try {
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {}

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {}
  }

  try {
    return JSON.parse(text)
  } catch {}

  const fallbackMatch = text.match(/\{[\s\S]*\}/)
  if (fallbackMatch) {
    try {
      return JSON.parse(fallbackMatch[0])
    } catch {}
  }

  return null
}

function buildFallbackResponse(text: string): GeminiResponse {
  const cleaned = cleanResponseText(text)
  return {
    answer: cleaned || 'Não foi possível processar a resposta.',
    confidence: 50,
    sources: [],
    confidence_label: 'Confiança moderada',
    has_image_analysis: false,
  }
}

export async function queryGemini(
  apiKey: string,
  question: string,
  imageBase64?: string,
  imageMimeType?: string
): Promise<GeminiResponse> {
  const genAI = new GoogleGenerativeAI(apiKey)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    safetySettings,
    generationConfig,
    systemInstruction: SYSTEM_PROMPT,
  })

  const userMessage = buildUserMessage(question, !!imageBase64)

  let result
  if (imageBase64 && imageMimeType) {
    result = await model.generateContent([
      userMessage,
      { inlineData: { data: imageBase64, mimeType: imageMimeType } },
    ])
  } else {
    result = await model.generateContent(userMessage)
  }

  const responseText = result.response.text().trim()
  const parsed = extractJSON(responseText)

  if (parsed && typeof parsed.answer === 'string' && typeof parsed.confidence === 'number') {
    parsed.confidence = Math.max(0, Math.min(100, parsed.confidence))
    if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
      parsed.sources = []
    }
    return parsed
  }

  return buildFallbackResponse(responseText)
}
