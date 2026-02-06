const { PREFIX } = require(`${BASE_DIR}/config`);
const { downloadContentFromMessage } = require("baileys");

module.exports = {
  name: "citar",
  description: "Cita uma mensagem marcando todos do grupo",
  commands: ["citar", "cite"],
  usage: `${PREFIX}citar (responda a uma mensagem)`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    sendText, 
    socket, 
    remoteJid, 
    sendReact,
    webMessage,
    sendErrorReply
  }) => {
    // Obtém lista de participantes para mencionar
    const { participants } = await socket.groupMetadata(remoteJid);
    const mentions = participants.map(({ id }) => id);

    // Verifica se há mensagem citada/respondida
    const quotedMessage = webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quotedMessage) {
      return await sendErrorReply("❌ Você precisa responder a uma mensagem para usar este comando!");
    }

    await sendReact("📢");

    // Extrai informações da mensagem citada
    const quotedText = quotedMessage?.conversation || 
                      quotedMessage?.extendedTextMessage?.text || "";
    const quotedImage = quotedMessage?.imageMessage;
    const quotedVideo = quotedMessage?.videoMessage;
    const quotedAudio = quotedMessage?.audioMessage;
    const quotedSticker = quotedMessage?.stickerMessage;
    const quotedDocument = quotedMessage?.documentMessage;

    console.log("=== DEBUG CITAR ===");
    console.log("Texto citado:", quotedText || "nenhum");
    console.log("Tem imagem:", !!quotedImage);
    console.log("Tem vídeo:", !!quotedVideo);
    console.log("Tem áudio:", !!quotedAudio);
    console.log("Tem sticker:", !!quotedSticker);
    console.log("Tem documento:", !!quotedDocument);
    console.log("===================");

    try {
      // Se a mensagem citada tem IMAGEM
      if (quotedImage) {
        const stream = await downloadContentFromMessage(quotedImage, "image");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        await socket.sendMessage(remoteJid, {
          image: buffer,
          caption: `📢 *Citação:*\n\n${quotedImage.caption || quotedText || ""}`,
          mentions: mentions
        });
      }
      
      // Se a mensagem citada tem VÍDEO
      else if (quotedVideo) {
        const stream = await downloadContentFromMessage(quotedVideo, "video");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        await socket.sendMessage(remoteJid, {
          video: buffer,
          caption: `📢 *Citação:*\n\n${quotedVideo.caption || quotedText || ""}`,
          mentions: mentions
        });
      }
      
      // Se a mensagem citada tem ÁUDIO
      else if (quotedAudio) {
        const stream = await downloadContentFromMessage(quotedAudio, "audio");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        await socket.sendMessage(remoteJid, {
          audio: buffer,
          mimetype: quotedAudio.mimetype || "audio/mp4",
          ptt: quotedAudio.ptt || false,
          mentions: mentions
        });

        // Se houver texto junto, envia separadamente
        if (quotedText) {
          await sendText(`📢 *Citação:*\n\n${quotedText}`, mentions);
        }
      }
      
      // Se a mensagem citada tem STICKER
      else if (quotedSticker) {
        const stream = await downloadContentFromMessage(quotedSticker, "sticker");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        // Envia o sticker
        await socket.sendMessage(remoteJid, {
          sticker: buffer
        });

        // Envia texto com menções logo após
        await sendText(`📢 *Sticker citado marcando todos!*`, mentions);
      }
      
      // Se a mensagem citada tem DOCUMENTO
      else if (quotedDocument) {
        const stream = await downloadContentFromMessage(quotedDocument, "document");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        await socket.sendMessage(remoteJid, {
          document: buffer,
          mimetype: quotedDocument.mimetype,
          fileName: quotedDocument.fileName || "documento",
          caption: `📢 *Citação:*\n\n${quotedDocument.caption || quotedText || ""}`,
          mentions: mentions
        });
      }
      
      // Se a mensagem citada tem apenas TEXTO
      else if (quotedText) {
        await sendText(`📢 *Citação:*\n\n"${quotedText}"`, mentions);
      }
      
      // Mensagem sem conteúdo válido
      else {
        await sendErrorReply("❌ A mensagem citada não contém texto ou mídia válida para citar.");
      }

      console.log("✅ Citação enviada com sucesso!");
      
    } catch (error) {
      console.error("ERRO AO CITAR:", error);
      await sendErrorReply(`❌ Erro ao processar a citação: ${error.message}`);
    }
  },
};