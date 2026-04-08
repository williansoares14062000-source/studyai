import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { SYSTEM_PROMPT, buildUserMessage } from './prompts'

export interface GeminiResponse {
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
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 2048,
}

function extractJSON(text: string): GeminiResponse | null {
  try {
    // Try direct parse first
    return JSON.parse(text)
  } catch {
    // Try to extract JSON from text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        return null
      }
    }
    return null
  }
}

function buildFallbackResponse(text: string): GeminiResponse {
  return {
    answer: text || 'Não foi possível processar a resposta.',
    confidence: 50,
    sources: ['Resposta gerada por IA'],
    confidence_label: 'Confiança moderada - formato de resposta não estruturado',
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

  const modelName = imageBase64 ? 'gemini-1.5-flash' : 'gemini-1.5-flash'

  const model = genAI.getGenerativeModel({
    model: modelName,
    safetySettings,
    generationConfig,
    systemInstruction: SYSTEM_PROMPT,
  })

  const userMessage = buildUserMessage(question, !!imageBase64)

  let result
  if (imageBase64 && imageMimeType) {
    result = await model.generateContent([
      userMessage,
      {
        inlineData: {
          data: imageBase64,
          mimeType: imageMimeType,
        },
      },
    ])
  } else {
    result = await model.generateContent(userMessage)
  }

  const responseText = result.response.text().trim()

  const parsed = extractJSON(responseText)

  if (parsed && typeof parsed.answer === 'string' && typeof parsed.confidence === 'number') {
    // Validate and clamp confidence
    parsed.confidence = Math.max(0, Math.min(100, parsed.confidence))
    if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
      parsed.sources = ['Gemini AI']
    }
    return parsed
  }

  return buildFallbackResponse(responseText)
}
