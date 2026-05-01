/**
 * ZapBot Cloud — Serviço Google Gemini
 * Gera respostas humanizadas para os clientes
 */

const axios = require('axios');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Chat principal — gera resposta para uma mensagem
 */
async function chat(userMessage, history = [], contactName = '', cfg = {}) {
  const key   = cfg.geminiKey;
  const model = cfg.geminiModel || 'gemini-2.0-flash';

  if (!key) throw new Error('Chave Gemini não configurada.');

  const systemPrompt = buildSystemPrompt(cfg, contactName);

  // Construir histórico no formato Gemini
  const contents = [];

  if (cfg.memory && history.length > 0) {
    const maxHistory = 20; // limitar para não exceder tokens
    const recent = history.slice(-maxHistory);
    for (const h of recent) {
      contents.push({
        role:  h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    }
  }

  // Mensagem actual
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature:     0.88,
      maxOutputTokens: 450,
      topP:            0.95,
      topK:            40
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
    ]
  };

  const url = `${GEMINI_BASE}/${model}:generateContent?key=${key}`;
  const res = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 25000
  });

  const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini não retornou resposta.');
  return text.trim();
}

/**
 * Testar chave API
 */
async function test(key, model = 'gemini-2.0-flash') {
  const url  = `${GEMINI_BASE}/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Responde apenas: Chave válida!' }] }],
    generationConfig: { maxOutputTokens: 20 }
  };
  const res = await axios.post(url, body, { timeout: 10000 });
  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
}

// ─── System Prompt ────────────────────────────────────────────

function buildSystemPrompt(cfg, contactName = '') {
  const personaMap = {
    amigavel:     'És muito amigável, calorosa e atenciosa. Usas linguagem próxima e emojis com moderação. Tratas o cliente pelo nome sempre que possível.',
    profissional: 'És profissional, objectiva e concisa. Manténs formalidade sem seres fria. Focas em soluções práticas.',
    descontraido: 'És descontraída e casual. Usas linguagem do dia-a-dia moçambicano. Crias uma atmosfera relaxante.',
    formal:       'És muito formal e respeitosa. Usas Senhor/Senhora. Linguagem cuidada e estruturada.',
    animado:      'És entusiástica e energética! Usas emojis e exclamações. Transmites energia positiva!',
    cuidadoso:    'És empática e paciente. Ouves bem, validas sentimentos e nunca apressas o cliente.'
  };

  const persona  = personaMap[cfg.persona] || personaMap.amigavel;
  const name     = cfg.agentName  || 'Assistente';
  const biz      = cfg.bizName    || 'a empresa';
  const desc     = cfg.bizDesc    || '';
  const faq      = cfg.bizFaq     || '';
  const rules    = cfg.agentRules || '';
  const intro    = cfg.agentIntro || '';
  const closing  = cfg.agentClose || '';
  const client   = contactName ? `O nome do cliente nesta conversa é "${contactName}".` : '';

  return `És ${name}, uma assistente virtual humanizada que atende clientes de "${biz}" via WhatsApp.
${client}

PERSONALIDADE:
${persona}

${desc   ? `SOBRE O NEGÓCIO:\n${desc}\n`                    : ''}
${faq    ? `INFORMAÇÕES IMPORTANTES / FAQ:\n${faq}\n`        : ''}
${intro  ? `APRESENTAÇÃO INICIAL:\n${intro}\n`               : ''}
${rules  ? `REGRAS DE COMPORTAMENTO:\n${rules}\n`            : ''}
${closing? `MENSAGEM DE ENCERRAMENTO:\n${closing}\n`         : ''}

INSTRUÇÕES OBRIGATÓRIAS — SEGUE SEMPRE:
1. Responde em português de Moçambique. Vocabulário local e natural.
2. NUNCA digas que és uma IA, chatbot ou programa. Se perguntarem, diz que és assistente.
3. Respostas curtas: 2-4 frases no máximo. Só dá mais detalhe se o cliente pedir.
4. Usa o nome do cliente quando souberes — torna a conversa mais pessoal.
5. Se não souberes a resposta: "Deixa-me verificar essa informação e já te respondo 😊"
6. NUNCA inventes preços, datas ou informações não fornecidas acima.
7. Após resolver um assunto, pergunta: "Posso ajudar em mais alguma coisa?"
8. Em reclamações: primeiro pede desculpa e mostra empatia, depois dá solução.
9. Frases curtas — funciona melhor no WhatsApp. Evita parágrafos longos.
10. Nunca uses linguagem ofensiva ou inapropriada.`;
}

module.exports = { chat, test };
