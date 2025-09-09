/**
 * Comando AFK - Versão com AFK individual por grupo
 * Substitua COMPLETAMENTE o arquivo src/commands/member/afk.js
 * 
 * @author Val (DeadBoT)
 */

// Sistema AFK por grupo (em memória)
// Estrutura: { "groupId": { "userId": { dados } } }
const afkUsersByGroup = {};

const afkCommand = {
  name: "afk",
  description: "Marca você como ausente (Away From Keyboard)",
  commands: ["afk"],
  usage: "#afk [motivo]",
  
  handle: async (webMessage, params) => {
    try {
      // Se params existe e tem socket, processa
      if (!params || !params.socket) {
        console.log("Parâmetros inválidos - ignorando execução duplicada");
        return;
      }

      const { socket, args = [] } = params;
      const remoteJid = webMessage.key.remoteJid;
      const userJid = webMessage.key.participant || webMessage.key.remoteJid;
      const isGroup = remoteJid?.endsWith("@g.us");

      if (!isGroup) {
        await socket.sendMessage(remoteJid, {
          text: "Este comando só funciona em grupos!"
        });
        return;
      }

      // Inicializa o grupo se não existir
      if (!afkUsersByGroup[remoteJid]) {
        afkUsersByGroup[remoteJid] = {};
      }

      // Verifica se o usuário já está AFK NESTE GRUPO para evitar spam
      if (afkUsersByGroup[remoteJid][userJid]) {
        console.log("Usuário já está AFK neste grupo, ignorando comando duplicado");
        return;
      }

      // Sistema AFK por grupo
      const reason = args.length > 0 ? args.join(" ") : "Sem motivo especificado";
      
      // Salva no grupo específico
      afkUsersByGroup[remoteJid][userJid] = {
        reason: reason,
        timestamp: new Date().toISOString(),
        startTime: Date.now()
      };
      
      // Formata data/hora atual
      const now = new Date();
      const timeString = now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      const dateString = now.toLocaleDateString('pt-BR');
      
      // Mensagem de confirmação
      const message = `💤 @${userJid.split('@')[0]} está AFK desde ${dateString} às ${timeString}.

💭 Motivo: ${reason}`;

      await socket.sendMessage(remoteJid, {
        text: message,
        mentions: [userJid]
      });

      console.log(`Comando AFK executado para ${userJid.split('@')[0]} no grupo ${remoteJid.split('@')[0]}`);

    } catch (error) {
      console.error("Erro no comando AFK:", error.message);
    }
  },

  // Função auxiliar para verificar se usuário está AFK em grupo específico
  isAFK: (groupJid, userJid) => {
    return !!(afkUsersByGroup[groupJid] && afkUsersByGroup[groupJid][userJid]);
  },

  // Função auxiliar para remover usuário do AFK de grupo específico
  removeAFK: (groupJid, userJid) => {
    if (afkUsersByGroup[groupJid] && afkUsersByGroup[groupJid][userJid]) {
      const afkData = afkUsersByGroup[groupJid][userJid];
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
    if (afkUsersByGroup[groupJid]) {
      return afkUsersByGroup[groupJid][userJid];
    }
    return null;
  },

  // Função para limpar usuário que saiu do grupo
  removeUserFromGroup: (groupJid, userJid) => {
    if (afkUsersByGroup[groupJid] && afkUsersByGroup[groupJid][userJid]) {
      delete afkUsersByGroup[groupJid][userJid];
      
      // Remove o grupo se estiver vazio
      if (Object.keys(afkUsersByGroup[groupJid]).length === 0) {
        delete afkUsersByGroup[groupJid];
      }
    }
  }
};

// Exporta usando module.exports padrão (compatível com CommonJS)
module.exports = afkCommand;