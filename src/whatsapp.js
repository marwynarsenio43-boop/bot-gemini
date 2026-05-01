/**
 * ZapBot Cloud — Serviço WhatsApp Business Cloud API
 * Envia mensagens via API oficial do Meta (sem Chrome/Puppeteer)
 */

const axios  = require('axios');
const config = require('./config-manager');

const BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * Enviar mensagem de texto
 */
async function sendMessage(to, text) {
  const cfg = config.getAll();
  if (!cfg.waToken || !cfg.waPhoneId) {
    throw new Error('WhatsApp Token ou Phone ID não configurados.');
  }

  // Quebrar mensagens muito longas em partes (WhatsApp tem limite de 4096 chars)
  const parts = splitMessage(text, 4000);

  for (const part of parts) {
    await axios.post(
      `${BASE_URL}/${cfg.waPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to,
        type: 'text',
        text: { body: part, preview_url: false }
      },
      {
        headers: {
          'Authorization': `Bearer ${cfg.waToken}`,
          'Content-Type':  'application/json'
        }
      }
    );

    // Pequena pausa entre partes
    if (parts.length > 1) await sleep(500);
  }
}

/**
 * Enviar indicador "a escrever..." (read receipt + typing)
 */
async function sendTyping(to) {
  const cfg = config.getAll();
  if (!cfg.waToken || !cfg.waPhoneId) return;

  try {
    // Marcar como lida
    await axios.post(
      `${BASE_URL}/${cfg.waPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        status:  'read',
        message_id: 'placeholder'
      },
      { headers: { 'Authorization': `Bearer ${cfg.waToken}`, 'Content-Type': 'application/json' } }
    );
  } catch (_) {
    // Ignorar erros do typing — não é crítico
  }
}

/**
 * Enviar template de boas-vindas (opcional)
 */
async function sendTemplate(to, templateName, langCode = 'pt_BR') {
  const cfg = config.getAll();
  await axios.post(
    `${BASE_URL}/${cfg.waPhoneId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name:     templateName,
        language: { code: langCode }
      }
    },
    { headers: { 'Authorization': `Bearer ${cfg.waToken}`, 'Content-Type': 'application/json' } }
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const parts = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      parts.push(remaining);
      break;
    }
    // Cortar num ponto final ou parágrafo
    let cut = remaining.lastIndexOf('\n', maxLen);
    if (cut < maxLen * 0.5) cut = remaining.lastIndexOf('. ', maxLen);
    if (cut < maxLen * 0.5) cut = maxLen;
    parts.push(remaining.substring(0, cut + 1).trim());
    remaining = remaining.substring(cut + 1).trim();
  }
  return parts;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { sendMessage, sendTyping, sendTemplate };
