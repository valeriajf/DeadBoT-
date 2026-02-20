const { OWNER_NUMBER, OWNER_LID } = require("../../config.js");
const { exec } = require("child_process");
const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  name: "restart",
  description: "Reinicia o bot mantendo a conexão do WhatsApp",
  commands: ["restart", "reiniciar", "reboot"],
  handle: async ({ socket, remoteJid, userJid }) => {
    
    const isOwnerByLid = userJid === OWNER_LID;
    const isOwnerByNumber = userJid === OWNER_NUMBER;
    
    if (!isOwnerByLid && !isOwnerByNumber) {
      return await socket.sendMessage(remoteJid, { 
        text: "⛔ *ACESSO NEGADO*\n\nApenas o dono do bot pode usar este comando." 
      });
    }

    try {
      await socket.sendMessage(remoteJid, { 
        text: "🔄 *REINICIANDO BOT*\n\nO bot será reiniciado em 3 segundos...\nA conexão será mantida!" 
      });

      console.log("🔄 Comando #restart executado");

      setTimeout(() => {
        // Detectar PM2
        const isPM2 = process.env.PM2_HOME !== undefined || process.env.pm_id !== undefined;
        
        if (isPM2) {
          console.log("📍 Ambiente: PM2 detectado");
          exec('pm2 restart all', (error) => {
            if (error) {
              console.error("❌ Erro no PM2, usando fallback");
              process.exit(0);
            }
          });
        } else {
          // Termux, VPS com node --watch, Docker, etc
          console.log("📍 Ambiente: node --watch / nodemon / Docker");
          console.log("🔄 Forçando reload...");
          
          const indexPath = path.resolve(__dirname, "..", "..", "..", "src", "index.js");
          
          try {
            // Ler o arquivo atual
            const content = fs.readFileSync(indexPath, 'utf8');
            
            // Adicionar um espaço no final (mudança mínima)
            fs.writeFileSync(indexPath, content + ' ');
            console.log("✅ Arquivo modificado, aguardando reload...");
            
            // Restaurar após 500ms
            setTimeout(() => {
              fs.writeFileSync(indexPath, content);
              console.log("✅ Arquivo restaurado");
            }, 500);
            
          } catch (fileError) {
            console.error("⚠️ Erro ao modificar arquivo:", fileError);
            console.log("🔄 Usando process.exit(0) como fallback");
            process.exit(0);
          }
        }
      }, 3000);

    } catch (error) {
      console.error("❌ Erro ao reiniciar:", error);
      await socket.sendMessage(remoteJid, {
        text: "❌ Erro ao reiniciar: " + error.message
      });
    }
  },
};