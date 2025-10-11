/**
 * Sistema de verificação automática de aniversários.
 * VERSÃO DE TESTE - 16:30 às 16:40
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
  
  console.log(`\n🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂`);
  console.log(`[NIVER] 🚀 EXECUTANDO VERIFICAÇÃO AUTOMÁTICA às ${timeStr}`);
  console.log(`🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂`);
  
  try {
    if (!fs.existsSync(DATABASE_PATH)) {
      console.log("[NIVER] ❌ Arquivo niver.json não encontrado");
      return;
    }

    const data = JSON.parse(fs.readFileSync(DATABASE_PATH, "utf8"));
    const today = new Date();
    const currentDay = String(today.getDate()).padStart(2, "0");
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");

    console.log(`[NIVER] 📅 Data de hoje: ${currentDay}/${currentMonth}/${today.getFullYear()}`);
    console.log(`[NIVER] 🔍 Procurando aniversários de: ${currentDay}/${currentMonth}`);
    console.log(`[NIVER] 📊 Total de grupos: ${Object.keys(data).length}`);

    let totalBirthdays = 0;
    let sentMessages = 0;
    let failedMessages = 0;

    for (const [groupJid, birthdays] of Object.entries(data)) {
      console.log(`\n[NIVER] 🔍 Analisando grupo: ${groupJid}`);
      
      // Mostra TODOS os aniversários cadastrados
      console.log(`[NIVER] 📋 Aniversários cadastrados neste grupo:`);
      for (const [userJid, birthdayData] of Object.entries(birthdays)) {
        const [day, month, year] = birthdayData.date.split("/");
        console.log(`[NIVER]    └─ @${userJid.split("@")[0]}: ${day}/${month}/${year}`);
      }
      
      const todayBirthdays = Object.entries(birthdays).filter(([_, birthdayData]) => {
        const [day, month] = birthdayData.date.split("/");
        return day === currentDay && month === currentMonth;
      });

      console.log(`[NIVER] 🎯 Aniversariantes HOJE: ${todayBirthdays.length}`);

      if (todayBirthdays.length > 0) {
        totalBirthdays += todayBirthdays.length;
        
        let message = `🎉🎂 *ANIVERSARIANTES DE HOJE!* 🎂🎉\n\n`;
        
        todayBirthdays.forEach(([userJid, birthdayData]) => {
          const age = calculateAge(birthdayData.date);
          const name = userJid.split("@")[0];
          console.log(`[NIVER]    ✅ @${name} faz ${age} anos hoje!`);
          message += `🎈 @${name}\n`;
          message += `   Completando ${age} anos hoje! 🎊\n\n`;
        });

        message += `_Que este dia seja repleto de alegrias e realizações! 🎁✨_`;

        const mentions = todayBirthdays.map(([userJid]) => userJid);
        
        console.log(`\n[NIVER] 📤 ENVIANDO MENSAGEM para ${groupJid}...`);
        
        try {
          await socket.sendMessage(groupJid, {
            text: message,
            mentions: mentions,
          });
          sentMessages++;
          console.log(`[NIVER] ✅✅✅ MENSAGEM ENVIADA COM SUCESSO! ✅✅✅`);
        } catch (sendError) {
          console.log(`[NIVER] ❌ ERRO ao enviar: ${sendError.message}`);
          console.log(`[NIVER] 🔄 Tentando sem menções...`);
          
          try {
            const messageWithoutMentions = message.replace(/@/g, '');
            await socket.sendMessage(groupJid, {
              text: messageWithoutMentions,
            });
            sentMessages++;
            console.log(`[NIVER] ✅ Enviado sem menções!`);
          } catch (fallbackError) {
            failedMessages++;
            console.log(`[NIVER] ❌❌❌ FALHA TOTAL: ${fallbackError.message}`);
          }
        }
      } else {
        console.log(`[NIVER] ⏭️  Nenhum aniversariante hoje neste grupo`);
      }
    }

    console.log(`\n🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂`);
    console.log(`[NIVER] 📊 RESUMO FINAL:`);
    console.log(`[NIVER]    └─ Total de aniversariantes: ${totalBirthdays}`);
    console.log(`[NIVER]    └─ Mensagens enviadas: ${sentMessages}`);
    console.log(`[NIVER]    └─ Falhas: ${failedMessages}`);
    console.log(`🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂\n`);
    
  } catch (error) {
    console.error("[NIVER] ❌❌❌ ERRO CRÍTICO:", error);
    console.error("[NIVER] Stack:", error.stack);
  }
};

const initNiverChecker = (socket) => {
  console.log("\n🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂");
  console.log("🎂 TESTE: Sistema de Aniversários");
  console.log("🎂 Horário: 16:30 às 16:40");
  console.log("🎂 Verificação: a cada 2 minutos");
  console.log("🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂🎂\n");

  const checkInterval = 120000; // 2 minutos
  let lastCheckDate = null;

  const runCheck = async () => {
    const today = new Date();
    const todayStr = today.toDateString();
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    
    const timeStr = `${currentHour}:${String(currentMinute).padStart(2, '0')}`;
    
    console.log(`\n[NIVER] ⏰ Verificação às ${timeStr}`);
    console.log(`[NIVER]    └─ Janela de teste: 16:30-16:40`);
    
    const isInWindow = currentHour === 16 && currentMinute >= 30 && currentMinute <= 40;
    
    console.log(`[NIVER]    └─ Está na janela? ${isInWindow ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`[NIVER]    └─ Já enviou hoje? ${lastCheckDate === todayStr ? 'SIM' : 'NÃO'}`);
    
    if (lastCheckDate !== todayStr && isInWindow) {
      console.log(`[NIVER] 🚀🚀🚀 ATIVANDO ENVIO AUTOMÁTICO! 🚀🚀🚀`);
      await checkBirthdays(socket);
      lastCheckDate = todayStr;
    } else {
      console.log(`[NIVER] ⏭️  Aguardando...\n`);
    }
  };

  // Executa a primeira verificação
  runCheck();

  // Agenda verificações periódicas
  setInterval(runCheck, checkInterval);

  console.log("[NIVER] ✅ Sistema de teste ativo!\n");
};

module.exports = {
  initNiverChecker,
  checkBirthdays,
};