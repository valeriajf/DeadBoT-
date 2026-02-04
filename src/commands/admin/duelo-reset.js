// 📁 src/commands/admin/duelo-reset.js
// Comando para resetar todos os duelos (APENAS ADMINS)

const { PREFIX } = require(`${BASE_DIR}/config`);
const path = require("path");
const fs = require("fs");

const DUELOS_DB_PATH = path.join(BASE_DIR, "..", "database", "duelos-agendados.json");

function loadDuelos() {
  try {
    if (!fs.existsSync(DUELOS_DB_PATH)) {
      fs.writeFileSync(DUELOS_DB_PATH, JSON.stringify({}), "utf8");
      return {};
    }
    const data = fs.readFileSync(DUELOS_DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Erro ao carregar duelos:", error);
    return {};
  }
}

function saveDuelos(duelos) {
  try {
    fs.writeFileSync(DUELOS_DB_PATH, JSON.stringify(duelos, null, 2), "utf8");
  } catch (error) {
    console.error("Erro ao salvar duelos:", error);
  }
}

module.exports = {
  name: "duelo-reset",
  description: "Deleta todos os duelos agendados (apenas administradores)",
  commands: ["duelo-reset", "dueloreset"],
  usage: `${PREFIX}duelo-reset`,
  
  handle: async ({ remoteJid, sendSuccessReply, sendErrorReply }) => {
    try {
      const duelos = loadDuelos();
      const dataAtual = new Date().toLocaleDateString("pt-BR");
      
      // Contar e remover duelos do grupo
      let removidos = 0;
      for (const chave in duelos) {
        if (chave.startsWith(`${remoteJid}_${dataAtual}`)) {
          delete duelos[chave];
          removidos++;
        }
      }

      saveDuelos(duelos);

      if (removidos === 0) {
        await sendSuccessReply("📋 Não há duelos para remover.");
      } else {
        await sendSuccessReply(
          `🗑️ *DUELOS RESETADOS!*\n\n` +
          `${removidos} duelo(s) removido(s) com sucesso.`
        );
      }
    } catch (error) {
      console.error("Erro ao resetar duelos:", error);
      await sendErrorReply(`❌ Erro ao resetar duelos: ${error.message}`);
    }
  },
};