/**
 * INSTALAÇÃO: /sdcard/DeadBoT-/src/commands/owner/ver-agendamento-global.js
 * COMANDO RENOMEADO: #ver-agendamento-global (antes era #ver-status-global)
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const fs = require("fs");
const path = require("path");

const ABRIR_SCHEDULE_FILE = path.join(BASE_DIR, "..", "database", "grupo-abrir-schedule.json");
const FECHAR_SCHEDULE_FILE = path.join(BASE_DIR, "..", "database", "grupo-fechar-schedule.json");
const ABRIR_LAST_EXECUTION_FILE = path.join(BASE_DIR, "..", "database", "grupo-abrir-last-execution.json");
const FECHAR_LAST_EXECUTION_FILE = path.join(BASE_DIR, "..", "database", "grupo-fechar-last-execution.json");

function loadData(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Erro ao carregar ${filePath}:`, error.message);
  }
  return {};
}

module.exports = {
  name: "ver-agendamento-global",
  description: "Mostra TODOS os agendamentos de TODOS os grupos (apenas owner).",
  commands: ["ver-agendamento-global", "ver-agendamentos-global", "ver-status-global", "status-global", "listar-todos"],
  usage: `${PREFIX}ver-agendamento-global`,

  handle: async ({ sendSuccessReply, sendWarningReply }) => {
    try {
      const abrirSchedules = loadData(ABRIR_SCHEDULE_FILE);
      const fecharSchedules = loadData(FECHAR_SCHEDULE_FILE);
      const abrirLastExec = loadData(ABRIR_LAST_EXECUTION_FILE);
      const fecharLastExec = loadData(FECHAR_LAST_EXECUTION_FILE);

      const totalAbertura = Object.keys(abrirSchedules).length;
      const totalFechamento = Object.keys(fecharSchedules).length;
      const totalGeral = totalAbertura + totalFechamento;

      if (totalGeral === 0) {
        await sendWarningReply(
          `ℹ️ *Nenhum agendamento ativo*\n\n` +
          `Não há agendamentos em nenhum grupo.`
        );
        return;
      }

      const gruposPorId = {};

      for (const [groupId, scheduleData] of Object.entries(abrirSchedules)) {
        const horario = typeof scheduleData === 'string' ? scheduleData : scheduleData.horario;
        const nomeGrupo = typeof scheduleData === 'object' ? scheduleData.nomeGrupo : 'Grupo sem nome';
        
        if (!gruposPorId[groupId]) {
          gruposPorId[groupId] = { name: nomeGrupo, id: groupId, aberturas: [], fechamentos: [] };
        }
        
        const key = `${groupId}-${horario}`;
        const lastExec = abrirLastExec[key] || 'nunca';
        gruposPorId[groupId].aberturas.push({ horario, ultimaExec: lastExec });
      }

      for (const [groupId, scheduleData] of Object.entries(fecharSchedules)) {
        const horario = typeof scheduleData === 'string' ? scheduleData : scheduleData.horario;
        const nomeGrupo = typeof scheduleData === 'object' ? scheduleData.nomeGrupo : 'Grupo sem nome';
        
        if (!gruposPorId[groupId]) {
          gruposPorId[groupId] = { name: nomeGrupo, id: groupId, aberturas: [], fechamentos: [] };
        }
        
        const key = `${groupId}-${horario}`;
        const lastExec = fecharLastExec[key] || 'nunca';
        gruposPorId[groupId].fechamentos.push({ horario, ultimaExec: lastExec });
      }

      let mensagem = `🌍 *STATUS GLOBAL DE AGENDAMENTOS*\n\n`;
      mensagem += `📊 Total: ${totalGeral} agendamento(s)\n`;
      mensagem += `📍 Grupos: ${Object.keys(gruposPorId).length}\n`;
      mensagem += `🟢 Aberturas: ${totalAbertura}\n`;
      mensagem += `🔴 Fechamentos: ${totalFechamento}\n\n`;
      mensagem += `━━━━━━━━━━━━━━━━━━\n\n`;

      let grupoNum = 1;
      for (const grupo of Object.values(gruposPorId)) {
        mensagem += `*${grupoNum}. ${grupo.name}*\n`;
        mensagem += `🆔 \`${grupo.id}\`\n\n`;

        if (grupo.aberturas.length > 0) {
          mensagem += `🟢 Abertura(s):\n`;
          grupo.aberturas.forEach((ag, idx) => {
            mensagem += `  ${idx + 1}. ⏰ ${ag.horario} (última: ${ag.ultimaExec})\n`;
          });
        }

        if (grupo.fechamentos.length > 0) {
          mensagem += `🔴 Fechamento(s):\n`;
          grupo.fechamentos.forEach((ag, idx) => {
            mensagem += `  ${idx + 1}. ⏰ ${ag.horario} (última: ${ag.ultimaExec})\n`;
          });
        }

        mensagem += `\n`;
        grupoNum++;
      }

      mensagem += `━━━━━━━━━━━━━━━━━━\n\n`;
      mensagem += `⚠️ *Para resetar TUDO:*\n`;
      mensagem += `${PREFIX}resetar-agendamento-global`;

      await sendSuccessReply(mensagem);

    } catch (error) {
      console.error("[VER-AGENDAMENTO-GLOBAL] Erro:", error);
      await sendWarningReply(`❌ Erro ao buscar agendamentos: ${error.message}`);
    }
  },
};
