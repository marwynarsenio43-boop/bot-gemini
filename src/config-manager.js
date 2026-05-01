/**
 * ZapBot Cloud — Gestor de Configuração
 * Usa variáveis de ambiente (produção) ou ficheiro JSON (local)
 */

const fs   = require('fs-extra');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'config', 'settings.json');

const DEFAULTS = {
  // WhatsApp Business API
  waToken:     '',   // Token permanente do Meta
  waPhoneId:   '',   // Phone Number ID do Meta
  waAppId:     '',   // App ID do Meta
  waSecret:    '',   // App Secret do Meta
  verifyToken: 'zapbot_verify_2024', // Token de verificação do webhook (pode personalizar)

  // Gemini
  geminiKey:   '',
  geminiModel: 'gemini-2.0-flash',

  // Negócio
  bizName:   '',
  bizSector: '',
  bizDesc:   '',
  bizFaq:    '',

  // Persona
  agentName:  'Maria',
  agentLang:  'pt-mz',
  persona:    'amigavel',
  agentIntro: '',
  agentRules: '',
  agentClose: '',

  // Comportamento
  autoReply: true,
  memory:    true,
  typing:    true,
  escalate:  true,
  delay:     2000,

  // Templates
  templates: []
};

class ConfigManager {
  constructor() {
    this._data = { ...DEFAULTS };
    this._loadFromEnv();
    this._loadFromFile();
  }

  /** Carregar variáveis de ambiente (para produção no Render) */
  _loadFromEnv() {
    const envMap = {
      WA_TOKEN:      'waToken',
      WA_PHONE_ID:   'waPhoneId',
      WA_APP_ID:     'waAppId',
      WA_SECRET:     'waSecret',
      VERIFY_TOKEN:  'verifyToken',
      GEMINI_KEY:    'geminiKey',
      GEMINI_MODEL:  'geminiModel',
      BIZ_NAME:      'bizName',
      BIZ_DESC:      'bizDesc',
      BIZ_FAQ:       'bizFaq',
      AGENT_NAME:    'agentName',
      AGENT_PERSONA: 'persona'
    };
    for (const [env, key] of Object.entries(envMap)) {
      if (process.env[env]) this._data[key] = process.env[env];
    }
  }

  /** Carregar ficheiro JSON (para uso local) */
  _loadFromFile() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw    = fs.readFileSync(CONFIG_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        // Ficheiro não sobrescreve variáveis de ambiente
        for (const [k, v] of Object.entries(parsed)) {
          if (!process.env[this._envKey(k)]) {
            this._data[k] = v;
          }
        }
        console.log('📂 Configuração carregada do ficheiro.');
      }
    } catch (e) {
      console.warn('⚠️  Erro ao ler configuração:', e.message);
    }
  }

  _save() {
    try {
      fs.ensureDirSync(path.dirname(CONFIG_FILE));
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this._data, null, 2), 'utf8');
    } catch (e) {
      console.warn('⚠️  Não foi possível guardar configuração:', e.message);
    }
  }

  _envKey(k) {
    const map = { waToken:'WA_TOKEN', waPhoneId:'WA_PHONE_ID', geminiKey:'GEMINI_KEY' };
    return map[k] || '';
  }

  get(key)       { return this._data[key]; }
  getAll()       { return { ...this._data }; }
  set(key, val)  { this._data[key] = val; this._save(); }
  setAll(data)   { this._data = { ...this._data, ...data }; this._save(); }
  reset()        { this._data = { ...DEFAULTS }; this._save(); }
}

module.exports = new ConfigManager();
