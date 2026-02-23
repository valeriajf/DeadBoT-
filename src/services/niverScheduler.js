/**
 * src/services/niverScheduler.js
 *
 * Serviço de agendamento de parabéns automáticos.
 *
 * Como funciona:
 *   - Roda um intervalo a cada minuto verificando se são 7:00h
 *   - Ao atingir 7:00h, percorre todos os grupos com sistema ativo
 *   - Para cada grupo, busca membros com aniversário hoje
 *   - Envia mensagem personalizada com menção e idade
 *   - Controla para não repetir parabéns no mesmo dia
 */

const path = require("node:path");

// Mensagens de parabéns — sorteia uma aleatoriamente
const BIRTHDAY_MESSAGES = [
  `🎂 Parabéns, @{name}! 🎉\n\nHoje você completa *{age} aninhos* e o grupo inteiro veio celebrar com você! Que esse dia seja repleto de alegria, amor e muita felicidade! 🥳🎊`,
  `🎈 *FELIZ ANIVERSÁRIO*, @{name}! 🎈\n\nHoje é um dia muito especial — você está completando *{age} anos*! Que a vida te traga tudo de melhor e que seus sonhos se realizem! 🌟✨`,
  `🥳 Ei, @{name}! Hoje é o seu dia! 🎂\n\n*{age} anos* de uma pessoa incrível! O grupo inteiro te deseja um aniversário maravilhoso, com muita saúde e alegria! 🎉❤️`,
  `🎊 *PARABÉNS, @{name}!* 🎊\n\nMais um ano de vida! Hoje você completa *{age} anos* e merece toda a felicidade do mundo! Que esse novo ciclo seja ainda melhor! 🙏🌈`,
];

/**
 * Escolhe uma mensagem aleatória e preenche os dados do aniversariante.
 * @param {string} name
 * @param {number} age
 * @returns {string}
 */
function buildBirthdayMessage(name, age) {
  const template =
    BIRTHDAY_MESSAGES[Math.floor(Math.random() * BIRTHDAY_MESSAGES.length)];
  return template.replace(/{name}/g, name).replace(/{age}/g, age);
}

/**
 * Verifica e envia parabéns para todos os grupos ativos.
 * @param {import('@whiskeysockets/baileys').WASocket} socket
 */
async function checkAndSendBirthdays(socket) {
  try {
    // Require feito aqui dentro para garantir que BASE_DIR já existe
    const {
      getAllBirthdays,
      getActiveBirthdayGroups,
      isBirthdaySystemActive,
      getGreetedTodayForGroup,
      markGreetedToday,
    } = require(path.join(BASE_DIR, "utils", "niverDatabase"));

    const now = new Date();
    const today = { day: now.getDate(), month: now.getMonth() + 1 };
    const currentYear = now.getFullYear();

    const activeGroups = getActiveBirthdayGroups();
    if (!activeGroups.length) return;

    const allBirthdays = getAllBirthdays();
    const birthdaysToday = Object.entries(allBirthdays).filter(
      ([, { day, month }]) => day === today.day && month === today.month
    );

    if (!birthdaysToday.length) return;

    for (const groupJid of activeGroups) {
      if (!isBirthdaySystemActive(groupJid)) continue;

      let participants = [];
      try {
        const meta = await socket.groupMetadata(groupJid);
        participants = meta.participants.map((p) => p.id);
      } catch {
        continue;
      }

      const greetedToday = getGreetedTodayForGroup(groupJid);

      for (const [userJid, { year }] of birthdaysToday) {
        if (!participants.includes(userJid)) continue;
        if (greetedToday.includes(userJid)) continue;

        const age = currentYear - year;
        const phone = userJid.split("@")[0];
        const text = buildBirthdayMessage(phone, age);

        try {
          await socket.sendMessage(groupJid, {
            text,
            mentions: [userJid],
          });

          markGreetedToday(groupJid, userJid);

          // Delay entre envios para evitar rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } catch (err) {
          console.error(
            `[NiverScheduler] Erro ao enviar parabéns para ${userJid} no grupo ${groupJid}:`,
            err.message
          );
        }
      }
    }
  } catch (err) {
    console.error("[NiverScheduler] Erro geral:", err.message);
  }
}

/**
 * Inicia o agendador de aniversários.
 * Verifica se são 7:00h a cada minuto e envia parabéns.
 * @param {import('@whiskeysockets/baileys').WASocket} socket
 */
function startNiverScheduler(socket) {
  console.log("[NiverScheduler] 🎂 Agendador de aniversários iniciado!");

  let alreadySentToday = false;
  let lastDay = new Date().getDate();

  setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const day = now.getDate();

    // Resetar controle ao virar o dia
    if (day !== lastDay) {
      alreadySentToday = false;
      lastDay = day;
    }

    // Verificar se são exatamente 7:00h (e ainda não enviou hoje)
    if (hour === 7 && minute === 0 && !alreadySentToday) {
      alreadySentToday = true;
      console.log("[NiverScheduler] ⏰ São 7h! Verificando aniversariantes...");
      await checkAndSendBirthdays(socket);
    }
  }, 60 * 1000); // Checa a cada 1 minuto
}

/**
 * Força verificação manual imediata (sem aguardar 7h).
 * @param {import('@whiskeysockets/baileys').WASocket} socket
 */
async function forceNiverCheck(socket) {
  console.log("[NiverScheduler] 🔧 Verificação manual de aniversários!");
  await checkAndSendBirthdays(socket);
}

module.exports = {
  startNiverScheduler,
  forceNiverCheck,
};
