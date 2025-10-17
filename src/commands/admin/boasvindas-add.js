/**
 * Comando boasvindas-add
 * Define ou altera a mensagem de boas-vindas personalizada do grupo.
 * Suporta variáveis dinâmicas como {grupo}.
 *
 * @author VaL
 */

const fs = require("node:fs");
const path = require("node:path");
const { PREFIX } = require(`${BASE_DIR}/config`);

const DB_PATH = path.join(BASE_DIR, "src", "database", "boasvindas.json");

module.exports = {
  name: "boasvindas-add",
  description: "Define ou altera a mensagem de boas-vindas do grupo atual.",
  commands: ["boasvindas-add"],
  usage: `${PREFIX}boasvindas-add [mensagem]`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    sendSuccessReact,
    sendWarningReact,
    sendErrorReact,
    sendReply,
    sendErrorReply,
    remoteJid,
    isGroup,
    userJid,
    args,
    socket,
    getGroupParticipants
  }) => {
    try {
      await sendWarningReact();

      if (!isGroup) {
        await sendWarningReact();
        return await sendReply("⚠️ Este comando só pode ser usado em grupos!");
      }

      // Verifica se o usuário é admin
      const participants = await getGroupParticipants();
      const user = participants.find(p => p.id === userJid);
      const isUserAdmin = user && (user.admin === "admin" || user.admin === "superadmin");

      if (!isUserAdmin) {
        await sendWarningReact();
        return await sendReply("❌ Apenas administradores podem definir a mensagem de boas-vindas!");
      }

      const messageText = args.join(" ").trim();
      if (!messageText) {
        await sendWarningReact();
        return await sendReply(
          `⚠️ Uso correto: ${PREFIX}boasvindas-add Bem-vindo(a) ao {grupo}! 💀🔥`
        );
      }

      // Cria o arquivo se não existir
      if (!fs.existsSync(DB_PATH)) {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2), "utf-8");
      }

      const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      data[remoteJid] = {
        message: messageText,
        updatedBy: userJid,
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");

      await sendSuccessReact();
      await sendReply(
        `✅ Mensagem de boas-vindas configurada com sucesso!\n\n💬 *Mensagem salva:*\n"${messageText}"`
      );
    } catch (error) {
      console.error("❌ Erro no comando boasvindas-add:", error);
      await sendErrorReact();
      await sendErrorReply("❌ Erro ao salvar a mensagem de boas-vindas.");
    }
  },
};