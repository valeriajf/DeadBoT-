/**
 * src/commands/admin/mensagem-diaria.js
 *
 * Ativa ou desativa a mensagem diária automática por grupo.
 * O envio em si é feito pelo serviço: src/services/mensagemDiariaScheduler.js
 *
 * Uso: !mensagem-diaria 1 (ativar) | !mensagem-diaria 0 (desativar)
 *
 * @author DeadBoT
 */

const path = require("node:path");
const fs = require("node:fs");
const { PREFIX } = require(`${BASE_DIR}/config`);

const DB_PATH = path.join(BASE_DIR, "../database/mensagemDiaria.json");

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}), "utf-8");
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = {
  name: "mensagem-diaria",
  description: "Ativa ou desativa a mensagem diária automática às 08:00 (Brasília)",
  commands: ["mensagem-diaria"],
  usage: `${PREFIX}mensagem-diaria 1 ou 0`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ socket, remoteJid, userJid, args, sendReply }) => {
    // Só em grupos
    if (!remoteJid || !remoteJid.endsWith("@g.us")) {
      return sendReply("❌ Este comando só pode ser usado em *grupos*!");
    }

    // Verifica admin manualmente nos metadados do grupo
    let isAdmin = false;
    try {
      const { participants } = await socket.groupMetadata(remoteJid);
      const me = participants.find((p) => {
        const pNum = p.id.replace(/[^0-9]/g, "");
        const uNum = userJid.replace(/[^0-9]/g, "");
        return pNum === uNum;
      });
      isAdmin = me?.admin === "admin" || me?.admin === "superadmin";
    } catch (_) {}

    if (!isAdmin) {
      return sendReply("🚫 Apenas *administradores* podem usar este comando!");
    }

    const db = loadDB();
    const ativo = db[remoteJid] || false;

    // Sem argumento: mostra status
    if (!args || !args[0]) {
      const status = ativo ? "✅ *ATIVADA*" : "❌ *DESATIVADA*";
      return sendReply(
        `💌 *Mensagem Diária — DeadBoT*\n\n` +
        `Status neste grupo: ${status}\n\n` +
        `*${PREFIX}mensagem-diaria 1* → ativar\n` +
        `*${PREFIX}mensagem-diaria 0* → desativar`
      );
    }

    const param = args[0].trim();

    // ATIVAR
    if (param === "1") {
      if (ativo) {
        return sendReply(
          `✅ A mensagem diária já está *ativada* neste grupo!\nChego todo dia às *08:00* (Brasília) 🌅`
        );
      }
      db[remoteJid] = true;
      saveDB(db);

      return sendReply(
        `✅ *Mensagem Diária ATIVADA!* 🎉\n\n` +
        `📅 Todo dia às *08:00* (Brasília) vou mandar:\n\n` +
        `📆 Data e dia da semana\n` +
        `🌚 Fase da lua\n` +
        `⏳ Contagem regressiva pro fim do ano\n` +
        `🎯 Missão com dois membros sorteados\n` +
        `✨ Sabedoria do dia\n` +
        `🚨 Alerta de feriados nacionais\n\n` +
        `💚 _By DeadBoT_`
      );
    }

    // DESATIVAR
    if (param === "0") {
      if (!ativo) {
        return sendReply("❌ A mensagem diária já está *desativada* neste grupo!");
      }
      db[remoteJid] = false;
      saveDB(db);

      return sendReply(
        `❌ *Mensagem Diária DESATIVADA.*\n\n` +
        `Use *${PREFIX}mensagem-diaria 1* para reativar. 💚`
      );
    }

    // Parâmetro inválido
    return sendReply(
      `⚠️ Parâmetro inválido!\n\n` +
      `*${PREFIX}mensagem-diaria 1* → ativar\n` +
      `*${PREFIX}mensagem-diaria 0* → desativar`
    );
  },
};
