const fs = require("fs");
const path = require("path");

const regrasPath = path.join(__dirname, "../../database/regras.json");

function ensureRegrasFile() {
  if (!fs.existsSync(regrasPath)) {
    fs.mkdirSync(path.dirname(regrasPath), { recursive: true });
    fs.writeFileSync(regrasPath, JSON.stringify({}, null, 2));
  }
}

module.exports = {
  commands: ["setregras"],
  description: "Define ou atualiza as regras do grupo (somente ADM)",

  handle: async (ctx) => {
    try {
      ensureRegrasFile();

      const { remoteJid, userJid, isGroup, socket, fullMessage, args, getGroupMetadata, getGroupAdmins, getGroupOwner } = ctx;

      if (!isGroup) {
        return socket.sendMessage(remoteJid, { text: "❌ Este comando só pode ser usado em grupos." });
      }

      const metadata = await getGroupMetadata();
      const owner = await getGroupOwner();
      const admins = await getGroupAdmins();

      if (!admins.includes(userJid) && userJid !== owner) {
        return socket.sendMessage(remoteJid, { text: "❌ Apenas administradores podem definir as regras." });
      }

      if (!fullMessage) {
        return socket.sendMessage(remoteJid, { text: "⚠️ Use assim:\n#setregras Regra 1 | Regra 2 | Regra 3" });
      }

      // Remove o comando do início da mensagem
      let texto = fullMessage.replace(/^#?setregras\s*/i, "").trim();

      // Separa regras por pipe "|" ou vírgula ","
      let novasRegras = texto.includes("|") ? texto.split("|") : texto.split(",");
      novasRegras = novasRegras.map(r => r.trim()).filter(r => r.length > 0);

      if (novasRegras.length === 0) {
        return socket.sendMessage(remoteJid, { text: "⚠️ Nenhuma regra válida encontrada." });
      }

      // Lê regras atuais
      let regras = {};
      try {
        regras = JSON.parse(fs.readFileSync(regrasPath, "utf8"));
      } catch {
        regras = {};
      }

      // Salva regras do grupo
      regras[remoteJid] = novasRegras;
      fs.writeFileSync(regrasPath, JSON.stringify(regras, null, 2), "utf8");

      // Confirmação
      await socket.sendMessage(remoteJid, {
        text: `✅ Regras do grupo *${metadata.subject}* atualizadas!\n\n📌 Novas regras:\n${novasRegras.map((r,i)=>`${i+1}. ${r}`).join("\n")}`
      });

    } catch (err) {
      console.error("Erro no comando setregras:", err);
      if (ctx.socket && ctx.remoteJid) {
        ctx.socket.sendMessage(ctx.remoteJid, { text: "❌ Ocorreu um erro ao tentar salvar as regras." });
      }
    }
  }
};