/**
 * INSTALAÇÃO: /sdcard/DeadBoT-/src/commands/admin/resetar-agendamento.js
 * COMANDO RENOMEADO: #resetar-agendamento (singular)
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

function saveData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Erro ao salvar ${filePath}:`, error.message);
  }
}

module.exports = {
  name: "resetar-agendamento",
  description: "Remove todos os agendamentos deste grupo (abertura e fechamento).",
  commands: ["resetar-agendamento", "resetar-agendamentos", "limpar-agendamentos", "cancelar-todos"],
  usage: `${PREFIX}resetar-agendamento`,

  handle: async ({ remoteJid, sendSuccessReply, sendWarningReply, userJid, socket }) => {
    try {
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const participants = groupMetadata.participants;
      const userParticipant = participants.find(p => p.id === userJid);
      const isAdmin = userParticipant && (userParticipant.admin === "admin" || userParticipant.admin === "superadmin");

      if (!isAdmin) {
        throw new DangerError("❌ Apenas administradores podem resetar os agendamentos!");
      }

      let abrirSchedules = loadData(ABRIR_SCHEDULE_FILE);
      let fecharSchedules = loadData(FECHAR_SCHEDULE_FILE);
      let abrirLastExec = loadData(ABRIR_LAST_EXECUTION_FILE);
      let fecharLastExec = loadData(FECHAR_LAST_EXECUTION_FILE);

      let countAbrirSchedules = 0;
      let countFecharSchedules = 0;

      if (abrirSchedules[remoteJid]) {
        delete abrirSchedules[remoteJid];
        countAbrirSchedules++;
      }

      if (fecharSchedules[remoteJid]) {
        delete fecharSchedules[remoteJid];
        countFecharSchedules++;
      }

      Object.keys(abrirLastExec).forEach(key => {
        if (key.startsWith(remoteJid)) {
          delete abrirLastExec[key];
        }
      });

      Object.keys(fecharLastExec).forEach(key => {
        if (key.startsWith(remoteJid)) {
          delete fecharLastExec[key];
        }
      });

      const totalRemovido = countAbrirSchedules + countFecharSchedules;

      if (totalRemovido === 0) {
        await sendWarningReply("⚠️ Não há agendamentos para remover neste grupo!");
        return;
      }

      saveData(ABRIR_SCHEDULE_FILE, abrirSchedules);
      saveData(FECHAR_SCHEDULE_FILE, fecharSchedules);
      saveData(ABRIR_LAST_EXECUTION_FILE, abrirLastExec);
      saveData(FECHAR_LAST_EXECUTION_FILE, fecharLastExec);

      let mensagem = `✅ *Agendamentos resetados com sucesso!*\n\n`;
      mensagem += `🗑️ *Removidos:*\n`;
      if (countAbrirSchedules > 0) {
        mensagem += `• ${countAbrirSchedules} agendamento(s) de ABERTURA\n`;
      }
      if (countFecharSchedules > 0) {
        mensagem += `• ${countFecharSchedules} agendamento(s) de FECHAMENTO\n`;
      }

      await sendSuccessReply(mensagem);

    } catch (error) {
      if (error instanceof DangerError) {
        await sendWarningReply(error.message);
        return;
      }
      
      console.error("[RESETAR-AGENDAMENTO] Erro:", error);
      await sendWarningReply(`❌ Erro ao resetar agendamentos: ${error.message}`);
    }
  },
};
