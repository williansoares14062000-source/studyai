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
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 16384,
}

function cleanResponseText(text: string): string {
  // Remove <think>...</think> blocks (Gemini 2.5 thinking tokens)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  // Remove markdown code blocks with closing ```
  cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1')
  // Remove opening ``` without closing (truncated response)
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

function buildFallbackResponse(text: string, groundingSources: string[]): GeminiResponse {
  const cleaned = cleanResponseText(text)
  return {
    answer: cleaned || 'Não foi possível processar a resposta.',
    confidence: 50,
    sources: groundingSources.length > 0 ? groundingSources : ['Gemini AI'],
    confidence_label: 'Confiança moderada',
    has_image_analysis: false,
  }
}

function extractGroundingSources(result: any): string[] {
  try {
    const candidates = result.response?.candidates ?? []
    const groundingMetadata = candidates[0]?.groundingMetadata
    if (!groundingMetadata) return []

    const chunks: string[] = []

    for (const chunk of groundingMetadata.groundingChunks ?? []) {
      const web = chunk.web
      if (web?.title && web?.uri) {
        chunks.push(`${web.title} (${web.uri})`)
      } else if (web?.uri) {
        chunks.push(web.uri)
      } else if (web?.title) {
        chunks.push(web.title)
      }
    }

    return chunks
  } catch {
    return []
  }
}

async function callGemini(
  apiKey: string,
  question: string,
  imageBase64?: string,
  imageMimeType?: string,
  useGrounding = true
) {
  const genAI = new GoogleGenerativeAI(apiKey)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    safetySettings,
    generationConfig,
    systemInstruction: SYSTEM_PROMPT,
    ...(useGrounding ? { tools: [{ googleSearchRetrieval: {} }] } : {}),
  })

  const userMessage = buildUserMessage(question, !!imageBase64)

  if (imageBase64 && imageMimeType) {
    return model.generateContent([
      userMessage,
      { inlineData: { data: imageBase64, mimeType: imageMimeType } },
    ])
  }
  return model.generateContent(userMessage)
}

export async function queryGemini(
  apiKey: string,
  question: string,
  imageBase64?: string,
  imageMimeType?: string
): Promise<GeminiResponse> {
  let result: any
  let groundingSources: string[] = []

  try {
    result = await callGemini(apiKey, question, imageBase64, imageMimeType, true)
    groundingSources = extractGroundingSources(result)
  } catch (groundingError: any) {
    console.warn('Grounding failed, retrying without it:', groundingError?.message)
    result = await callGemini(apiKey, question, imageBase64, imageMimeType, false)
  }

  const responseText = result.response.text().trim()
  const parsed = extractJSON(responseText)

  if (parsed && typeof parsed.answer === 'string' && typeof parsed.confidence === 'number') {
    parsed.confidence = Math.max(0, Math.min(100, parsed.confidence))
    if (groundingSources.length > 0) {
      parsed.sources = groundingSources
    } else if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
      parsed.sources = ['Gemini AI']
    }
    return parsed
  }

  return buildFallbackResponse(responseText, groundingSources)
}
