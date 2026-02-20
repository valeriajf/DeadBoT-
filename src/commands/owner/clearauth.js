const { OWNER_NUMBER, OWNER_LID } = require("../../config.js");
const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  name: "clearauth",
  description: "Limpeza profunda de autenticação (mantém apenas creds.json)",
  commands: ["clearauth", "clear", "clean"],
  handle: async ({ socket, remoteJid, userJid }) => {
    
    const isOwnerByLid = userJid === OWNER_LID;
    const isOwnerByNumber = userJid === OWNER_NUMBER;
    
    if (!isOwnerByLid && !isOwnerByNumber) {
      return await socket.sendMessage(remoteJid, { 
        text: "⛔ *ACESSO NEGADO*\n\nApenas o dono do bot pode usar este comando." 
      });
    }

    try {
      const authPath = path.resolve(__dirname, "..", "..", "..", "assets", "auth", "baileys");
      const tempPath = path.resolve(__dirname, "..", "..", "..", "temp");
      let removidos = 0;

      // Extrair o ID do grupo atual para preservar a sessão dele
      const groupId = remoteJid.replace("@g.us", "").replace("@s.whatsapp.net", "");

      // CONTAR arquivos ANTES de deletar
      if (fs.existsSync(authPath)) {
        const files = fs.readdirSync(authPath);
        for (const file of files) {
          if (file === "creds.json") continue;
          if (file.includes(groupId)) continue; // não contar o grupo atual
          removidos++;
        }
      }

      if (fs.existsSync(tempPath)) {
        removidos += fs.readdirSync(tempPath).length;
      }

      // ENVIAR MENSAGEM ANTES de deletar
      await socket.sendMessage(remoteJid, { 
        text: "🧹 Faxina concluída!\n\n🗑️ Removidos: *" + removidos + "* arquivos/pastas\n🔐 creds.json preservado\n⚡ Sistema mais leve"
      });

      // Aguardar 10 segundos para mensagem ser entregue
      await new Promise(resolve => setTimeout(resolve, 10000));

      // AGORA deletar os arquivos (preservando sessão do grupo atual)
      if (fs.existsSync(authPath)) {
        const files = fs.readdirSync(authPath);
        for (const file of files) {
          if (file === "creds.json") continue;
          if (file.includes(groupId)) {
            console.log("⏭️ Preservando sessão do grupo atual:", file);
            continue;
          }
          fs.rmSync(path.join(authPath, file), { recursive: true, force: true });
        }
      }

      if (fs.existsSync(tempPath)) {
        const files = fs.readdirSync(tempPath);
        for (const file of files) {
          fs.rmSync(path.join(tempPath, file), { recursive: true, force: true });
        }
      }

      console.log(`✅ Limpeza concluída: ${removidos} arquivos removidos`);

    } catch (error) {
      console.error("❌ Erro ao limpar:", error);
      await socket.sendMessage(remoteJid, {
        text: "❌ Erro ao limpar arquivos: " + error.message
      });
    }
  },
};