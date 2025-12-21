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
  name: "set-exit2",
  description: "Define a mensagem de saída personalizada para o grupo.",
  commands: ["set-exit2"],
  usage: `${PREFIX}set-exit2 <mensagem>\n\nUse {membro} para mencionar o nome do usuário que saiu.\nExemplo: ${PREFIX}set-exit2 👋 Adeus {membro}, sentiremos sua falta!`,

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
      throw new InvalidParameterError(
        "Você precisa digitar a mensagem de saída personalizada!\n\n" +
        "💡 Dica: Use {membro} para mencionar o nome do usuário.\n" +
        `Exemplo: ${PREFIX}set-exit2 👋 Tchau {membro}!`
      );
    }

    const message = args.join(" ");
    const exitData = loadExitData();

    if (!exitData[remoteJid]) {
      exitData[remoteJid] = { active: false, message: "👋 {membro} saiu do grupo!" };
    }

    exitData[remoteJid].message = message;
    saveExitData(exitData);

    await sendReact("✅");
    await sendReply(
      `✅ Mensagem de saída personalizada definida com sucesso!\n\n` +
      `📝 Mensagem configurada:\n"${message}"`
    );
  },
};