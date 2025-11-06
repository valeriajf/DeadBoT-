const fs = require("fs");
const path = require("path");
const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);

const EXIT2_DB_PATH = path.join(__dirname, "../../database/exit-messages.json");

function loadExitData() {
  try {
    if (fs.existsSync(EXIT2_DB_PATH)) {
      return JSON.parse(fs.readFileSync(EXIT2_DB_PATH, "utf8"));
    }
    return {};
  } catch (err) {
    console.error("Erro ao carregar exit-messages.json:", err);
    return {};
  }
}

function saveExitData(data) {
  try {
    fs.writeFileSync(EXIT2_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Erro ao salvar exit-messages.json:", err);
  }
}

module.exports = {
  name: "exit2",
  description: "Ativa ou desativa o envio de mensagem de saída personalizada.",
  commands: ["exit2"],
  usage: `${PREFIX}exit2 (1/0)`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ args, remoteJid, sendReply, sendReact, getGroupAdmins, userJid, isGroup }) => {
    await sendReact("⏳");

    if (!isGroup) {
      throw new WarningError("Este comando só pode ser usado em grupos!");
    }

    const admins = await getGroupAdmins();
    const isAdmin = admins.includes(userJid);

    if (!isAdmin) {
      throw new WarningError("Apenas administradores podem usar este comando!");
    }

    if (!args.length) {
      throw new InvalidParameterError("Use 1 para ativar e 0 para desativar o sistema de saída personalizada!");
    }

    const enable = args[0] === "1";
    const disable = args[0] === "0";

    if (!enable && !disable) {
      throw new InvalidParameterError("Parâmetro inválido! Use 1 para ativar e 0 para desativar.");
    }

    const exitData = loadExitData();

    if (!exitData[remoteJid]) {
      exitData[remoteJid] = { active: false, message: "👋 Saiu do grupo!" };
    }

    if (enable && exitData[remoteJid].active) {
      throw new WarningError("O sistema de saída já está ativado neste grupo!");
    }

    if (disable && !exitData[remoteJid].active) {
      throw new WarningError("O sistema de saída já está desativado neste grupo!");
    }

    exitData[remoteJid].active = enable;
    saveExitData(exitData);

    await sendReact("✅");
    await sendReply(`✅ Sistema de mensagem de saída personalizada ${enable ? "ativado" : "desativado"} com sucesso!`);
  },
};