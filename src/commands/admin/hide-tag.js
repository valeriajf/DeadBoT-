const { PREFIX } = require(`${BASE_DIR}/config`);
const { downloadContentFromMessage } = require("baileys");

module.exports = {
  name: "hide-tag",
  description: "Este comando marcará todos do grupo com texto ou imagem",
  commands: ["hide-tag", "to-tag"],
  usage: `${PREFIX}hidetag motivo (ou envie/responda uma imagem)`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    fullArgs, 
    sendText, 
    socket, 
    remoteJid, 
    sendReact,
    webMessage 
  }) => {
    const { participants } = await socket.groupMetadata(remoteJid);
    const mentions = participants.map(({ id }) => id);

    await sendReact("📢");

    // Verifica imagem enviada diretamente
    const directImage = webMessage?.message?.imageMessage;
    
    // Verifica imagem citada (respondida)
    const quotedMessage = webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedImage = quotedMessage?.imageMessage;

    // Pega a imagem (direta ou citada)
    const imageMessage = directImage || quotedImage;

    console.log("=== DEBUG HIDETAG ===");
    console.log("Imagem direta:", !!directImage);
    console.log("Imagem citada:", !!quotedImage);
    console.log("====================");

    if (imageMessage) {
      try {
        console.log("Baixando imagem...");
        
        // Baixa a imagem usando baileys
        const stream = await downloadContentFromMessage(imageMessage, "image");
        
        // Converte stream para buffer
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        console.log("Imagem baixada! Tamanho:", buffer.length);
        console.log("Enviando imagem com menções...");
        
        // Envia a imagem com legenda e menções
        await socket.sendMessage(remoteJid, {
          image: buffer,
          caption: `📢 Marcando todos!\n\n${fullArgs || ''}`,
          mentions: mentions
        });
        
        console.log("✅ Imagem enviada com sucesso!");
        
      } catch (error) {
        console.error("ERRO:", error);
        await sendText(`❌ Erro ao processar a imagem: ${error.message}`);
      }
    } else {
      // Envia apenas texto se não houver imagem
      await sendText(`📢 Marcando todos!\n\n${fullArgs}`, mentions);
    }
  },
};