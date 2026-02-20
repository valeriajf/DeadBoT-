/**
 * INSTALAÇÃO: /sdcard/DeadBoT-/src/commands/admin/grupo-fechar.js
 * VERSÃO SEM LOGS DE DEBUG
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const { errorLog } = require(`${BASE_DIR}/utils/logger`);
const { DangerError } = require(`${BASE_DIR}/errors`);
const fs = require("fs");
const path = require("path");

const SCHEDULE_FILE = path.join(BASE_DIR, "..", "database", "grupo-fechar-schedule.json");
const LAST_EXECUTION_FILE = path.join(BASE_DIR, "..", "database", "grupo-fechar-last-execution.json");

function getBrasiliaTime() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcDate = now.getUTCDate();
  const utcMonth = now.getUTCMonth();
  const utcYear = now.getUTCFullYear();
  
  let hours = utcHours - 3;
  let day = utcDate;
  let month = utcMonth;
  let year = utcYear;
  
  if (hours < 0) {
    hours += 24;
    day -= 1;
    if (day < 1) {
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
      day = new Date(year, month + 1, 0).getDate();
    }
  }
  
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month + 1).padStart(2, '0');
  
  return {
    hours,
    minutes: utcMinutes,
    date: `${dayStr}/${monthStr}/${year}`,
    fullTime: `${String(hours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`
  };
}

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

function saveSchedules(schedules) {
  try {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedules, null, 2));
  } catch (error) {
    errorLog(`Erro ao salvar agendamentos: ${error.message}`);
  }
}

function loadLastExecutions() {
  try {
    if (fs.existsSync(LAST_EXECUTION_FILE)) {
      const data = fs.readFileSync(LAST_EXECUTION_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    errorLog(`Erro ao carregar últimas execuções: ${error.message}`);
  }
  return {};
}

function saveLastExecutions(executions) {
  try {
    fs.writeFileSync(LAST_EXECUTION_FILE, JSON.stringify(executions, null, 2));
  } catch (error) {
    errorLog(`Erro ao salvar últimas execuções: ${error.message}`);
  }
}

const activeIntervals = {};
let isInitialized = false;
let lastExecution = loadLastExecutions();

async function checkAndClose(socket, groupId, scheduleTime) {
  try {
    const brasilia = getBrasiliaTime();
    const currentHours = brasilia.hours;
    const currentMinutes = brasilia.minutes;
    const currentDate = brasilia.date;
    const [scheduleHours, scheduleMinutes] = scheduleTime.split(":").map(Number);
    const executionKey = `${groupId}-${scheduleTime}`;

    if (currentHours === scheduleHours && currentMinutes === scheduleMinutes) {
      const jaExecutouHoje = lastExecution[executionKey] === currentDate;
      if (jaExecutouHoje) return;
      
      let sucesso = false;
      let tentativa = 0;
      const maxTentativas = 3;
      
      while (!sucesso && tentativa < maxTentativas) {
        tentativa++;
        try {
          await socket.groupSettingUpdate(groupId, "announcement");
          await socket.sendMessage(groupId, {
            text: `🔒 *Grupo fechado automaticamente!*\n⏰ Horário programado: ${scheduleTime}\n🥷 *Modo silencioso ativado. Shhh…*`,
          });
          sucesso = true;
        } catch (retryError) {
          if (tentativa < maxTentativas) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      if (sucesso) {
        lastExecution[executionKey] = currentDate;
        saveLastExecutions(lastExecution);
      }
    }
  } catch (error) {
    errorLog(`Erro ao fechar grupo: ${error.message}`);
  }
}

function startMonitoring(socket, groupId, scheduleTime) {
  if (activeIntervals[groupId]) {
    clearInterval(activeIntervals[groupId]);
  }
  activeIntervals[groupId] = setInterval(() => {
    checkAndClose(socket, groupId, scheduleTime);
  }, 60000);
  checkAndClose(socket, groupId, scheduleTime);
}

function initializeSchedules(socket) {
  if (isInitialized) return;
  const schedules = loadSchedules();
  Object.entries(schedules).forEach(([groupId, scheduleData]) => {
    const scheduleTime = typeof scheduleData === 'string' ? scheduleData : scheduleData.horario;
    startMonitoring(socket, groupId, scheduleTime);
  });
  isInitialized = true;
}

module.exports = {
  name: "grupo-fechar",
  description: "Programa o fechamento automático do grupo em um horário específico todos os dias (Horário de Brasília).",
  commands: ["grupo-fechar", "agendar-fechamento", "schedule-close"],
  usage: `${PREFIX}grupo-fechar HH:MM\n\nExemplos:\n${PREFIX}grupo-fechar 22:00\n${PREFIX}grupo-fechar 18:30\n${PREFIX}grupo-fechar cancelar`,

  handle: async ({ socket, remoteJid, args, sendSuccessReply, sendErrorReply, sendWarningReply, userJid }) => {
    try {
      initializeSchedules(socket);

      const groupMetadata = await socket.groupMetadata(remoteJid);
      const participants = groupMetadata.participants;
      const userParticipant = participants.find(p => p.id === userJid);
      const isAdmin = userParticipant && (userParticipant.admin === "admin" || userParticipant.admin === "superadmin");

      if (!isAdmin) {
        throw new DangerError("❌ Apenas administradores podem programar fechamento do grupo!");
      }

      let nomeGrupo = "Grupo sem nome";
      try {
        nomeGrupo = groupMetadata?.subject || groupMetadata?.name || "Grupo sem nome";
      } catch (err) {}

      if (!args[0]) {
        const schedules = loadSchedules();
        const currentSchedule = schedules[remoteJid];

        if (currentSchedule) {
          const horario = typeof currentSchedule === 'string' ? currentSchedule : currentSchedule.horario;
          await sendWarningReply(
            `⏰ *Fechamento automático ativo*\n\n` +
              `Horário programado: *${horario}* (Brasília)\n` +
              `🔄 *Repetição:* Todos os dias\n\n` +
              `Para alterar, use: ${PREFIX}grupo-fechar HH:MM\n` +
              `Para cancelar, use: ${PREFIX}grupo-fechar cancelar`
          );
        } else {
          await sendWarningReply(
            `ℹ️ *Nenhum agendamento ativo*\n\n` +
              `Para programar o fechamento do grupo, use:\n` +
              `${PREFIX}grupo-fechar HH:MM\n\n` +
              `Exemplo: ${PREFIX}grupo-fechar 22:00`
          );
        }
        return;
      }

      if (args[0].toLowerCase() === "cancelar" || args[0].toLowerCase() === "cancel") {
        const schedules = loadSchedules();
        if (!schedules[remoteJid]) {
          await sendWarningReply("⚠️ Não há agendamento ativo para este grupo!");
          return;
        }
        delete schedules[remoteJid];
        saveSchedules(schedules);
        if (activeIntervals[remoteJid]) {
          clearInterval(activeIntervals[remoteJid]);
          delete activeIntervals[remoteJid];
        }
        await sendSuccessReply("✅ Agendamento de fechamento cancelado com sucesso!");
        return;
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(args[0])) {
        await sendErrorReply(
          `❌ *Formato inválido!*\n\n` +
            `Use o formato HH:MM (24 horas)\n\n` +
            `Exemplos válidos:\n` +
            `• 22:00\n` +
            `• 18:30\n` +
            `• 23:59`
        );
        return;
      }

      const scheduleTime = args[0];
      const schedules = loadSchedules();
      schedules[remoteJid] = { horario: scheduleTime, nomeGrupo: nomeGrupo };
      saveSchedules(schedules);
      startMonitoring(socket, remoteJid, scheduleTime);
      const brasilia = getBrasiliaTime();

      await sendSuccessReply(
        `✅ *Fechamento programado com sucesso!*\n\n` +
          `⏰ Horário: *${scheduleTime}*\n` +
          `🔄 *Repetição:* Todos os dias\n` +
          `📍 O grupo será fechado automaticamente todos os dias neste horário.\n` +
          `🕐 Horário atual de Brasília: ${brasilia.fullTime}\n\n` +
          `Para cancelar: ${PREFIX}grupo-fechar cancelar`
      );
    } catch (error) {
      if (error instanceof DangerError) {
        await sendErrorReply(error.message);
        return;
      }
      await sendErrorReply(`❌ Ocorreu um erro!\n\nDetalhes: ${error.message}`);
      errorLog(`Erro no comando grupo-fechar: ${error.message}`);
    }
  },
};
