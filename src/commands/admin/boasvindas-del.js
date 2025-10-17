/**
 * Comando boasvindas-del
 * Remove a mensagem de boas-vindas configurada para o grupo atual.
 *
 * @author VaL
 */

const fs = require("node:fs");
const path = require("node:path");
const { PREFIX } = require(`${BASE_DIR}/config`);

const DB_PATH = path.join(BASE_DIR, "src", "database", "boasvindas.json");

module.exports = {
  name: "boasvindas-del",
  description: "Apaga a mensagem de boas-vindas do grupo atual.",
  commands: ["boasvindas-del"],
  usage: `${PREFIX}boasvindas-del`,

  handle: async ({
    sendSuccessReact,
    sendWarningReact,
    sendErrorReact,
    sendReply,
    sendErrorReply,
    remoteJid,
    isGroup,
    userJid,
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
        return await sendReply("❌ Apenas administradores podem apagar a mensagem de boas-vindas!");
      }

      if (!fs.existsSync(DB_PATH)) {
        await sendWarningReact();
        return await sendReply("⚠️ Nenhuma mensagem de boas-vindas foi configurada ainda!");
      }

      const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

      if (!data[remoteJid]) {
        await sendWarningReact();
        return await sendReply("⚠️ Este grupo não possui mensagem de boas-vindas configurada!");
      }

      delete data[remoteJid];
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");

      await sendSuccessReact();
      await sendReply("🗑️ Mensagem de boas-vindas removida com sucesso!");
    } catch (error) {
      console.error("❌ Erro no comando boasvindas-del:", error);
      await sendErrorReact();
      await sendErrorReply("❌ Erro ao remover a mensagem de boas-vindas.");
    }
  },
};