const { PREFIX } = require(`${BASE_DIR}/config`);
const { errorLog } = require(`${BASE_DIR}/utils/logger`);
const { DangerError } = require(`${BASE_DIR}/errors`);
const fs = require("fs");
const path = require("path");

// Arquivo para armazenar os agendamentos
const SCHEDULE_FILE = path.join(
  BASE_DIR,
  "database",
  "grupo-fechar-schedule.json"
);

// Função para obter horário de Brasília (UTC-3)
// CORREÇÃO: Brasília está 3 horas ATRÁS do UTC, não à frente!
function getBrasiliaTime() {
  const now = new Date();
  
  // Pega o horário UTC
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcDate = now.getUTCDate();
  const utcMonth = now.getUTCMonth();
  const utcYear = now.getUTCFullYear();
  
  // Brasília = UTC-3 (SUBTRAIR 3 horas do UTC)
  let hours = utcHours - 3;
  let day = utcDate;
  let month = utcMonth;
  let year = utcYear;
  
  // Ajusta se passar da meia-noite
  if (hours < 0) {
    hours += 24;
    day -= 1;
    
    // Ajusta o dia se necessário
    if (day < 1) {
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
      // Pega o último dia do mês anterior
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

// Controle de execução diária (evita executar múltiplas vezes no mesmo minuto)
const lastExecution = {};

// Verifica e executa fechamento se for o horário
async function checkAndClose(socket, groupId, scheduleTime) {
  try {
    // Obtém horário de Brasília
    const brasilia = getBrasiliaTime();
    const currentHours = brasilia.hours;
    const currentMinutes = brasilia.minutes;
    const currentDate = brasilia.date;
    
    // Horário programado
    const [scheduleHours, scheduleMinutes] = scheduleTime.split(":").map(Number);

    // Cria chave única para este grupo e horário
    const executionKey = `${groupId}-${scheduleTime}`;

    // DEBUG: Log a cada verificação (mostra sempre)
    console.log(`[DEBUG FECHAR] Verificando: Atual=${currentHours}:${currentMinutes} (${currentDate}) vs Programado=${scheduleHours}:${scheduleMinutes}`);

    if (currentHours === scheduleHours && currentMinutes === scheduleMinutes) {
      console.log(`[DEBUG FECHAR] ✅ HORÁRIO COINCIDE!`);
      
      // Verifica se já executou hoje
      const jaExecutouHoje = lastExecution[executionKey] === currentDate;
      console.log(`[DEBUG FECHAR] Já executou hoje? ${jaExecutouHoje} (última execução: ${lastExecution[executionKey] || 'nunca'})`);
      
      if (jaExecutouHoje) {
        console.log(`[DEBUG FECHAR] ⚠️ Pulando execução - já rodou hoje em ${currentDate}`);
        return;
      }
      
      console.log(`[DEBUG FECHAR] 🚀 EXECUTANDO fechamento do grupo...`);
      
      await socket.groupSettingUpdate(groupId, "announcement");
      await socket.sendMessage(groupId, {
        text: `🔒 *Grupo fechado automaticamente!*\n⏰ Horário programado: ${scheduleTime}\n🥷 *Modo silencioso ativado. Shhh…*`,
      });
      
      // Marca como executado hoje
      lastExecution[executionKey] = currentDate;
      console.log(`[DEBUG FECHAR] ✅ Marcado como executado em: ${currentDate}`);
      
      console.log(`[AUTO-FECHAR] ✅ Grupo fechado com sucesso!`);
    }
  } catch (error) {
    console.error(`[DEBUG FECHAR] ❌ ERRO:`, error);
    errorLog(
      `Erro ao fechar grupo automaticamente: ${JSON.stringify(error, null, 2)}`
    );
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
    checkAndClose(socket, groupId, scheduleTime);
  }, 60000); // 60000ms = 1 minuto

  // Verifica imediatamente também
  checkAndClose(socket, groupId, scheduleTime);
}

// Inicializa agendamentos ao carregar o comando
function initializeSchedules(socket) {
  if (isInitialized) return; // Evita inicializar múltiplas vezes
  
  const schedules = loadSchedules();
  Object.entries(schedules).forEach(([groupId, scheduleTime]) => {
    startMonitoring(socket, groupId, scheduleTime);
  });
  
  isInitialized = true;
  
  const brasilia = getBrasiliaTime();
  console.log(`[grupo-fechar] ${Object.keys(schedules).length} agendamento(s) inicializado(s)`);
  console.log(`[grupo-fechar] Horário atual de Brasília: ${brasilia.fullTime} (${brasilia.date})`);
}

module.exports = {
  name: "grupo-fechar",
  description:
    "Programa o fechamento automático do grupo em um horário específico todos os dias (Horário de Brasília).",
  commands: ["grupo-fechar", "agendar-fechamento", "schedule-close"],
  usage: `${PREFIX}grupo-fechar HH:MM\n\nExemplos:\n${PREFIX}grupo-fechar 22:00\n${PREFIX}grupo-fechar 18:30\n${PREFIX}grupo-fechar cancelar`,

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
          "❌ Apenas administradores podem programar fechamento do grupo!"
        );
      }

      // Verifica se foi passado argumento
      if (!args[0]) {
        const schedules = loadSchedules();
        const currentSchedule = schedules[remoteJid];

        if (currentSchedule) {
          await sendWarningReply(
            `⏰ *Fechamento automático ativo*\n\n` +
              `Horário programado: *${currentSchedule}* (Brasília)\n` +
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
          "✅ Agendamento de fechamento cancelado com sucesso!"
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
            `• 22:00\n` +
            `• 18:30\n` +
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

      // Obtém horário atual de Brasília
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
      
      console.error("[GRUPO-FECHAR] Erro detalhado:", error);
      console.error("[GRUPO-FECHAR] Stack:", error.stack);
      
      await sendErrorReply(
        `❌ Ocorreu um erro ao programar o fechamento do grupo!\n\nDetalhes: ${error.message}`
      );
      errorLog(
        `Erro no comando grupo-fechar: ${error.message}\nStack: ${error.stack}`
      );
    }
  },
};
