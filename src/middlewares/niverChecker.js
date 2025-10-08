/**
 * Sistema de verificação automática de aniversários.
 * VERSÃO DE TESTE - 11:00 às 11:05
 * 
 * @author DeadBoT Team
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
      console.log("[NIVER] ❌ Arquivo de banco de dados não encontrado");
      return;
    }

    const data = JSON.parse(fs.readFileSync(DATABASE_PATH, "utf8"));
    const today = new Date();
    const currentDay = String(today.getDate()).padStart(2, "0");
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");

    console.log(`[NIVER] 🔍 Verificando aniversários para ${currentDay}/${currentMonth}`);

    for (const [groupJid, birthdays] of Object.entries(data)) {
      const todayBirthdays = Object.entries(birthdays).filter(([_, birthdayData]) => {
        const [day, month] = birthdayData.date.split("/");
        return day === currentDay && month === currentMonth;
      });

      console.log(`[NIVER] 📋 Grupo ${groupJid}: ${todayBirthdays.length} aniversariante(s) encontrado(s)`);

      if (todayBirthdays.length > 0) {
        let message = `🎉🎂 *ANIVERSARIANTES DE HOJE!* 🎂🎉\n\n`;
        
        todayBirthdays.forEach(([userJid, birthdayData]) => {
          const age = calculateAge(birthdayData.date);
          message += `🎈 @${userJid.split("@")[0]}\n`;
          message += `   Completando ${age} anos hoje! 🎊\n\n`;
        });

        message += `_Que este dia seja repleto de alegrias e realizações! 🎁✨_`;

        const mentions = todayBirthdays.map(([userJid]) => userJid);
        
        console.log(`[NIVER] 📤 Tentando enviar para ${groupJid} com ${mentions.length} menção(ões)...`);
        
        try {
          await socket.sendMessage(groupJid, {
            text: message,
            mentions: mentions,
          });
          console.log(`[NIVER] ✅ MENSAGEM ENVIADA COM SUCESSO para ${groupJid}!`);
        } catch (sendError) {
          console.error(`[NIVER] ❌ ERRO ao enviar para ${groupJid}: ${sendError.message}`);
          console.log(`[NIVER] 🔄 Tentando novamente SEM menções...`);
          
          try {
            const messageWithoutMentions = message.replace(/@/g, '');
            await socket.sendMessage(groupJid, {
              text: messageWithoutMentions,
            });
            console.log(`[NIVER] ✅ Mensagem enviada SEM menções para ${groupJid}`);
          } catch (fallbackError) {
            console.error(`[NIVER] ❌ FALHA TOTAL para ${groupJid}: ${fallbackError.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("[NIVER] ❌ Erro geral ao verificar aniversários:", error);
  }
};

const initNiverChecker = (socket) => {
  console.log("[NIVER] 🚀 Iniciando verificador de aniversários... (TESTE 11:00-11:05)");

  // Verifica a cada 1 minuto para não perder a janela
  const checkInterval = 60000; // 1 minuto

  let lastCheckDate = null;

  const runCheck = async () => {
    const today = new Date().toDateString();
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    
    console.log(`[NIVER] ⏰ Verificação às ${currentHour}:${String(currentMinute).padStart(2, '0')}h`);
    console.log(`[NIVER] 📅 Última verificação: ${lastCheckDate || 'Nenhuma ainda'}`);
    
    const isInTimeWindow = currentHour === 11 && currentMinute >= 0 && currentMinute <= 5;
    console.log(`[NIVER] ✅ Está na janela 11:00-11:05? ${isInTimeWindow}`);
    console.log(`[NIVER] ✅ Ainda não enviou hoje? ${lastCheckDate !== today}`);
    
    if (lastCheckDate !== today && isInTimeWindow) {
      console.log(`[NIVER] 🎂🎂🎂 HORÁRIO ATINGIDO! ENVIANDO MENSAGENS... 🎂🎂🎂`);
      await checkBirthdays(socket);
      lastCheckDate = today;
      console.log(`[NIVER] ✅✅✅ Verificação concluída para ${today} ✅✅✅`);
    } else {
      console.log(`[NIVER] ⏭️ Aguardando janela 11:00-11:05...`);
    }
  };

  // Executa imediatamente ao iniciar
  runCheck();

  // Agenda verificações a cada 1 minuto
  setInterval(runCheck, checkInterval);

  console.log("[NIVER] ✅ Sistema ativo! Verificando a cada 1 minuto na janela 11:00-11:05");
};

module.exports = {
  initNiverChecker,
  checkBirthdays,
};