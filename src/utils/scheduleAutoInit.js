/**
 * AUTO-INICIALIZADOR DE AGENDAMENTOS
 * 
 * Este arquivo deve ser carregado automaticamente quando o bot iniciar.
 * Ele garante que os agendamentos salvos sejam reativados após reiniciar o bot.
 * 
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 
 * Opção 1 - Adicionar no src/loader.js (RECOMENDADO):
 * Adicione esta linha após carregar os comandos:
 * 
 * const { autoInitSchedules } = require('./utils/scheduleAutoInit');
 * autoInitSchedules(socket);
 * 
 * Opção 2 - Adicionar no src/index.js ou index.js da raiz:
 * Adicione após o bot conectar:
 * 
 * const { autoInitSchedules } = require('./src/utils/scheduleAutoInit');
 * autoInitSchedules(socket);
 */

const fs = require("fs");
const path = require("path");

// Caminhos dos arquivos de agendamento
const ABRIR_SCHEDULE_FILE = path.join(
  process.cwd(),
  "database",
  "grupo-abrir-schedule.json"
);

const FECHAR_SCHEDULE_FILE = path.join(
  process.cwd(),
  "database",
  "grupo-fechar-schedule.json"
);

// Armazena os intervalos ativos
const activeIntervals = {
  abrir: {},
  fechar: {},
};

// Carrega agendamentos de um arquivo
function loadSchedules(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Erro ao carregar agendamentos de ${filePath}:`, error.message);
  }
  return {};
}

// Verifica e executa abertura
async function checkAndOpen(socket, groupId, scheduleTime) {
  // Obtém horário de Brasília
  const now = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
  });
  
  // Extrai hora e minuto do horário atual de Brasília
  const [datePart, timePart] = now.split(", ");
  const [currentHours, currentMinutes] = timePart.split(":").map(Number);
  
  // Horário programado
  const [scheduleHours, scheduleMinutes] = scheduleTime.split(":").map(Number);

  if (currentHours === scheduleHours && currentMinutes === scheduleMinutes) {
    try {
      await socket.groupSettingUpdate(groupId, "not_announcement");
      await socket.sendMessage(groupId, {
        text: `✅ *Grupo aberto automaticamente!*\n⏰ Horário programado: ${scheduleTime}\n🍿 *Pode começar o show !!!*`,
      });
      console.log(`[AUTO-ABRIR] Grupo ${groupId} aberto às ${scheduleTime} (Horário de Brasília)`);
    } catch (error) {
      console.error(`Erro ao abrir grupo ${groupId}:`, error.message);
    }
  }
}

// Verifica e executa fechamento
async function checkAndClose(socket, groupId, scheduleTime) {
  // Obtém horário de Brasília
  const now = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
  });
  
  // Extrai hora e minuto do horário atual de Brasília
  const [datePart, timePart] = now.split(", ");
  const [currentHours, currentMinutes] = timePart.split(":").map(Number);
  
  // Horário programado
  const [scheduleHours, scheduleMinutes] = scheduleTime.split(":").map(Number);

  if (currentHours === scheduleHours && currentMinutes === scheduleMinutes) {
    try {
      await socket.groupSettingUpdate(groupId, "announcement");
      await socket.sendMessage(groupId, {
        text: `🔒 *Grupo fechado automaticamente!*\n⏰ Horário programado: ${scheduleTime}\n🥷 *Modo silencioso ativado. Shhh…*`,
      });
      console.log(`[AUTO-FECHAR] Grupo ${groupId} fechado às ${scheduleTime} (Horário de Brasília)`);
    } catch (error) {
      console.error(`Erro ao fechar grupo ${groupId}:`, error.message);
    }
  }
}

// Inicia monitoramento de abertura
function startAbrirMonitoring(socket, groupId, scheduleTime) {
  if (activeIntervals.abrir[groupId]) {
    clearInterval(activeIntervals.abrir[groupId]);
  }

  activeIntervals.abrir[groupId] = setInterval(() => {
    checkAndOpen(socket, groupId, scheduleTime);
  }, 60000);

  checkAndOpen(socket, groupId, scheduleTime);
}

// Inicia monitoramento de fechamento
function startFecharMonitoring(socket, groupId, scheduleTime) {
  if (activeIntervals.fechar[groupId]) {
    clearInterval(activeIntervals.fechar[groupId]);
  }

  activeIntervals.fechar[groupId] = setInterval(() => {
    checkAndClose(socket, groupId, scheduleTime);
  }, 60000);

  checkAndClose(socket, groupId, scheduleTime);
}

// Função principal de auto-inicialização
function autoInitSchedules(socket) {
  // Mostra horário atual de Brasília
  const brasiliaTime = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
  });
  
  console.log("\n🔄 Inicializando agendamentos automáticos...");
  console.log(`🕐 Horário atual de Brasília: ${brasiliaTime}`);

  // Carrega e inicializa agendamentos de abertura
  const abrirSchedules = loadSchedules(ABRIR_SCHEDULE_FILE);
  let abrirCount = 0;
  Object.entries(abrirSchedules).forEach(([groupId, scheduleTime]) => {
    startAbrirMonitoring(socket, groupId, scheduleTime);
    abrirCount++;
  });

  // Carrega e inicializa agendamentos de fechamento
  const fecharSchedules = loadSchedules(FECHAR_SCHEDULE_FILE);
  let fecharCount = 0;
  Object.entries(fecharSchedules).forEach(([groupId, scheduleTime]) => {
    startFecharMonitoring(socket, groupId, scheduleTime);
    fecharCount++;
  });

  console.log(`✅ ${abrirCount} agendamento(s) de ABERTURA carregado(s)`);
  console.log(`✅ ${fecharCount} agendamento(s) de FECHAMENTO carregado(s)`);
  console.log("🎯 Sistema de agendamentos ativo!\n");
}

module.exports = {
  autoInitSchedules,
};
