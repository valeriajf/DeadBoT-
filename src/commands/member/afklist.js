/**
 * Comando para listar usuários AFK
 * Salve como: src/commands/member/afklist.js
 * 
 * @author Val (DeadBoT)
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "afklist",
  description: "Lista todos os usuários que estão AFK no momento",
  commands: ["afklist", "listaafk", "ausentes"],
  usage: `${PREFIX}afklist`,
  
  handle: async (props) => {
    try {
      const { 
        sendReply,
        sendErrorReply,
        getGroupParticipants,
        remoteJid,
        isGroup,
        socket
      } = props;

      if (!isGroup) {
        return await sendErrorReply("Este comando só funciona em grupos!");
      }

      // Carrega o sistema AFK
      const afkSystem = require(`${BASE_DIR}/utils/afkSystem`);
      
      // Pega participantes do grupo
      const participants = await getGroupParticipants();
      
      // Filtra usuários AFK que ainda estão no grupo
      const afkUsersInGroup = [];
      const allAFKUsers = afkSystem.getAllAFKUsers();
      
      for (const userJid of allAFKUsers) {
        const isInGroup = participants.some(p => p.id === userJid);
        if (isInGroup) {
          const afkData = afkSystem.getAFKData(userJid);
          const duration = afkSystem.getAFKDuration(userJid);
          
          afkUsersInGroup.push({
            userJid,
            afkData,
            duration
          });
        }
      }

      if (afkUsersInGroup.length === 0) {
        return await sendReply(`💤 *LISTA DE USUÁRIOS AFK* 💤

✅ Nenhum usuário está AFK no momento neste grupo!

Todos estão ativos e presentes.`);
      }

      // Ordena por tempo AFK (mais antigo primeiro)
      afkUsersInGroup.sort((a, b) => a.afkData.startTime - b.afkData.startTime);

      // Monta a mensagem
      let message = `💤 *LISTA DE USUÁRIOS AFK* 💤\n`;
      message += `📊 Total: ${afkUsersInGroup.length} usuário(s) ausente(s)\n\n`;

      const mentions = [];

      afkUsersInGroup.forEach((user, index) => {
        const afkDate = new Date(user.afkData.timestamp);
        const dateString = afkDate.toLocaleDateString('pt-BR');
        const timeString = afkDate.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        message += `${index + 1}. @${user.userJid.split('@')[0]}\n`;
        message += `   📅 Desde: ${dateString} às ${timeString}\n`;
        message += `   ⏱️ Há: ${user.duration}\n`;
        message += `   💭 Motivo: ${user.afkData.reason}\n\n`;
        
        mentions.push(user.userJid);
      });

      // Estatísticas do sistema
      const stats = afkSystem.getStats();
      message += `📈 *ESTATÍSTICAS GERAIS:*\n`;
      message += `👥 Total de usuários registrados: ${stats.totalUsers}\n`;
      message += `💤 Atualmente AFK: ${stats.totalAFK}\n`;
      message += `👋 Já retornaram: ${stats.totalReturned}`;

      await sendReply(message, mentions);

    } catch (error) {
      console.error("Erro no comando afklist:", error);
      await props.sendErrorReply(`Erro ao listar usuários AFK: ${error.message}`);
    }
  },
};