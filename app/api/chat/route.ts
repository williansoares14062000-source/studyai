import { NextRequest, NextResponse } from 'next/server'
import { queryGemini } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key do Gemini não configurada no servidor.' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { question, imageBase64, imageMimeType } = body

    if (!question && !imageBase64) {
      return NextResponse.json(
        { error: 'Envie uma pergunta ou imagem' },
        { status: 400 }
      )
    }

    const response = await queryGemini(apiKey, question || '', imageBase64, imageMimeType)

    return NextResponse.json(response)
  } catch (error: any) {
    const message = error?.message || String(error)
    console.error('Gemini API error:', message)

    if (message.includes('API_KEY_INVALID')) {
      return NextResponse.json({ error: 'API Key inválida.' }, { status: 401 })
    }
    if (message.includes('RATE_LIMIT') || message.includes('429')) {
      return NextResponse.json(
        { error: 'Limite de requisições atingido. Aguarde um momento.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: `Erro: ${message}` },
      { status: 500 }
    )
  }
}
