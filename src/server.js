/**
 * ZapBot Cloud — Servidor Principal
 * WhatsApp Business Cloud API + Google Gemini
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const whatsapp = require('./whatsapp');
const gemini   = require('./gemini');
const config   = require('./config-manager');
const store    = require('./store');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─────────────────────────────────────────────────────────────
//  WEBHOOK — WhatsApp envia mensagens aqui
// ─────────────────────────────────────────────────────────────

/** Verificação do webhook (Meta exige este passo na configuração) */
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const cfg       = config.getAll();

  if (mode === 'subscribe' && token === cfg.verifyToken) {
    console.log('✅ Webhook verificado pela Meta!');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Token de verificação inválido.');
    res.sendStatus(403);
  }
});

/** Receber mensagens do WhatsApp */
app.post('/webhook', async (req, res) => {
  // Responder 200 imediatamente (Meta exige resposta rápida)
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entry   = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;
    const msg     = value?.messages?.[0];

    if (!msg) return; // Pode ser status de entrega, ignorar

    const from    = msg.from; // número do cliente ex: 258841234567
    const msgType = msg.type;
    const cfg     = config.getAll();

    // Só processar mensagens de texto por enquanto
    if (msgType !== 'text') {
      // Responder que só processa texto
      await whatsapp.sendMessage(from, '👋 Olá! Por enquanto só consigo responder a mensagens de texto. Escreva a sua dúvida! 😊');
      return;
    }

    const text    = msg.text.body.trim();
    const contact = value?.contacts?.[0];
    const name    = contact?.profile?.name || from;

    console.log(`📨 Mensagem de ${name} (${from}): "${text.substring(0, 80)}"`);

    if (!cfg.geminiKey || !cfg.waToken || !cfg.waPhoneId) {
      console.error('❌ Configuração incompleta. Verifique as variáveis.');
      return;
    }

    if (!cfg.autoReply) return;

    // Indicador "a escrever..."
    if (cfg.typing) {
      await whatsapp.sendTyping(from);
    }

    // Buscar histórico desta conversa
    const history = cfg.memory ? store.getHistory(from) : [];

    // Atraso humanizado
    const delay = parseInt(cfg.delay) || 2000;
    await sleep(delay + Math.random() * 800);

    // Gerar resposta com Gemini
    const t0 = Date.now();
    const reply = await gemini.chat(text, history, name, cfg);
    const elapsed = Date.now() - t0;

    // Guardar no histórico
    store.addMessage(from, { role: 'user',  content: text,  name });
    store.addMessage(from, { role: 'model', content: reply, name: cfg.agentName || 'Agente' });

    // Guardar estatísticas
    store.addStat({ from, name, text, reply, elapsed, ts: Date.now() });

    // Enviar resposta
    await whatsapp.sendMessage(from, reply);
    console.log(`✅ Respondido a ${name} em ${elapsed}ms`);

  } catch (err) {
    console.error('❌ Erro ao processar mensagem:', err.message);
  }
});

// ─────────────────────────────────────────────────────────────
//  API REST — Painel de controlo
// ─────────────────────────────────────────────────────────────

app.get('/api/config', (req, res) => {
  const cfg = config.getAll();
  // Não enviar tokens completos ao painel por segurança
  res.json({
    ...cfg,
    waToken:   cfg.waToken   ? '***' + cfg.waToken.slice(-6)   : '',
    geminiKey: cfg.geminiKey ? '***' + cfg.geminiKey.slice(-6) : '',
    waSecret:  cfg.waSecret  ? '***' + cfg.waSecret.slice(-4)  : ''
  });
});

app.post('/api/config', (req, res) => {
  try {
    // Não sobrescrever tokens mascarados
    const body = { ...req.body };
    const current = config.getAll();
    if (body.waToken   && body.waToken.startsWith('***'))   body.waToken   = current.waToken;
    if (body.geminiKey && body.geminiKey.startsWith('***')) body.geminiKey = current.geminiKey;
    if (body.waSecret  && body.waSecret.startsWith('***'))  body.waSecret  = current.waSecret;

    config.setAll(body);
    res.json({ ok: true, message: 'Configuração guardada com sucesso.' });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

app.post('/api/gemini/test', async (req, res) => {
  try {
    const cfg = config.getAll();
    const key = req.body.key && !req.body.key.startsWith('***') ? req.body.key : cfg.geminiKey;
    const reply = await gemini.test(key, req.body.model || cfg.geminiModel);
    res.json({ ok: true, reply });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

app.post('/api/chat/test', async (req, res) => {
  try {
    const cfg = config.getAll();
    const { message, history } = req.body;
    const reply = await gemini.chat(message, history || [], 'Cliente Teste', cfg);
    res.json({ ok: true, reply });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

app.get('/api/stats', (req, res) => {
  res.json(store.getStats());
});

app.get('/api/conversations', (req, res) => {
  res.json(store.getConversations());
});

app.get('/api/conversation/:from', (req, res) => {
  res.json(store.getHistory(req.params.from));
});

app.post('/api/send', async (req, res) => {
  try {
    const { number, message } = req.body;
    await whatsapp.sendMessage(number, message);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// Health check para o Render não adormecer
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🤖 ZapBot Cloud em execução na porta ${PORT}`);
  console.log(`🌐 Painel: http://localhost:${PORT}\n`);
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
