/**
 * Comando Voltei - Versão limpa sem problemas de módulos
 * Crie/substitua o arquivo src/commands/member/voltei.js
 * 
 * @author Val (DeadBoT)
 */

const volteiCommand = {
  name: "voltei",
  description: "Remove você do status AFK",
  commands: ["voltei", "back"],
  usage: "#voltei",
  
  handle: async (webMessage, params) => {
    try {
      if (!params || !params.socket) {
        console.log("Parâmetros inválidos para comando voltei");
        return;
      }

      const { socket } = params;
      const remoteJid = webMessage.key.remoteJid;
      const userJid = webMessage.key.participant || webMessage.key.remoteJid;
      const isGroup = remoteJid?.endsWith("@g.us");

      if (!isGroup) {
        await socket.sendMessage(remoteJid, {
          text: "Este comando só funciona em grupos!"
        });
        return;
      }

      // Carrega o comando AFK para verificar status
      const afkCommand = require("./afk");
      
      // Verifica se o usuário estava AFK
      if (!afkCommand.isAFK(userJid)) {
        await socket.sendMessage(remoteJid, {
          text: `@${userJid.split('@')[0]}, você não estava AFK!`,
          mentions: [userJid]
        });
        return;
      }

      // Remove o usuário do AFK
      const afkData = afkCommand.removeAFK(userJid);
      
      // Calcula duração
      const now = new Date();
      const duration = Math.floor((now.getTime() - afkData.startTime) / 1000);
      
      let durationText = "";
      if (duration >= 3600) {
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        durationText = `${hours}h ${minutes}m`;
      } else if (duration >= 60) {
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        durationText = `${minutes}m ${seconds}s`;
      } else {
        durationText = `${duration}s`;
      }
      
      // Formata data/hora atual
      const timeString = now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      const dateString = now.toLocaleDateString('pt-BR');
      
      // Mensagem de volta
      const message = `👋 @${userJid.split('@')[0]} voltou!

🕐 ${timeString} | 📅 ${dateString}
⏱️ Ficou ausente por: ${durationText}
💭 Motivo anterior: ${afkData.reason}`;

      await socket.sendMessage(remoteJid, {
        text: message,
        mentions: [userJid]
      });

      console.log("Comando voltei executado com sucesso para:", userJid.split('@')[0]);

    } catch (error) {
      console.error("Erro no comando voltei:", error.message);
    }
  }
};

module.exports = volteiCommand;