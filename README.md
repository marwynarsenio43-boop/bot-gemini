# 🤖 ZapBot Cloud — Agente WhatsApp com Google Gemini

Agente de IA humanizado para atendimento automático no WhatsApp,
usando a **API Oficial do Meta** + **Google Gemini**.
Funciona 24h no servidor gratuito do Render — sem precisar de computador ligado.

---

## 📁 Estrutura do Projecto

```
zapbot-cloud/
├── src/
│   ├── server.js          → Servidor Express (webhook + API REST)
│   ├── whatsapp.js        → Envio de mensagens via API Meta
│   ├── gemini.js          → Integração Google Gemini
│   ├── config-manager.js  → Gestão de configurações
│   └── store.js           → Histórico de conversas em memória
├── public/
│   └── index.html         → Painel de controlo (mobile-first)
├── config/                → Criado automaticamente
├── package.json
├── render.yaml            → Configuração do Render
├── .env.example           → Exemplo de variáveis de ambiente
└── .gitignore
```

---

## 🚀 Guia Completo de Deploy

### PARTE 1 — Colocar o servidor online (Render.com)

#### Passo 1 — GitHub
1. Crie conta em https://github.com
2. Clique **+** → **New repository**
3. Nome: `zapbot-cloud` → **Create repository**
4. Clique **uploading an existing file**
5. Arraste TODOS os ficheiros do zip extraído
6. Clique **Commit changes**

#### Passo 2 — Render
1. Aceda a https://render.com
2. **Get Started** → Entre com GitHub
3. **New +** → **Web Service**
4. Selecione o repositório `zapbot-cloud`
5. Preencha:
   - Name: `zapbot-cloud`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**
6. Em **Environment Variables** adicione (por agora só estas duas):
   - `GEMINI_KEY` = a sua chave Gemini
   - `VERIFY_TOKEN` = `zapbot_verify_2024`
7. Clique **Create Web Service**
8. Aguarde 2-3 minutos → URL gerado: `https://zapbot-cloud.onrender.com`

---

### PARTE 2 — WhatsApp Business API (Meta)

#### Passo 1 — Criar App no Meta
1. Aceda a https://developers.facebook.com
2. Entre com o Facebook
3. **My Apps** → **Create App**
4. Tipo: **Business** → Next
5. Nome: `ZapBot` → **Create App**

#### Passo 2 — Adicionar WhatsApp
1. No painel da App, procure **WhatsApp** → **Set up**
2. Siga as instruções para adicionar o seu número comercial
3. Em **API Setup** encontrará:
   - **Temporary access token** (para testes — válido 24h)
   - **Phone Number ID** — copie este número

#### Passo 3 — Configurar o Webhook
1. Vá a **WhatsApp** → **Configuration** → **Webhook**
2. Clique **Edit**
3. Preencha:
   - Callback URL: `https://zapbot-cloud.onrender.com/webhook`
   - Verify Token: `zapbot_verify_2024`
4. Clique **Verify and Save**
5. Em **Webhook fields** → subscreva **messages** → **Apply**

#### Passo 4 — Adicionar tokens ao Render
Volte ao Render → **Environment Variables** e adicione:
- `WA_TOKEN` = o token do Meta
- `WA_PHONE_ID` = o Phone Number ID

Clique **Save Changes** — o Render faz redeploy automático.

---

### PARTE 3 — Configurar o Agente

1. Abra o painel: `https://zapbot-cloud.onrender.com`
2. Aba **⚙️ Configurar**:
   - Cole a Chave Gemini
   - Cole o WA Token e Phone Number ID
   - Preencha o nome e descrição do negócio
   - Clique **Guardar Tudo**
3. Aba **🧠 Persona**:
   - Escolha o estilo de comunicação
   - Defina o nome do agente
   - Personalize as respostas
   - Clique **Guardar Persona**
4. Aba **💬 Testar**:
   - Teste as respostas antes de activar
5. ✅ Envie uma mensagem WhatsApp para o número configurado!

---

## 💡 Dicas Importantes

### Servidor não adormece (UptimeRobot)
O Render gratuito adormece após 15min. Para evitar:
1. Crie conta gratuita em https://uptimerobot.com
2. **New Monitor** → **HTTP(s)**
3. URL: `https://zapbot-cloud.onrender.com/health`
4. Interval: **5 minutes**
5. **Create Monitor**

### Token Permanente (para produção)
O token temporário expira em 24h. Para token permanente:
1. No Meta Business Suite → **System Users**
2. Crie um System User
3. Gere token com permissão `whatsapp_business_messaging`

### Limites da API Gratuita
- **1000 conversas/mês** gratuitamente
- Cada conversa = 24h de mensagens com o mesmo cliente
- Acima disso, paga por conversa (muito barato)

---

## 🔧 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env
# Editar .env com as suas chaves

# Iniciar em modo desenvolvimento
npm run dev

# Abrir painel
http://localhost:3000
```

Para testar o webhook localmente, use o [ngrok](https://ngrok.com):
```bash
ngrok http 3000
# Use o URL gerado como Callback URL no Meta
```
