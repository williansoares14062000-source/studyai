import { NextRequest, NextResponse } from 'next/server'
import { queryGemini } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { question, imageBase64, imageMimeType, apiKey } = body

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key do Gemini não configurada' },
        { status: 400 }
      )
    }

    if (!question && !imageBase64) {
      return NextResponse.json(
        { error: 'Envie uma pergunta ou imagem' },
        { status: 400 }
      )
    }

    const response = await queryGemini(apiKey, question || '', imageBase64, imageMimeType)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Gemini API error:', error)

    if (error?.message?.includes('API_KEY_INVALID')) {
      return NextResponse.json(
        { error: 'API Key inválida. Verifique sua chave do Gemini.' },
        { status: 401 }
      )
    }

    if (error?.message?.includes('RATE_LIMIT')) {
      return NextResponse.json(
        { error: 'Limite de requisições atingido. Aguarde um momento.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao processar resposta. Tente novamente.' },
      { status: 500 }
    )
  }
}
