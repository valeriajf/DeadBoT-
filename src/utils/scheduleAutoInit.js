/**
 * AUTO-INICIALIZADOR DE AGENDAMENTOS
 * 
 * Este arquivo deve ser carregado automaticamente quando o bot iniciar.
 * Ele garante que os agendamentos salvos sejam reativados após reiniciar o bot.
 * 
 * GARANTIA: Funciona em qualquer host/servidor
 * CORREÇÃO: Brasília = UTC-3 (SUBTRAIR 3 horas do UTC, não somar!)
 * CORREÇÃO: Agora executa TODOS OS DIAS no horário programado!
 * 
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 
 * Adicione no src/loader.js após carregar os comandos:
 * 
 * setTimeout(() => {
 *   try {
 *     const { autoInitSchedules } = require('./utils/scheduleAutoInit');
 *     autoInitSchedules(socket);
 *   } catch (error) {
 *     console.error('Erro ao inicializar agendamentos:', error.message);
 *   }
 * }, 3000);
 */

const fs = require("fs");
const path = require("path");

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

// Controle de execução diária
const lastExecution = {
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
  try {
    // Obtém horário de Brasília
    const brasilia = getBrasiliaTime();
    const currentHours = brasilia.hours;
    const currentMinutes = brasilia.minutes;
    const currentDate = brasilia.date;
    
    // Horário programado
    const [scheduleHours, scheduleMinutes] = scheduleTime.split(":").map(Number);

    // Cria chave única
    const executionKey = `${groupId}-${scheduleTime}`;

    // DEBUG: Log a cada verificação (mostra sempre)
    console.log(`[DEBUG AUTO-ABRIR] Verificando: Atual=${currentHours}:${currentMinutes} (${currentDate}) vs Programado=${scheduleHours}:${scheduleMinutes}`);

    if (currentHours === scheduleHours && currentMinutes === scheduleMinutes) {
      console.log(`[DEBUG AUTO-ABRIR] ✅ HORÁRIO COINCIDE!`);
      
      // Verifica se já executou hoje
      const jaExecutouHoje = lastExecution.abrir[executionKey] === currentDate;
      console.log(`[DEBUG AUTO-ABRIR] Já executou hoje? ${jaExecutouHoje} (última execução: ${lastExecution.abrir[executionKey] || 'nunca'})`);
      
      if (jaExecutouHoje) {
        console.log(`[DEBUG AUTO-ABRIR] ⚠️ Pulando execução - já rodou hoje em ${currentDate}`);
        return;
      }

      console.log(`[DEBUG AUTO-ABRIR] 🚀 EXECUTANDO abertura do grupo...`);
      
      await socket.groupSettingUpdate(groupId, "not_announcement");
      await socket.sendMessage(groupId, {
        text: `✅ *Grupo aberto automaticamente!*\n⏰ Horário programado: ${scheduleTime}\n🍿 *Pode começar o show !!!*`,
      });
      
      // Marca como executado hoje
      lastExecution.abrir[executionKey] = currentDate;
      console.log(`[DEBUG AUTO-ABRIR] ✅ Marcado como executado em: ${currentDate}`);
      
      console.log(`[AUTO-ABRIR] ✅ Grupo aberto com sucesso!`);
    }
  } catch (error) {
    console.error(`[DEBUG AUTO-ABRIR] ❌ ERRO:`, error);
    console.error(`Erro ao abrir grupo ${groupId}:`, error.message);
  }
}

// Verifica e executa fechamento
async function checkAndClose(socket, groupId, scheduleTime) {
  try {
    // Obtém horário de Brasília
    const brasilia = getBrasiliaTime();
    const currentHours = brasilia.hours;
    const currentMinutes = brasilia.minutes;
    const currentDate = brasilia.date;
    
    // Horário programado
    const [scheduleHours, scheduleMinutes] = scheduleTime.split(":").map(Number);

    // Cria chave única
    const executionKey = `${groupId}-${scheduleTime}`;

    // DEBUG: Log a cada verificação (mostra sempre)
    console.log(`[DEBUG AUTO-FECHAR] Verificando: Atual=${currentHours}:${currentMinutes} (${currentDate}) vs Programado=${scheduleHours}:${scheduleMinutes}`);

    if (currentHours === scheduleHours && currentMinutes === scheduleMinutes) {
      console.log(`[DEBUG AUTO-FECHAR] ✅ HORÁRIO COINCIDE!`);
      
      // Verifica se já executou hoje
      const jaExecutouHoje = lastExecution.fechar[executionKey] === currentDate;
      console.log(`[DEBUG AUTO-FECHAR] Já executou hoje? ${jaExecutouHoje} (última execução: ${lastExecution.fechar[executionKey] || 'nunca'})`);
      
      if (jaExecutouHoje) {
        console.log(`[DEBUG AUTO-FECHAR] ⚠️ Pulando execução - já rodou hoje em ${currentDate}`);
        return;
      }

      console.log(`[DEBUG AUTO-FECHAR] 🚀 EXECUTANDO fechamento do grupo...`);
      
      await socket.groupSettingUpdate(groupId, "announcement");
      await socket.sendMessage(groupId, {
        text: `🔒 *Grupo fechado automaticamente!*\n⏰ Horário programado: ${scheduleTime}\n🥷 *Modo silencioso ativado. Shhh…*`,
      });
      
      // Marca como executado hoje
      lastExecution.fechar[executionKey] = currentDate;
      console.log(`[DEBUG AUTO-FECHAR] ✅ Marcado como executado em: ${currentDate}`);
      
      console.log(`[AUTO-FECHAR] ✅ Grupo fechado com sucesso!`);
    }
  } catch (error) {
    console.error(`[DEBUG AUTO-FECHAR] ❌ ERRO:`, error);
    console.error(`Erro ao fechar grupo ${groupId}:`, error.message);
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
  console.log("\n🔄 Inicializando agendamentos automáticos...");
  
  // Obtém horário atual de Brasília
  const brasilia = getBrasiliaTime();
  console.log(`🕐 Horário atual de Brasília: ${brasilia.fullTime} (${brasilia.date})`);

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
  console.log("🎯 Sistema de agendamentos ativo!");
  console.log("🔄 Execução: TODOS OS DIAS no horário programado (Brasília UTC-3)\n");
}

module.exports = {
  autoInitSchedules,
};
