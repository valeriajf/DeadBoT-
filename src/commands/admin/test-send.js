const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "test-send",
  description: "Testa envio de mensagem",
  commands: ["test-send"],
  usage: `${PREFIX}test-send`,
  handle: async ({ sendReply, remoteJid, socket }) => {
    await sendReply("✅ Teste 1: sendReply funcionou!");
    
    try {
      await socket.sendMessage(remoteJid, {
        text: "✅ Teste 2: socket.sendMessage funcionou!"
      });
    } catch (error) {
      await sendReply(`❌ Teste 2 falhou: ${error.message}`);
    }
  },
};