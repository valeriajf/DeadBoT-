/**
 * Comando AFK - Versão com AFK individual por grupo (Aprimorada)
 * 
 * @author Val (DeadBoT)
 * @version 2.0
 */

const afkUsersByGroup = {};

const afkCommand = {
  name: "afk",
  description: "Marca você como ausente (Away From Keyboard)",
  commands: ["afk"],
  usage: "#afk [motivo]",
  
  handle: async (webMessage, params) => {
    try {
      // Suporte para diferentes formatos de parâmetros
      let socket, args, remoteJid, userJid;
      
      // Formato 1: params é um objeto commonFunctions (dynamicCommand)
      if (webMessage?.socket && webMessage?.webMessage) {
        socket = webMessage.socket;
        args = webMessage.args || [];
        const realWebMessage = webMessage.webMessage;
        remoteJid = realWebMessage.key.remoteJid;
        userJid = realWebMessage.key.participant || realWebMessage.key.remoteJid;
        webMessage = realWebMessage;
      }
      // Formato 2: params com socket direto (chamada direta)
      else if (params?.socket) {
        socket = params.socket;
        args = params.args || [];
        remoteJid = webMessage.key.remoteJid;
        userJid = webMessage.key.participant || webMessage.key.remoteJid;
      }
      // Formato 3: Erro - nenhum socket encontrado
      else {
        return;
      }
      
      if (!socket) {
        return;
      }

      const isGroup = remoteJid?.endsWith("@g.us");

      // Verifica se é grupo
      if (!isGroup) {
        await socket.sendMessage(remoteJid, {
          text: "❌ Este comando só funciona em grupos!"
        });
        return;
      }

      // Inicializa estrutura do grupo
      afkUsersByGroup[remoteJid] ??= {};

      // Verifica se usuário já está AFK no grupo (ignora silenciosamente)
      if (afkUsersByGroup[remoteJid][userJid]) {
        return;
      }

      // Processa motivo AFK
      const reason = args.length > 0 ? args.join(" ").trim() : "Sem motivo especificado";
      
      // Valida tamanho do motivo
      if (reason.length > 100) {
        await socket.sendMessage(remoteJid, {
          text: "❌ O motivo deve ter no máximo 100 caracteres!"
        });
        return;
      }
      
      // Salva dados AFK
      afkUsersByGroup[remoteJid][userJid] = {
        reason: reason,
        timestamp: new Date().toISOString(),
        startTime: Date.now(),
        groupName: remoteJid.split('@')[0]
      };
      
      // Formata data/hora
      const now = new Date();
      const timeString = now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
      const dateString = now.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
      });
      
      // Mensagem de confirmação aprimorada
      const message = `💤 @${userJid.split('@')[0]} está AFK desde ${dateString} às ${timeString}

💭 Motivo: ${reason}`;

      await socket.sendMessage(remoteJid, {
        text: message,
        mentions: [userJid]
      });

    } catch (error) {
      console.error("❌ Erro no comando AFK:", error.message);
    }
  },

  // Função auxiliar para verificar se usuário está AFK em grupo específico
  isAFK: (groupJid, userJid) => {
    return !!(afkUsersByGroup[groupJid]?.[userJid]);
  },

  // Função auxiliar para remover usuário do AFK de grupo específico
  removeAFK: (groupJid, userJid) => {
    const afkData = afkUsersByGroup[groupJid]?.[userJid];
    
    if (afkData) {
      delete afkUsersByGroup[groupJid][userJid];
      
      // Remove o grupo se estiver vazio
      if (Object.keys(afkUsersByGroup[groupJid]).length === 0) {
        delete afkUsersByGroup[groupJid];
      }
      
      return afkData;
    }
    
    return null;
  },

  // Função para obter dados AFK de grupo específico
  getAFKData: (groupJid, userJid) => {
    return afkUsersByGroup[groupJid]?.[userJid] || null;
  },

  // Função para limpar usuário que saiu do grupo
  removeUserFromGroup: (groupJid, userJid) => {
    if (afkUsersByGroup[groupJid]?.[userJid]) {
      delete afkUsersByGroup[groupJid][userJid];
      
      // Remove o grupo se estiver vazio
      if (Object.keys(afkUsersByGroup[groupJid]).length === 0) {
        delete afkUsersByGroup[groupJid];
      }
    }
  },

  // Função para formatar duração em horas:minutos:segundos (formato completo)
  formatDuration: (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Sempre formata com zero à esquerda (HH:MM:SS)
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  },

  // Função para listar usuários AFK no grupo
  listAFKUsers: (groupJid) => {
    const groupAFK = afkUsersByGroup[groupJid];
    if (!groupAFK || Object.keys(groupAFK).length === 0) {
      return null;
    }

    const afkList = Object.entries(groupAFK).map(([userJid, data]) => {
      const duration = afkCommand.formatDuration(Date.now() - data.startTime);
      return {
        user: userJid.split('@')[0],
        reason: data.reason,
        duration: duration,
        timestamp: data.timestamp
      };
    });

    return afkList;
  },

  // Função para limpar AFKs antigos (mais de 7 dias)
  cleanOldAFK: () => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [groupJid, users] of Object.entries(afkUsersByGroup)) {
      for (const [userJid, data] of Object.entries(users)) {
        if (data.startTime < sevenDaysAgo) {
          delete afkUsersByGroup[groupJid][userJid];
          cleanedCount++;
        }
      }
      
      // Remove grupo se ficou vazio
      if (Object.keys(afkUsersByGroup[groupJid]).length === 0) {
        delete afkUsersByGroup[groupJid];
      }
    }

    return cleanedCount;
  },

  // Função para estatísticas
  getStats: () => {
    const totalGroups = Object.keys(afkUsersByGroup).length;
    const totalAFKUsers = Object.values(afkUsersByGroup)
      .reduce((total, group) => total + Object.keys(group).length, 0);

    return {
      totalGroups,
      totalAFKUsers,
      groupsData: Object.entries(afkUsersByGroup).map(([groupJid, users]) => ({
        groupId: groupJid.split('@')[0],
        afkCount: Object.keys(users).length
      }))
    };
  }
};

// Timer para limpeza automática (executa a cada 24 horas)
setInterval(() => {
  afkCommand.cleanOldAFK();
}, 24 * 60 * 60 * 1000);

// Exporta usando module.exports padrão (compatível com CommonJS)
module.exports = afkCommand;