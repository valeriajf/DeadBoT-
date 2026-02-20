/**
 * INSTALAÇÃO: /sdcard/DeadBoT-/src/commands/owner/resetar-agendamento-global.js
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

function saveData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Erro ao salvar ${filePath}:`, error.message);
  }
}

module.exports = {
  name: "resetar-agendamento-global",
  description: "Remove TODOS os agendamentos de TODOS os grupos (apenas owner).",
  commands: ["resetar-agendamento-global", "limpar-tudo", "resetar-tudo"],
  usage: `${PREFIX}resetar-agendamento-global`,

  handle: async ({ sendSuccessReply, sendWarningReply }) => {
    try {
      const abrirSchedules = loadData(ABRIR_SCHEDULE_FILE);
      const fecharSchedules = loadData(FECHAR_SCHEDULE_FILE);

      const countAbertura = Object.keys(abrirSchedules).length;
      const countFechamento = Object.keys(fecharSchedules).length;
      const totalGrupos = new Set([
        ...Object.keys(abrirSchedules),
        ...Object.keys(fecharSchedules)
      ]).size;

      if (countAbertura === 0 && countFechamento === 0) {
        await sendWarningReply("⚠️ Não há agendamentos para remover!");
        return;
      }

      saveData(ABRIR_SCHEDULE_FILE, {});
      saveData(FECHAR_SCHEDULE_FILE, {});
      saveData(ABRIR_LAST_EXECUTION_FILE, {});
      saveData(FECHAR_LAST_EXECUTION_FILE, {});

      let mensagem = `✅ *RESET GLOBAL COMPLETO!*\n\n`;
      mensagem += `🗑️ *Removidos:*\n`;
      if (countAbertura > 0) {
        mensagem += `• ${countAbertura} agendamento(s) de ABERTURA\n`;
      }
      if (countFechamento > 0) {
        mensagem += `• ${countFechamento} agendamento(s) de FECHAMENTO\n`;
      }
      mensagem += `\n📊 *Totais:*\n`;
      mensagem += `• ${countAbertura + countFechamento} agendamento(s) removido(s)\n`;
      mensagem += `• ${totalGrupos} grupo(s) afetado(s)\n\n`;
      mensagem += `📂 *Arquivos limpos:*\n`;
      mensagem += `✅ grupo-abrir-schedule.json\n`;
      mensagem += `✅ grupo-fechar-schedule.json\n`;
      mensagem += `✅ grupo-abrir-last-execution.json\n`;
      mensagem += `✅ grupo-fechar-last-execution.json`;

      await sendSuccessReply(mensagem);

    } catch (error) {
      console.error("[RESETAR-GLOBAL] Erro:", error);
      await sendWarningReply(`❌ Erro ao resetar: ${error.message}`);
    }
  },
};
