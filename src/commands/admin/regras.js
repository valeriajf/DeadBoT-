/**
 * Comando: regras
 * Retorna a DESCRIÇÃO atual do grupo (ADM-only), opcionalmente com a foto do grupo.
 * 
 * @author Dev VaL 
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "regras",
  description: "Mostra a descrição atual do grupo (ADM-only)",
  commands: ["regras"],
  usage: `${PREFIX}regras`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ socket, remoteJid, isGroup, userJid, getGroupAdmins, getGroupOwner }) => {
    try {
      if (!isGroup) {
        return await socket.sendMessage(remoteJid, { text: "⚠️ Este comando só pode ser usado em grupos." });
      }

      // Verifica permissão (somente ADMs ou dono)
      const admins = await getGroupAdmins();
      const owner = await getGroupOwner();
      const isAdmin = admins.includes(userJid) || userJid === owner;

      if (!isAdmin) {
        return await socket.sendMessage(remoteJid, { text: "❌ Apenas administradores podem usar este comando." });
      }

      // Metadados do grupo
      const meta = await socket.groupMetadata(remoteJid);
      const groupName = meta?.subject || "Grupo";
      const descricao = (meta?.desc || "").trim() || "⚠️ Este grupo não possui descrição definida.";

      // Tenta pegar foto do grupo (se falhar, manda só texto)
      let ppUrl = null;
      try {
        ppUrl = await socket.profilePictureUrl(remoteJid, "image");
      } catch (_) {
        ppUrl = null;
      }

      const caption = `*📌 ${groupName}:*\n\n${descricao}`;

      if (ppUrl) {
        // Envia com foto, sem 'mentions' para evitar o erro de ContextInfo
        await socket.sendMessage(remoteJid, {
          image: { url: ppUrl },
          caption
        });
      } else {
        // Envia apenas texto (sem usar sendText para não gerar mentions automáticas)
        await socket.sendMessage(remoteJid, { text: caption });
      }

    } catch (err) {
      console.error("Erro no comando regras:", err);
      // Evita helpers; envia erro direto
      try {
        await socket.sendMessage(remoteJid, { text: `❌ Erro ao executar o comando regras.\n\n📄 Detalhes: ${err.message}` });
      } catch {}
    }
  },
};