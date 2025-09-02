/**
 * Sistema de Rastreamento de Atividade Melhorado
 * Agora também captura e armazena nomes dos usuários
 * 
 * Substitua o arquivo: src/utils/activityTracker.js
 * 
 * @author Val (DeadBoT)
 */
const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, '../../database/activity-stats.json');

class ActivityTracker {
  constructor() {
    this.stats = this.loadStats();
    this.lastSave = Date.now();
    this.startAutoSave();
  }

  /**
   * Carrega as estatísticas do arquivo
   */
  loadStats() {
    try {
      if (fs.existsSync(STATS_FILE)) {
        const data = fs.readFileSync(STATS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("❌ [ACTIVITY] Erro ao carregar estatísticas:", error.message);
    }
    return {};
  }

  /**
   * Salva as estatísticas no arquivo
   */
  saveStats() {
    try {
      const dbDir = path.dirname(STATS_FILE);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      fs.writeFileSync(STATS_FILE, JSON.stringify(this.stats, null, 2));
      this.lastSave = Date.now();
    } catch (error) {
      console.error("❌ [ACTIVITY] Erro ao salvar estatísticas:", error.message);
    }
  }

  /**
   * Auto-save a cada 30 segundos se houver mudanças
   */
  startAutoSave() {
    setInterval(() => {
      if (Date.now() - this.lastSave > 30000) { // 30 segundos
        this.saveStats();
      }
    }, 30000);
  }

  /**
   * Inicializa as estatísticas de um usuário
   */
  initUserStats(groupJid, userJid, userName = null) {
    if (!this.stats[groupJid]) {
      this.stats[groupJid] = {};
    }
    
    if (!this.stats[groupJid][userJid]) {
      this.stats[groupJid][userJid] = {
        messages: 0,
        stickers: 0,
        lastActivity: new Date().toISOString(),
        joinDate: new Date().toISOString(),
        displayName: null,
        lastKnownName: null
      };
    }

    // Atualiza o nome se foi fornecido e é válido
    if (userName && typeof userName === 'string' && 
        userName.trim().length > 0 && !userName.match(/^\+?\d+$/)) {
      this.stats[groupJid][userJid].displayName = userName.trim();
      this.stats[groupJid][userJid].lastKnownName = userName.trim();
    }
  }

  /**
   * Registra uma mensagem de texto e captura o nome
   */
  trackMessage(groupJid, userJid, userName = null) {
    if (!groupJid || !userJid) return;

    this.initUserStats(groupJid, userJid, userName);
    this.stats[groupJid][userJid].messages++;
    this.stats[groupJid][userJid].lastActivity = new Date().toISOString();
  }

  /**
   * Registra uma figurinha e captura o nome
   */
  trackSticker(groupJid, userJid, userName = null) {
    if (!groupJid || !userJid) return;

    this.initUserStats(groupJid, userJid, userName);
    this.stats[groupJid][userJid].stickers++;
    this.stats[groupJid][userJid].lastActivity = new Date().toISOString();
  }

  /**
   * Atualiza apenas o nome do usuário
   */
  updateUserName(groupJid, userJid, userName) {
    if (!groupJid || !userJid || !userName) return;
    
    this.initUserStats(groupJid, userJid);
    
    if (typeof userName === 'string' && userName.trim().length > 0 && 
        !userName.match(/^\+?\d+$/)) {
      this.stats[groupJid][userJid].displayName = userName.trim();
      this.stats[groupJid][userJid].lastKnownName = userName.trim();
    }
  }

  /**
   * Remove um usuário das estatísticas
   */
  removeUser(groupJid, userJid) {
    if (this.stats[groupJid] && this.stats[groupJid][userJid]) {
      delete this.stats[groupJid][userJid];
      this.saveStats(); // Salva imediatamente quando remove usuário
    }
  }

  /**
   * Obtém as estatísticas de um usuário
   */
  getUserStats(groupJid, userJid) {
    if (!this.stats[groupJid] || !this.stats[groupJid][userJid]) {
      return { messages: 0, stickers: 0, total: 0, displayName: null };
    }

    const userStats = this.stats[groupJid][userJid];
    return {
      messages: userStats.messages || 0,
      stickers: userStats.stickers || 0,
      total: (userStats.messages || 0) + (userStats.stickers || 0),
      lastActivity: userStats.lastActivity,
      joinDate: userStats.joinDate,
      displayName: userStats.displayName || userStats.lastKnownName,
      lastKnownName: userStats.lastKnownName
    };
  }

  /**
   * Obtém as estatísticas de um grupo
   */
  getGroupStats(groupJid) {
    return this.stats[groupJid] || {};
  }

  /**
   * Obtém os usuários mais ativos com seus nomes salvos
   */
  getTopUsers(groupJid, limit = 5) {
    const groupStats = this.getGroupStats(groupJid);
    
    const users = Object.entries(groupStats).map(([userJid, stats]) => ({
      userJid,
      messages: stats.messages || 0,
      stickers: stats.stickers || 0,
      total: (stats.messages || 0) + (stats.stickers || 0),
      lastActivity: stats.lastActivity,
      displayName: stats.displayName || stats.lastKnownName,
      lastKnownName: stats.lastKnownName
    }));

    return users
      .filter(user => user.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  /**
   * Obtém estatísticas gerais
   */
  getGeneralStats() {
    let totalGroups = 0;
    let totalUsers = 0;
    let totalMessages = 0;
    let totalStickers = 0;

    Object.keys(this.stats).forEach(groupJid => {
      totalGroups++;
      Object.keys(this.stats[groupJid]).forEach(userJid => {
        totalUsers++;
        totalMessages += this.stats[groupJid][userJid].messages || 0;
        totalStickers += this.stats[groupJid][userJid].stickers || 0;
      });
    });

    return {
      totalGroups,
      totalUsers,
      totalMessages,
      totalStickers,
      totalInteractions: totalMessages + totalStickers
    };
  }

  /**
   * Obtém nome formatado para exibição
   */
  getDisplayName(groupJid, userJid) {
    const userStats = this.getUserStats(groupJid, userJid);
    
    if (userStats.displayName) {
      return userStats.displayName;
    }
    
    // Formata o número de telefone
    const phoneNumber = userJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    
    if (phoneNumber.startsWith('55') && phoneNumber.length >= 12) {
      const ddd = phoneNumber.slice(2, 4);
      const firstPart = phoneNumber.slice(4, 9);
      const lastPart = phoneNumber.slice(9);
      return `📱 (${ddd}) ${firstPart}-${lastPart}`;
    }
    
    return `📱 +${phoneNumber}`;
  }
}

// Instância única do tracker
const activityTracker = new ActivityTracker();

// Salva os dados quando o processo termina
process.on('SIGINT', () => {
  console.log('\n📊 [ACTIVITY] Salvando dados antes de sair...');
  activityTracker.saveStats();
  process.exit(0);
});

process.on('SIGTERM', () => {
  activityTracker.saveStats();
  process.exit(0);
});

module.exports = activityTracker;