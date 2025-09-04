/**
 * Sistema de gerenciamento AFK (Away From Keyboard)
 * Salve como: src/utils/afkSystem.js
 * 
 * @author Val (DeadBoT)
 */
const fs = require('fs');
const path = require('path');

const AFK_FILE = path.join(__dirname, '../../database/afk-users.json');

class AFKSystem {
  constructor() {
    this.afkUsers = this.loadAFKData();
    this.startAutoSave();
  }

  /**
   * Carrega dados AFK do arquivo
   */
  loadAFKData() {
    try {
      if (fs.existsSync(AFK_FILE)) {
        const data = fs.readFileSync(AFK_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("❌ [AFK] Erro ao carregar dados AFK:", error.message);
    }
    return {};
  }

  /**
   * Salva dados AFK no arquivo
   */
  saveAFKData() {
    try {
      const dbDir = path.dirname(AFK_FILE);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      fs.writeFileSync(AFK_FILE, JSON.stringify(this.afkUsers, null, 2));
    } catch (error) {
      console.error("❌ [AFK] Erro ao salvar dados AFK:", error.message);
    }
  }

  /**
   * Auto-save a cada 30 segundos
   */
  startAutoSave() {
    setInterval(() => {
      this.saveAFKData();
    }, 30000);
  }

  /**
   * Define um usuário como AFK
   */
  setAFK(userJid, reason = "Sem motivo especificado") {
    const now = new Date();
    
    this.afkUsers[userJid] = {
      reason: reason,
      timestamp: now.toISOString(),
      startTime: now.getTime(),
      isAFK: true
    };

    this.saveAFKData();
    return this.afkUsers[userJid];
  }

  /**
   * Remove um usuário do AFK
   */
  removeAFK(userJid) {
    if (this.afkUsers[userJid]) {
      const afkData = { ...this.afkUsers[userJid] };
      delete this.afkUsers[userJid];
      this.saveAFKData();
      return afkData;
    }
    return null;
  }

  /**
   * Verifica se um usuário está AFK
   */
  isAFK(userJid) {
    return this.afkUsers[userJid] && this.afkUsers[userJid].isAFK;
  }

  /**
   * Obtém dados AFK de um usuário
   */
  getAFKData(userJid) {
    return this.afkUsers[userJid] || null;
  }

  /**
   * Calcula a duração do AFK
   */
  getAFKDuration(userJid) {
    const afkData = this.getAFKData(userJid);
    if (!afkData) return null;

    const now = new Date().getTime();
    const duration = now - afkData.startTime;
    
    return this.formatDuration(duration);
  }

  /**
   * Formata duração em texto legível
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const remainingHours = hours % 24;
      const remainingMinutes = minutes % 60;
      return `${days}d ${remainingHours}h ${remainingMinutes}m`;
    } else if (hours > 0) {
      const remainingMinutes = minutes % 60;
      const remainingSeconds = seconds % 60;
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Lista todos os usuários AFK
   */
  getAllAFKUsers() {
    return Object.keys(this.afkUsers).filter(userJid => this.afkUsers[userJid].isAFK);
  }

  /**
   * Limpa usuários AFK há mais de X dias
   */
  cleanupOldAFK(daysOld = 7) {
    const cutoffTime = new Date().getTime() - (daysOld * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    Object.keys(this.afkUsers).forEach(userJid => {
      if (this.afkUsers[userJid].startTime < cutoffTime) {
        delete this.afkUsers[userJid];
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.saveAFKData();
      console.log(`🧹 [AFK] Limpou ${cleaned} usuários AFK antigos`);
    }

    return cleaned;
  }

  /**
   * Obtém estatísticas do sistema AFK
   */
  getStats() {
    const totalAFK = this.getAllAFKUsers().length;
    const allUsers = Object.keys(this.afkUsers).length;
    
    return {
      totalAFK,
      totalUsers: allUsers,
      totalReturned: allUsers - totalAFK
    };
  }
}

// Instância única do sistema AFK
const afkSystem = new AFKSystem();

// Limpeza automática uma vez por dia
setInterval(() => {
  afkSystem.cleanupOldAFK(7); // Remove AFKs de 7+ dias
}, 24 * 60 * 60 * 1000); // 24 horas

// Salva dados ao encerrar o processo
process.on('SIGINT', () => {
  console.log('\n💤 [AFK] Salvando dados AFK antes de sair...');
  afkSystem.saveAFKData();
  process.exit(0);
});

process.on('SIGTERM', () => {
  afkSystem.saveAFKData();
  process.exit(0);
});

module.exports = afkSystem;