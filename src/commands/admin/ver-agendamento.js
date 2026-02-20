/**
 * INSTALAÇÃO: /sdcard/DeadBoT-/src/commands/admin/ver-agendamento.js
 * COMANDO RENOMEADO: #ver-agendamento (antes era #ver-status)
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const { DangerError } = require(`${BASE_DIR}/errors`);
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
  name: "ver-agendamento",
  description: "Mostra todos os agendamentos ativos do grupo (abertura e fechamento).",
  commands: ["ver-agendamento", "ver-agendamentos", "status-agendamento", "ver-status"],
  usage: `${PREFIX}ver-agendamento`,

  handle: async ({ remoteJid, sendSuccessReply, sendWarningReply, userJid, socket }) => {
    try {
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const participants = groupMetadata.participants;
      const userParticipant = participants.find(p => p.id === userJid);
      const isAdmin = userParticipant && (userParticipant.admin === "admin" || userParticipant.admin === "superadmin");

      if (!isAdmin) {
        throw new DangerError("❌ Apenas administradores podem ver os agendamentos!");
      }

      const abrirSchedules = loadData(ABRIR_SCHEDULE_FILE);
      const fecharSchedules = loadData(FECHAR_SCHEDULE_FILE);
      const abrirLastExec = loadData(ABRIR_LAST_EXECUTION_FILE);
      const fecharLastExec = loadData(FECHAR_LAST_EXECUTION_FILE);

      const grupoAbrir = Object.entries(abrirSchedules)
        .filter(([groupId]) => groupId === remoteJid)
        .map(([groupId, scheduleData]) => {
          const horario = typeof scheduleData === 'string' ? scheduleData : scheduleData.horario;
          const key = `${groupId}-${horario}`;
          const lastExec = abrirLastExec[key] || 'nunca';
          return { tipo: 'Abertura', horario, ultimaExec: lastExec };
        });

      const grupoFechar = Object.entries(fecharSchedules)
        .filter(([groupId]) => groupId === remoteJid)
        .map(([groupId, scheduleData]) => {
          const horario = typeof scheduleData === 'string' ? scheduleData : scheduleData.horario;
          const key = `${groupId}-${horario}`;
          const lastExec = fecharLastExec[key] || 'nunca';
          return { tipo: 'Fechamento', horario, ultimaExec: lastExec };
        });

      const totalAgendamentos = grupoAbrir.length + grupoFechar.length;

      if (totalAgendamentos === 0) {
        await sendWarningReply(
          `ℹ️ *Nenhum agendamento ativo*\n\n` +
          `Este grupo não possui agendamentos de abertura ou fechamento programados.`
        );
        return;
      }

      let mensagem = `📊 *STATUS DOS AGENDAMENTOS*\n\n`;
      mensagem += `📍 Total: ${totalAgendamentos} agendamento(s)\n\n`;

      if (grupoAbrir.length > 0) {
        mensagem += `🟢 *ABERTURA* (${grupoAbrir.length})\n`;
        grupoAbrir.forEach((ag, idx) => {
          mensagem += `${idx + 1}. ⏰ ${ag.horario}\n`;
          mensagem += `   📅 Última execução: ${ag.ultimaExec}\n`;
        });
        mensagem += `\n`;
      }

      if (grupoFechar.length > 0) {
        mensagem += `🔴 *FECHAMENTO* (${grupoFechar.length})\n`;
        grupoFechar.forEach((ag, idx) => {
          mensagem += `${idx + 1}. ⏰ ${ag.horario}\n`;
          mensagem += `   📅 Última execução: ${ag.ultimaExec}\n`;
        });
      }

      mensagem += `\n⚠️ *Para resetar todos os agendamentos:*\n`;
      mensagem += `${PREFIX}resetar-agendamentos`;

      await sendSuccessReply(mensagem);

    } catch (error) {
      if (error instanceof DangerError) {
        await sendWarningReply(error.message);
        return;
      }
      
      console.error("[VER-AGENDAMENTO] Erro:", error);
      await sendWarningReply(`❌ Erro ao buscar agendamentos: ${error.message}`);
    }
  },
};
