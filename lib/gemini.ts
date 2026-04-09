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

function fixUnescapedNewlines(jsonStr: string): string {
  // Replace literal newlines inside JSON string values with \n
  let result = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i]
    if (escaped) {
      result += ch
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      result += ch
      continue
    }
    if (ch === '"') {
      inString = !inString
      result += ch
      continue
    }
    if (inString && (ch === '\n' || ch === '\r')) {
      result += ch === '\n' ? '\\n' : '\\r'
      continue
    }
    result += ch
  }
  return result
}

function extractJSON(text: string): GeminiResponse | null {
  const cleaned = cleanResponseText(text)

  // Try direct parse
  try {
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {}

  // Fix unescaped newlines inside strings, then retry
  try {
    const fixed = fixUnescapedNewlines(cleaned)
    const parsed = JSON.parse(fixed)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {}

  // Extract the { ... } block and try again
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {}
    try {
      const fixed = fixUnescapedNewlines(jsonMatch[0])
      return JSON.parse(fixed)
    } catch {}
  }

  // Last resort: extract fields individually via regex
  try {
    const getString = (key: string) => {
      const m = text.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"|\\s*\\})`))
      return m ? m[1].replace(/\\n/g, '\n') : ''
    }
    const getNumber = (key: string) => {
      const m = text.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`))
      return m ? parseInt(m[1]) : null
    }
    const getArray = (key: string) => {
      const m = text.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`))
      if (!m) return []
      return m[1].match(/"([^"]+)"/g)?.map(s => s.slice(1, -1)) ?? []
    }
    const getBool = (key: string) => {
      const m = text.match(new RegExp(`"${key}"\\s*:\\s*(true|false)`))
      return m ? m[1] === 'true' : false
    }

    const answer = getString('answer')
    const confidence = getNumber('confidence')
    if (answer && confidence !== null) {
      return {
        short_answer: getString('short_answer') || undefined,
        answer,
        confidence,
        sources: getArray('sources'),
        confidence_label: getString('confidence_label'),
        has_image_analysis: getBool('has_image_analysis'),
      }
    }
  } catch {}

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
