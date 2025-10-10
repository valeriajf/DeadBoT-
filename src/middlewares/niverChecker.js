/**
 * Sistema de verificação automática de aniversários.
 * Versão com logs detalhados para diagnóstico
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
  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  console.log(`\n========================================`);
  console.log(`[NIVER] 🎂 VERIFICAÇÃO AUTOMÁTICA às ${timeStr}`);
  console.log(`========================================`);
  
  try {
    if (!fs.existsSync(DATABASE_PATH)) {
      console.log("[NIVER] ❌ Arquivo niver.json não encontrado");
      return;
    }

    const data = JSON.parse(fs.readFileSync(DATABASE_PATH, "utf8"));
    const today = new Date();
    const currentDay = String(today.getDate()).padStart(2, "0");
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");

    console.log(`[NIVER] 📅 Verificando para ${currentDay}/${currentMonth}/${today.getFullYear()}`);
    console.log(`[NIVER] 📊 Total de grupos no banco: ${Object.keys(data).length}`);

    let totalBirthdays = 0;
    let sentMessages = 0;
    let failedMessages = 0;

    for (const [groupJid, birthdays] of Object.entries(data)) {
      const todayBirthdays = Object.entries(birthdays).filter(([_, birthdayData]) => {
        const [day, month] = birthdayData.date.split("/");
        return day === currentDay && month === currentMonth;
      });

      if (todayBirthdays.length > 0) {
        totalBirthdays += todayBirthdays.length;
        console.log(`\n[NIVER] 🎉 Grupo ${groupJid}:`);
        console.log(`[NIVER]    └─ ${todayBirthdays.length} aniversariante(s) encontrado(s)`);
        
        let message = `🎉🎂 *ANIVERSARIANTES DE HOJE!* 🎂🎉\n\n`;
        
        todayBirthdays.forEach(([userJid, birthdayData]) => {
          const age = calculateAge(birthdayData.date);
          const name = userJid.split("@")[0];
          console.log(`[NIVER]    └─ @${name} - ${age} anos`);
          message += `🎈 @${name}\n`;
          message += `   Completando ${age} anos hoje! 🎊\n\n`;
        });

        message += `_Que este dia seja repleto de alegrias e realizações! 🎁✨_`;

        const mentions = todayBirthdays.map(([userJid]) => userJid);
        
        console.log(`[NIVER]    └─ 📤 Tentando enviar...`);
        
        try {
          await socket.sendMessage(groupJid, {
            text: message,
            mentions: mentions,
          });
          sentMessages++;
          console.log(`[NIVER]    └─ ✅ ENVIADO COM SUCESSO!`);
        } catch (sendError) {
          console.log(`[NIVER]    └─ ❌ Erro: ${sendError.message}`);
          console.log(`[NIVER]    └─ 🔄 Tentando sem menções...`);
          
          try {
            const messageWithoutMentions = message.replace(/@/g, '');
            await socket.sendMessage(groupJid, {
              text: messageWithoutMentions,
            });
            sentMessages++;
            console.log(`[NIVER]    └─ ✅ Enviado sem menções!`);
          } catch (fallbackError) {
            failedMessages++;
            console.log(`[NIVER]    └─ ❌ Falha total: ${fallbackError.message}`);
          }
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`[NIVER] 📊 RESUMO DA VERIFICAÇÃO:`);
    console.log(`[NIVER]    └─ Aniversariantes encontrados: ${totalBirthdays}`);
    console.log(`[NIVER]    └─ Mensagens enviadas: ${sentMessages}`);
    console.log(`[NIVER]    └─ Falhas: ${failedMessages}`);
    console.log(`========================================\n`);
    
  } catch (error) {
    console.error("[NIVER] ❌ ERRO CRÍTICO:", error);
    console.error("[NIVER] Stack:", error.stack);
  }
};

const initNiverChecker = (socket) => {
  console.log("\n🎂 ========================================");
  console.log("🎂 SISTEMA DE ANIVERSÁRIOS AUTOMÁTICO");
  console.log("🎂 ========================================");
  console.log("🎂 Horário de envio: 9h às 10h");
  console.log("🎂 Verificação: a cada 30 minutos");
  console.log("🎂 ========================================\n");

  const checkInterval = 1800000; // 30 minutos
  let lastCheckDate = null;

  const runCheck = async () => {
    const today = new Date();
    const todayStr = today.toDateString();
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    
    const timeStr = `${currentHour}:${String(currentMinute).padStart(2, '0')}`;
    
    console.log(`[NIVER] ⏰ Check executado às ${timeStr}`);
    console.log(`[NIVER]    └─ Data: ${todayStr}`);
    console.log(`[NIVER]    └─ Última verificação: ${lastCheckDate || 'Nenhuma'}`);
    console.log(`[NIVER]    └─ Horário válido (9-10h)? ${currentHour >= 9 && currentHour <= 10 ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`[NIVER]    └─ Já enviou hoje? ${lastCheckDate === todayStr ? 'SIM' : 'NÃO'}`);
    
    if (lastCheckDate !== todayStr && currentHour >= 9 && currentHour <= 10) {
      console.log(`[NIVER] 🚀 CONDIÇÕES ATENDIDAS! Executando verificação...`);
      await checkBirthdays(socket);
      lastCheckDate = todayStr;
      console.log(`[NIVER] ✅ Próxima verificação: amanhã às 9h\n`);
    } else {
      console.log(`[NIVER] ⏭️  Aguardando próxima verificação...\n`);
    }
  };

  // Executa a primeira verificação
  runCheck();

  // Agenda verificações periódicas
  setInterval(runCheck, checkInterval);

  console.log("[NIVER] ✅ Sistema inicializado e rodando!\n");
};

module.exports = {
  initNiverChecker,
  checkBirthdays,
};