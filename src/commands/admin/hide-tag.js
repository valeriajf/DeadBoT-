const { PREFIX } = require(`${BASE_DIR}/config`);
const { downloadContentFromMessage } = require("baileys");

module.exports = {
  name: "hide-tag",
  description: "Este comando marcará todos do grupo com texto, imagem, vídeo ou áudio",
  commands: ["hide-tag", "to-tag"],
  usage: `${PREFIX}hidetag motivo (ou envie/responda uma mídia)`,
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
    webMessage,
    userJid // ID de quem enviou o comando
  }) => {
    const { participants } = await socket.groupMetadata(remoteJid);
    const mentions = participants.map(({ id }) => id);

    // Adiciona o autor do comando nas menções se ainda não estiver
    if (!mentions.includes(userJid)) {
      mentions.push(userJid);
    }

    await sendReact("📢");

    // Verifica mídias enviadas diretamente
    const directImage = webMessage?.message?.imageMessage;
    const directVideo = webMessage?.message?.videoMessage;
    const directAudio = webMessage?.message?.audioMessage;
    
    // Verifica mídias citadas (respondidas)
    const quotedMessage = webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedImage = quotedMessage?.imageMessage;
    const quotedVideo = quotedMessage?.videoMessage;
    const quotedAudio = quotedMessage?.audioMessage;

    // Determina qual mídia usar e seu tipo
    let mediaMessage = null;
    let mediaType = null;

    if (directImage || quotedImage) {
      mediaMessage = directImage || quotedImage;
      mediaType = "image";
    } else if (directVideo || quotedVideo) {
      mediaMessage = directVideo || quotedVideo;
      mediaType = "video";
    } else if (directAudio || quotedAudio) {
      mediaMessage = directAudio || quotedAudio;
      mediaType = "audio";
    }

    console.log("=== DEBUG HIDETAG ===");
    console.log("Tipo de mídia detectada:", mediaType || "nenhuma");
    console.log("Admin que executou:", userJid);
    console.log("====================");

    // Monta a mensagem com menção ao administrador
    const adminMessage = `📢 Marcando todos!\n📧 Mensagem do Administrador @${userJid.split('@')[0]}\n\n${fullArgs || ''}`;

    if (mediaMessage && mediaType) {
      try {
        console.log(`Baixando ${mediaType}...`);
        
        // Baixa a mídia usando baileys
        const stream = await downloadContentFromMessage(mediaMessage, mediaType);
        
        // Converte stream para buffer
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        console.log(`${mediaType} baixada! Tamanho:`, buffer.length);
        console.log("Enviando mídia com menções...");
        
        // Prepara o objeto de mensagem baseado no tipo
        const messageContent = {
          caption: adminMessage,
          mentions: mentions
        };

        // Define a mídia de acordo com o tipo
        if (mediaType === "image") {
          messageContent.image = buffer;
        } else if (mediaType === "video") {
          messageContent.video = buffer;
        } else if (mediaType === "audio") {
          messageContent.audio = buffer;
          messageContent.mimetype = mediaMessage.mimetype || "audio/mp4";
          messageContent.ptt = mediaMessage.ptt || false; // Se é mensagem de voz
          delete messageContent.caption; // Áudio não tem caption, então removemos
        }

        // Envia a mídia com menções
        await socket.sendMessage(remoteJid, messageContent);
        
        // Se for áudio, envia a legenda separadamente
        if (mediaType === "audio") {
          await sendText(adminMessage, mentions);
        }
        
        console.log("✅ Mídia enviada com sucesso!");
        
      } catch (error) {
        console.error("ERRO:", error);
        await sendText(`❌ Erro ao processar a mídia: ${error.message}`);
      }
    } else {
      // Envia apenas texto se não houver mídia
      await sendText(adminMessage, mentions);
    }
  },
};