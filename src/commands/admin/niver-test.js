/**
 * Comando para testar o envio de mensagens de aniversário manualmente
 * 
 * @author DeadBoT Team
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const path = require("node:path");
const fs = require("node:fs");

const DATABASE_PATH = path.join(BASE_DIR, "database", "niver.json");

const calculateAge = (dateString) => {
  const [day, month, year] = dateString.split("/").map(Number);
  const today = new Date();
  const birthDate = new Date(year, month - 1, day);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

module.exports = {
  name: "niver-test",
  description: "Testa o envio automático de aniversários",
  commands: ["niver-test"],
  usage: `${PREFIX}niver-test`,
  
  handle: async ({ socket, remoteJid, sendReply, sendSuccessReply, sendErrorReply }) => {
    try {
      await sendReply("🧪 Iniciando teste do sistema de aniversários...");

      // Verifica se o arquivo existe
      if (!fs.existsSync(DATABASE_PATH)) {
        return await sendErrorReply("❌ Arquivo niver.json não encontrado!");
      }

      // Lê o banco de dados
      const data = JSON.parse(fs.readFileSync(DATABASE_PATH, "utf8"));
      const today = new Date();
      const currentDay = String(today.getDate()).padStart(2, "0");
      const currentMonth = String(today.getMonth() + 1).padStart(2, "0");

      await sendReply(`📅 Data de hoje: ${currentDay}/${currentMonth}/${today.getFullYear()}`);
      await sendReply(`🕐 Hora atual: ${today.getHours()}:${String(today.getMinutes()).padStart(2, '0')}`);

      // Verifica aniversariantes no grupo atual
      const groupBirthdays = data[remoteJid];
      
      if (!groupBirthdays) {
        return await sendErrorReply("❌ Nenhum aniversário cadastrado neste grupo!");
      }

      const todayBirthdays = Object.entries(groupBirthdays).filter(([_, birthdayData]) => {
        const [day, month] = birthdayData.date.split("/");
        return day === currentDay && month === currentMonth;
      });

      if (todayBirthdays.length === 0) {
        return await sendReply("📅 Nenhum aniversariante hoje neste grupo.");
      }

      // Prepara a mensagem
      let message = `🎉🎂 *ANIVERSARIANTES DE HOJE!* 🎂🎉\n\n`;
      
      todayBirthdays.forEach(([userJid, birthdayData]) => {
        const age = calculateAge(birthdayData.date);
        message += `🎈 @${userJid.split("@")[0]}\n`;
        message += `   Completando ${age} anos hoje! 🎊\n\n`;
      });

      message += `_Que este dia seja repleto de alegrias e realizações! 🎁✨_`;

      const mentions = todayBirthdays.map(([userJid]) => userJid);

      await sendReply(`✅ Encontrados ${todayBirthdays.length} aniversariante(s)!`);
      await sendReply("📤 Enviando mensagem de teste...");

      // Tenta enviar
      try {
        await socket.sendMessage(remoteJid, {
          text: message,
          mentions: mentions,
        });
        await sendSuccessReply("✅ Mensagem de teste enviada com sucesso!");
      } catch (sendError) {
        await sendErrorReply(`❌ Erro ao enviar: ${sendError.message}`);
        
        // Tenta sem menções
        try {
          const messageWithoutMentions = message.replace(/@/g, '');
          await socket.sendMessage(remoteJid, {
            text: messageWithoutMentions,
          });
          await sendSuccessReply("✅ Mensagem enviada sem menções!");
        } catch (fallbackError) {
          await sendErrorReply(`❌ Falha total: ${fallbackError.message}`);
        }
      }

    } catch (error) {
      await sendErrorReply(`❌ Erro no teste: ${error.message}`);
    }
  },
};