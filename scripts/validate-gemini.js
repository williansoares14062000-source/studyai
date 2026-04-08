#!/usr/bin/env node
// Validation script for Gemini API
// Usage: node scripts/validate-gemini.js YOUR_API_KEY

const apiKey = process.argv[2]

if (!apiKey) {
  console.error('Usage: node scripts/validate-gemini.js YOUR_API_KEY')
  process.exit(1)
}

const testQuestions = [
  {
    question: 'Qual é a capital do Brasil?',
    expectedKeyword: 'Brasília',
    minConfidence: 95,
  },
  {
    question: 'Quanto é 15 × 7?',
    expectedKeyword: '105',
    minConfidence: 99,
  },
  {
    question: 'Quem escreveu Dom Casmurro?',
    expectedKeyword: 'Machado',
    minConfidence: 90,
  },
]

async function testGemini() {
  console.log('Iniciando validação da API Gemini...\n')

  let passed = 0
  let failed = 0

  for (const test of testQuestions) {
    try {
      process.stdout.write(`Pergunta: "${test.question}" ... `)

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Responda em JSON com campos: answer, confidence (0-100), sources (array), confidence_label. Pergunta: ${test.question}`
              }]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        console.log(`FALHOU - Status ${response.status}: ${data.error?.message}`)
        failed++
        continue
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const answerOk = parsed.answer?.toLowerCase().includes(test.expectedKeyword.toLowerCase())
        const confidenceOk = parsed.confidence >= test.minConfidence

        if (answerOk && confidenceOk) {
          console.log(`PASSOU (${parsed.confidence}% confiança)`)
          console.log(`   Resposta: ${parsed.answer?.substring(0, 80)}...`)
          passed++
        } else {
          console.log(`PARCIAL - Confiança: ${parsed.confidence}%`)
          if (!answerOk) console.log(`   Esperado "${test.expectedKeyword}" na resposta`)
          failed++
        }
      } else {
        console.log(`Resposta sem JSON estruturado`)
        console.log(`   Raw: ${text.substring(0, 100)}`)
        failed++
      }
    } catch (err) {
      console.log(`ERRO: ${err.message}`)
      failed++
    }

    // Rate limit prevention
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log(`\nResultado: ${passed}/${testQuestions.length} testes passaram`)

  if (passed === testQuestions.length) {
    console.log('API Gemini validada com sucesso! Pronta para uso.')
    process.exit(0)
  } else {
    console.log('Alguns testes falharam. Verifique sua API Key.')
    process.exit(1)
  }
}

testGemini()
