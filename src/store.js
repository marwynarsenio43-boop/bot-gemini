/**
 * ZapBot Cloud — Store de Dados
 * Guarda conversas e estatísticas em memória
 */

// { [phoneNumber]: [ {role, content, name, ts} ] }
const histories = {};

// [ {from, name, text, reply, elapsed, ts} ]
const stats = [];

// Guardar no máximo 50 mensagens por conversa
const MAX_HISTORY = 50;
// Guardar no máximo 500 registos de stats
const MAX_STATS = 500;

function getHistory(from) {
  return histories[from] || [];
}

function addMessage(from, message) {
  if (!histories[from]) histories[from] = [];
  histories[from].push({ ...message, ts: Date.now() });
  if (histories[from].length > MAX_HISTORY) {
    histories[from] = histories[from].slice(-MAX_HISTORY);
  }
}

function clearHistory(from) {
  delete histories[from];
}

function addStat(stat) {
  stats.unshift(stat);
  if (stats.length > MAX_STATS) stats.splice(MAX_STATS);
}

function getStats() {
  const total    = stats.length;
  const avgMs    = total ? Math.round(stats.reduce((a, s) => a + s.elapsed, 0) / total) : 0;
  const convs    = Object.keys(histories).length;
  const last24h  = stats.filter(s => Date.now() - s.ts < 86400000).length;

  return {
    totalMessages:   total,
    last24h,
    avgResponseMs:   avgMs,
    activeConvs:     convs,
    recentActivity:  stats.slice(0, 10).map(s => ({
      name:    s.name,
      preview: s.text.substring(0, 60),
      ts:      s.ts,
      elapsed: s.elapsed
    }))
  };
}

function getConversations() {
  return Object.entries(histories).map(([from, msgs]) => {
    const last = msgs[msgs.length - 1];
    const first = msgs.find(m => m.name);
    return {
      from,
      name:     first?.name || from,
      msgCount: msgs.length,
      lastMsg:  last?.ts || 0,
      preview:  last?.content?.substring(0, 80) || ''
    };
  }).sort((a, b) => b.lastMsg - a.lastMsg).slice(0, 50);
}

module.exports = { getHistory, addMessage, clearHistory, addStat, getStats, getConversations };
