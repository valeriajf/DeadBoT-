/**
 * Sistema de verificação automática de aniversários.
 * Verifica diariamente e envia mensagens de parabéns às 9h da manhã.
 * 
 * @author Dev VaL 
 */
const fs = require("node:fs");
const path = require("node:path");

// Define o caminho correto para o database
const DATABASE_PATH = path.join(__dirname, "..", "..", "database", "niver.json");

// Calcula idade
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

// Verifica aniversários do dia
const checkBirthdays = async (socket) => {
  try {
    if (!fs.existsSync(DATABASE_PATH)) {
      console.log("[NIVER] Arquivo de banco de dados não encontrado");
      return;
    }

    const data = JSON.parse(fs.readFileSync(DATABASE_PATH, "utf8"));
    const today = new Date();
    const currentDay = String(today.getDate()).padStart(2, "0");
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");

    console.log(`[NIVER] Verificando aniversários para ${currentDay}/${currentMonth}`);

    // Itera sobre todos os grupos
    for (const [groupJid, birthdays] of Object.entries(data)) {
      const todayBirthdays = Object.entries(birthdays).filter(([_, birthdayData]) => {
        const [day, month] = birthdayData.date.split("/");
        return day === currentDay && month === currentMonth;
      });

      console.log(`[NIVER] Grupo ${groupJid}: ${todayBirthdays.length} aniversariante(s) encontrado(s)`);

      // Se houver aniversariantes, envia mensagem
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
          console.log(`[NIVER] ✅ Lembrete enviado com sucesso para o grupo ${groupJid}`);
        } catch (sendError) {
          console.error(`[NIVER] ❌ Erro ao enviar mensagem para ${groupJid}:`, sendError.message);
        }
      }
    }
  } catch (error) {
    console.error("[NIVER] ❌ Erro ao verificar aniversários:", error);
  }
};

// Inicia o verificador de aniversários
const initNiverChecker = (socket) => {
  console.log("[NIVER] Iniciando verificador de aniversários...");

  // Verifica a cada 30 minutos
  const checkInterval = 1800000; // 30 minutos

  // Variável para controlar se já enviou hoje
  let lastCheckDate = null;

  const runCheck = async () => {
    const today = new Date().toDateString();
    const currentHour = new Date().getHours();
    
    // Envia entre 9h e 10h, apenas uma vez por dia
    if (lastCheckDate !== today && currentHour >= 9 && currentHour <= 10) {
      console.log(`[NIVER] 🎂 Horário de envio atingido! Verificando aniversários...`);
      await checkBirthdays(socket);
      lastCheckDate = today;
      console.log(`[NIVER] ✅ Verificação concluída para ${today}`);
    }
  };

  // Executa imediatamente ao iniciar
  runCheck();

  // Agenda verificações periódicas a cada 30 minutos
  setInterval(runCheck, checkInterval);

  console.log("[NIVER] ✅ Verificador ativo! Mensagens serão enviadas entre 9h-10h diariamente.");
};

module.exports = {
  initNiverChecker,
  checkBirthdays,
};