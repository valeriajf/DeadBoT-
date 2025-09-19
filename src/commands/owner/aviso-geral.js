/*
Envia um aviso profissional em todos os grupos em que o bot está

By vøidh7

*/

const { errorLog } = require(`${BASE_DIR}/utils/logger`);
const { PREFIX, OWNER_JID, BOT_NAME } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "aviso-geral",
  description: "Dono envia mensagem profissional em todos os grupos com menção a todos",
  commands: ["aviso-geral", "a-g", "broadcast"],
  usage: `${PREFIX}aviso-geral <mensagem>`,
  handle: async ({
    socket,
    sendReact,
    sendReply,
    sendErrorReply,
    args,
    sender,
    pushName,
  }) => {
    try {
      // Apenas dono pode usar
      if (sender !== OWNER_JID) {
        return sendErrorReply("❌ Apenas o desenvolvedor pode executar este comando");
      }

      if (!args.length) {
        return sendErrorReply(
          `📋 *Uso correto:*\n${PREFIX}aviso-geral <sua mensagem>\n\n💡 *Exemplo:*\n${PREFIX}aviso-geral Sistema em manutenção`
        );
      }

      const message = args.join(" ");
      const botName = BOT_NAME || "DeadBoT";
      const devName = pushName || "Dev";
      
      // Formato profissional da mensagem
      const professionalMessage = `*📡 𝐁𝐑𝐎𝐀𝐃𝐂𝐀𝐒𝐓 ${botName.toUpperCase()}™* 

📧 ᴍᴇɴsᴀɢᴇᴍ:
${message}

> _📤 ᴇɴᴠɪᴀᴅᴏ ᴘᴏʀ: VaL (ᴅᴇᴠ)_
> _⏰ ${new Date().toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}_`;

      const groupsMeta = await socket.groupFetchAllParticipating();
      const groups = Object.values(groupsMeta);
      
      let successCount = 0;
      let errorCount = 0;

      await sendReact("📡");
      await sendReply("📡 *Iniciando broadcast...*\n⏳ Enviando mensagem para todos os grupos...");

      // Envio com delay para evitar spam
      for (const group of groups) {
        try {
          const members = group.participants.map(p => p.id);

          await socket.sendMessage(group.id, {
            text: professionalMessage,
            mentions: members,
          });

          successCount++;
          
          // Pequeno delay entre envios
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (e) {
          errorCount++;
          errorLog(`Erro ao enviar para grupo ${group.id}: ${e.message}`);
        }
      }

      // Relatório final
      const reportMessage = `📊 *RELATÓRIO DE BROADCAST*

✅ *Enviado para:* ${successCount} grupos

📡 *Status:* Concluído com sucesso!`;

      await sendReply(reportMessage);
      
    } catch (error) {
      errorLog(error);
      await sendErrorReply("❌ *Erro interno no sistema de broadcast*\n\n🔧 Verifique os logs para mais detalhes");
    }
  },
};