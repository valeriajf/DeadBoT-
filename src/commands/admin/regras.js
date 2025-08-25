module.exports = {
  commands: ["regras"],
  description: "Mostra a descrição atual do grupo",

  async handle(conn, msg, args) {
    try {
      const chatId = msg.key.remoteJid;

      // só funciona em grupo
      if (!chatId.endsWith("@g.us")) {
        return await conn.sendMessage(chatId, { text: "⚠️ Este comando só pode ser usado em grupos." });
      }

      // pega metadados do grupo
      const groupMetadata = await conn.groupMetadata(chatId);
      const descricao = groupMetadata.desc || "⚠️ Este grupo não possui descrição definida.";

      // envia a descrição como texto
      await conn.sendMessage(chatId, {
        text: `📌 *Regras do Grupo:*\n\n${descricao}`
      });

    } catch (e) {
      console.error("Erro no comando regras:", e);
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ Ocorreu um erro ao buscar a descrição do grupo.\n\n📄 *Detalhes*: ${e.message}` 
      });
    }
  }
};