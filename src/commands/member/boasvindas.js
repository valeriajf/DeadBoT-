/**
 * Comando boasvindas
 * Exibe a mensagem de boas-vindas configurada para o grupo atual.
 * Suporta variáveis como {grupo}.
 *
 * @author VaL
 */

const fs = require("node:fs");
const path = require("node:path");
const { PREFIX } = require(`${BASE_DIR}/config`);

const DB_PATH = path.join(BASE_DIR, "src", "database", "boasvindas.json");

module.exports = {
  name: "boasvindas",
  description: "Mostra a mensagem de boas-vindas do grupo.",
  commands: ["boasvindas", "bv"],
  usage: `${PREFIX}boasvindas`,

  handle: async ({
    sendSuccessReact,
    sendWarningReact,
    sendErrorReact,
    sendReply,
    sendErrorReply,
    remoteJid,
    isGroup,
    socket
  }) => {
    try {
      await sendWarningReact();

      if (!isGroup) {
        await sendWarningReact();
        return await sendReply("⚠️ Este comando só pode ser usado em grupos!");
      }

      if (!fs.existsSync(DB_PATH)) {
        await sendWarningReact();
        return await sendReply("⚠️ Nenhuma mensagem de boas-vindas foi configurada ainda.");
      }

      const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      const groupData = data[remoteJid];

      if (!groupData || !groupData.message) {
        await sendWarningReact();
        return await sendReply(
          `⚠️ Nenhuma mensagem de boas-vindas foi definida.\nUse ${PREFIX}boasvindas-add para configurar uma.`
        );
      }

      // Pega nome do grupo
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const groupName = groupMetadata?.subject || "Grupo";

      // Substitui {grupo}
      const finalMessage = groupData.message.replace(/{grupo}/gi, groupName);

      await sendSuccessReact();
      await sendReply(`💬 *Mensagem de boas-vindas:*\n\n"${finalMessage}"`);
    } catch (error) {
      console.error("❌ Erro no comando boasvindas:", error);
      await sendErrorReact();
      await sendErrorReply("❌ Erro ao carregar a mensagem de boas-vindas.");
    }
  },
};