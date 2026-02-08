const { PREFIX } = require(`${BASE_DIR}/config`);
const { errorLog } = require(`${BASE_DIR}/utils/logger`);
const { DangerError } = require(`${BASE_DIR}/errors`);
const fs = require("fs");
const path = require("path");

// Arquivo para armazenar os agendamentos
const SCHEDULE_FILE = path.join(
  BASE_DIR,
  "database",
  "grupo-abrir-schedule.json"
);

// Carrega os agendamentos salvos
function loadSchedules() {
  try {
    if (fs.existsSync(SCHEDULE_FILE)) {
      const data = fs.readFileSync(SCHEDULE_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    errorLog(`Erro ao carregar agendamentos: ${error.message}`);
  }
  return {};
}

// Salva os agendamentos
function saveSchedules(schedules) {
  try {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedules, null, 2));
  } catch (error) {
    errorLog(`Erro ao salvar agendamentos: ${error.message}`);
  }
}

// Intervalos ativos (armazenados em memória)
const activeIntervals = {};

// Flag para controlar se já foi inicializado
let isInitialized = false;

// Verifica e executa abertura se for o horário
async function checkAndOpen(socket, groupId, scheduleTime) {
  const now = new Date();
  const [hours, minutes] = scheduleTime.split(":").map(Number);

  if (now.getHours() === hours && now.getMinutes() === minutes) {
    try {
      await socket.groupSettingUpdate(groupId, "not_announcement");
      await socket.sendMessage(groupId, {
        text: `✅ *Grupo aberto automaticamente!*\n⏰ Horário programado: ${scheduleTime}\n🍿 *Pode começar o show !!!*`,
      });
    } catch (error) {
      errorLog(
        `Erro ao abrir grupo automaticamente: ${JSON.stringify(error, null, 2)}`
      );
    }
  }
}

// Inicia o monitoramento de um grupo
function startMonitoring(socket, groupId, scheduleTime) {
  // Limpa intervalo anterior se existir
  if (activeIntervals[groupId]) {
    clearInterval(activeIntervals[groupId]);
  }

  // Verifica a cada minuto
  activeIntervals[groupId] = setInterval(() => {
    checkAndOpen(socket, groupId, scheduleTime);
  }, 60000); // 60000ms = 1 minuto

  // Verifica imediatamente também
  checkAndOpen(socket, groupId, scheduleTime);
}

// Inicializa agendamentos ao carregar o comando
function initializeSchedules(socket) {
  if (isInitialized) return; // Evita inicializar múltiplas vezes
  
  const schedules = loadSchedules();
  Object.entries(schedules).forEach(([groupId, scheduleTime]) => {
    startMonitoring(socket, groupId, scheduleTime);
  });
  
  isInitialized = true;
  console.log(`[grupo-abrir] ${Object.keys(schedules).length} agendamento(s) inicializado(s)`);
}

module.exports = {
  name: "grupo-abrir",
  description:
    "Programa a abertura automática do grupo em um horário específico.",
  commands: ["grupo-abrir", "agendar-abertura", "schedule-open"],
  usage: `${PREFIX}grupo-abrir HH:MM\n\nExemplos:\n${PREFIX}grupo-abrir 08:00\n${PREFIX}grupo-abrir 14:30\n${PREFIX}grupo-abrir cancelar`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    socket,
    remoteJid,
    args,
    sendSuccessReply,
    sendErrorReply,
    sendWarningReply,
    userJid,
  }) => {
    try {
      // Inicializa agendamentos sempre que o comando for chamado
      initializeSchedules(socket);

      // Verifica se o usuário é administrador do grupo
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const participants = groupMetadata.participants;
      const userParticipant = participants.find(
        (p) => p.id === userJid
      );

      const isAdmin =
        userParticipant &&
        (userParticipant.admin === "admin" ||
          userParticipant.admin === "superadmin");

      if (!isAdmin) {
        throw new DangerError(
          "❌ Apenas administradores podem programar abertura do grupo!"
        );
      }

      // Verifica se foi passado argumento
      if (!args[0]) {
        const schedules = loadSchedules();
        const currentSchedule = schedules[remoteJid];

        if (currentSchedule) {
          await sendWarningReply(
            `⏰ *Abertura automática ativa*\n\n` +
              `Horário programado: *${currentSchedule}*\n\n` +
              `Para alterar, use: ${PREFIX}grupo-abrir HH:MM\n` +
              `Para cancelar, use: ${PREFIX}grupo-abrir cancelar`
          );
        } else {
          await sendWarningReply(
            `ℹ️ *Nenhum agendamento ativo*\n\n` +
              `Para programar a abertura do grupo, use:\n` +
              `${PREFIX}grupo-abrir HH:MM\n\n` +
              `Exemplo: ${PREFIX}grupo-abrir 08:00`
          );
        }
        return;
      }

      // Cancelar agendamento
      if (args[0].toLowerCase() === "cancelar" || args[0].toLowerCase() === "cancel") {
        const schedules = loadSchedules();

        if (!schedules[remoteJid]) {
          await sendWarningReply("⚠️ Não há agendamento ativo para este grupo!");
          return;
        }

        // Remove o agendamento
        delete schedules[remoteJid];
        saveSchedules(schedules);

        // Para o intervalo
        if (activeIntervals[remoteJid]) {
          clearInterval(activeIntervals[remoteJid]);
          delete activeIntervals[remoteJid];
        }

        await sendSuccessReply(
          "✅ Agendamento de abertura cancelado com sucesso!"
        );
        return;
      }

      // Validar formato de horário (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(args[0])) {
        await sendErrorReply(
          `❌ *Formato inválido!*\n\n` +
            `Use o formato HH:MM (24 horas)\n\n` +
            `Exemplos válidos:\n` +
            `• 08:00\n` +
            `• 14:30\n` +
            `• 23:59`
        );
        return;
      }

      const scheduleTime = args[0];
      const schedules = loadSchedules();

      // Salva o agendamento
      schedules[remoteJid] = scheduleTime;
      saveSchedules(schedules);

      // Inicia o monitoramento
      startMonitoring(socket, remoteJid, scheduleTime);

      await sendSuccessReply(
        `✅ *Abertura programada com sucesso!*\n\n` +
          `⏰ Horário: *${scheduleTime}*\n` +
          `📍 O grupo será aberto automaticamente todos os dias neste horário.\n\n` +
          `Para cancelar: ${PREFIX}grupo-abrir cancelar`
      );
    } catch (error) {
      if (error instanceof DangerError) {
        await sendErrorReply(error.message);
        return;
      }
      
      await sendErrorReply(
        "❌ Ocorreu um erro ao programar a abertura do grupo!"
      );
      errorLog(
        `Erro no comando grupo-abrir: ${JSON.stringify(error, null, 2)}`
      );
    }
  },
};
