/**
 * Sistema de verificação automática de aniversários.
 * Verifica diariamente e envia mensagens de parabéns às 9h da manhã.
 * 
 * @author Dev VaL 
 */
const fs = require("node:fs");
const path = require("node:path");

const DATABASE_PATH = path.join(__dirname, "..", "..", "database", "niver.json");

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

const checkBirthdays = async (socket) => {
  try {
    if (!fs.existsSync(DATABASE_PATH)) {
      return;
    }

    const data = JSON.parse(fs.readFileSync(DATABASE_PATH, "utf8"));
    const today = new Date();
    const currentDay = String(today.getDate()).padStart(2, "0");
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");

    for (const [groupJid, birthdays] of Object.entries(data)) {
      const todayBirthdays = Object.entries(birthdays).filter(([_, birthdayData]) => {
        const [day, month] = birthdayData.date.split("/");
        return day === currentDay && month === currentMonth;
      });

      if (todayBirthdays.length > 0) {
        let message = `🎉🎂 *ANIVERSARIANTES DE HOJE!* 🎂🎉\n\n`;
        
        todayBirthdays.forEach(([userJid, birthdayData]) => {
          const age = calculateAge(birthdayData.date);
          message += `🎈 @${userJid.split("@")[0]}\n`;
          message += `   Completando ${age} anos hoje! 🎊\n\n`;
        });

        message += `_Que este dia seja repleto de alegrias e realizações! 🎁✨_`;

        const mentions = todayBirthdays.map(([userJid]) => userJid);
        
        try {
          await socket.sendMessage(groupJid, {
            text: message,
            mentions: mentions,
          });
          console.log(`[NIVER] ✅ Mensagem enviada para ${groupJid}`);
        } catch (sendError) {
          console.error(`[NIVER] ❌ Erro ao enviar para ${groupJid}: ${sendError.message}`);
          
          try {
            const messageWithoutMentions = message.replace(/@/g, '');
            await socket.sendMessage(groupJid, {
              text: messageWithoutMentions,
            });
            console.log(`[NIVER] ✅ Mensagem enviada sem menções para ${groupJid}`);
          } catch (fallbackError) {
            console.error(`[NIVER] ❌ Falha ao enviar para ${groupJid}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("[NIVER] ❌ Erro ao verificar aniversários:", error);
  }
};

const initNiverChecker = (socket) => {
  console.log("[NIVER] Sistema de aniversários iniciado");

  const checkInterval = 1800000; // 30 minutos
  let lastCheckDate = null;

  const runCheck = async () => {
    const today = new Date().toDateString();
    const currentHour = new Date().getHours();
    
    if (lastCheckDate !== today && currentHour >= 9 && currentHour <= 10) {
      await checkBirthdays(socket);
      lastCheckDate = today;
    }
  };

  runCheck();
  setInterval(runCheck, checkInterval);
};

module.exports = {
  initNiverChecker,
  checkBirthdays,
};