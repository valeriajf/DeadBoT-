/**
 * INSTALAÇÃO: /sdcard/DeadBoT-/src/utils/scheduleAutoInit.js
 * VERSÃO SEM LOGS DE DEBUG
 */
const fs = require("fs");
const path = require("path");
const { errorLog } = require(`${BASE_DIR}/utils/logger`);

const ABRIR_SCHEDULE_FILE = path.join(BASE_DIR, "..", "database", "grupo-abrir-schedule.json");
const FECHAR_SCHEDULE_FILE = path.join(BASE_DIR, "..", "database", "grupo-fechar-schedule.json");
const ABRIR_LAST_EXECUTION_FILE = path.join(BASE_DIR, "..", "database", "grupo-abrir-last-execution.json");
const FECHAR_LAST_EXECUTION_FILE = path.join(BASE_DIR, "..", "database", "grupo-fechar-last-execution.json");

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

function loadSchedules(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    errorLog(`Erro ao carregar ${filePath}: ${error.message}`);
  }
  return {};
}

function loadLastExecutions(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    errorLog(`Erro ao carregar ${filePath}: ${error.message}`);
  }
  return {};
}

function saveLastExecutions(filePath, executions) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(executions, null, 2));
  } catch (error) {
    errorLog(`Erro ao salvar ${filePath}: ${error.message}`);
  }
}

const activeIntervals = { abrir: {}, fechar: {} };
const lastExecution = {
  abrir: loadLastExecutions(ABRIR_LAST_EXECUTION_FILE),
  fechar: loadLastExecutions(FECHAR_LAST_EXECUTION_FILE)
};

async function checkAndOpen(socket, groupId, scheduleTime) {
  try {
    const brasilia = getBrasiliaTime();
    const currentHours = brasilia.hours;
    const currentMinutes = brasilia.minutes;
    const currentDate = brasilia.date;
    const [scheduleHours, scheduleMinutes] = scheduleTime.split(":").map(Number);
    const executionKey = `${groupId}-${scheduleTime}`;

    if (currentHours === scheduleHours && currentMinutes === scheduleMinutes) {
      const jaExecutouHoje = lastExecution.abrir[executionKey] === currentDate;
      if (jaExecutouHoje) return;
      
      let sucesso = false;
      let tentativa = 0;
      const maxTentativas = 3;
      
      while (!sucesso && tentativa < maxTentativas) {
        tentativa++;
        try {
          await socket.groupSettingUpdate(groupId, "not_announcement");
          await socket.sendMessage(groupId, {
            text: `✅ *Grupo aberto automaticamente!*\n⏰ Horário: ${scheduleTime}\n🍿 *Pode começar o show !!!*`,
          });
          sucesso = true;
        } catch (retryError) {
          if (tentativa < maxTentativas) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      if (sucesso) {
        lastExecution.abrir[executionKey] = currentDate;
        saveLastExecutions(ABRIR_LAST_EXECUTION_FILE, lastExecution.abrir);
      }
    }
  } catch (error) {
    errorLog(`Erro ao abrir grupo ${groupId}: ${error.message}`);
  }
}

async function checkAndClose(socket, groupId, scheduleTime) {
  try {
    const brasilia = getBrasiliaTime();
    const currentHours = brasilia.hours;
    const currentMinutes = brasilia.minutes;
    const currentDate = brasilia.date;
    const [scheduleHours, scheduleMinutes] = scheduleTime.split(":").map(Number);
    const executionKey = `${groupId}-${scheduleTime}`;

    if (currentHours === scheduleHours && currentMinutes === scheduleMinutes) {
      const jaExecutouHoje = lastExecution.fechar[executionKey] === currentDate;
      if (jaExecutouHoje) return;
      
      let sucesso = false;
      let tentativa = 0;
      const maxTentativas = 3;
      
      while (!sucesso && tentativa < maxTentativas) {
        tentativa++;
        try {
          await socket.groupSettingUpdate(groupId, "announcement");
          await socket.sendMessage(groupId, {
            text: `🔒 *Grupo fechado automaticamente!*\n⏰ Horário: ${scheduleTime}\n🥷 *Modo silencioso ativado. Shhh…*`,
          });
          sucesso = true;
        } catch (retryError) {
          if (tentativa < maxTentativas) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      if (sucesso) {
        lastExecution.fechar[executionKey] = currentDate;
        saveLastExecutions(FECHAR_LAST_EXECUTION_FILE, lastExecution.fechar);
      }
    }
  } catch (error) {
    errorLog(`Erro ao fechar grupo ${groupId}: ${error.message}`);
  }
}

function startAbrirMonitoring(socket, groupId, scheduleTime) {
  if (activeIntervals.abrir[groupId]) {
    clearInterval(activeIntervals.abrir[groupId]);
  }
  activeIntervals.abrir[groupId] = setInterval(() => {
    checkAndOpen(socket, groupId, scheduleTime);
  }, 60000);
  checkAndOpen(socket, groupId, scheduleTime);
}

function startFecharMonitoring(socket, groupId, scheduleTime) {
  if (activeIntervals.fechar[groupId]) {
    clearInterval(activeIntervals.fechar[groupId]);
  }
  activeIntervals.fechar[groupId] = setInterval(() => {
    checkAndClose(socket, groupId, scheduleTime);
  }, 60000);
  checkAndClose(socket, groupId, scheduleTime);
}

function autoInitSchedules(socket) {
  console.log("🔄 Inicializando agendamentos automáticos...");
  
  const brasilia = getBrasiliaTime();
  console.log(`🕐 Horário de Brasília: ${brasilia.fullTime} (${brasilia.date})`);

  const abrirSchedules = loadSchedules(ABRIR_SCHEDULE_FILE);
  let abrirCount = 0;
  Object.entries(abrirSchedules).forEach(([groupId, scheduleData]) => {
    const scheduleTime = typeof scheduleData === 'string' ? scheduleData : scheduleData.horario;
    startAbrirMonitoring(socket, groupId, scheduleTime);
    abrirCount++;
  });

  const fecharSchedules = loadSchedules(FECHAR_SCHEDULE_FILE);
  let fecharCount = 0;
  Object.entries(fecharSchedules).forEach(([groupId, scheduleData]) => {
    const scheduleTime = typeof scheduleData === 'string' ? scheduleData : scheduleData.horario;
    startFecharMonitoring(socket, groupId, scheduleTime);
    fecharCount++;
  });

  console.log(`✅ ${abrirCount} ABERTURA(s) + ${fecharCount} FECHAMENTO(s) carregado(s)\n`);
}

module.exports = { autoInitSchedules };
