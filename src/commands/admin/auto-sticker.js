/**
 * Auto Sticker - Converte automaticamente imagens e GIFs em figurinhas
 *
 * @author Dev VaL
 */
const fs = require("node:fs");
const path = require("node:path");
const { exec } = require("node:child_process");

const { getRandomName } = require("../../utils");
const { addStickerMetadata } = require("../../services/sticker");
const { InvalidParameterError } = require("../../errors");
const { PREFIX, BOT_NAME, BOT_EMOJI, TEMP_DIR } = require("../../config");

// Caminho do arquivo de configuração
const CONFIG_PATH = path.join(__dirname, "..", "..", "database", "auto-sticker.json");

// Carrega grupos salvos do arquivo
function loadActiveGroups() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      return new Set(data.activeGroups || []);
    }
  } catch (error) {
    console.error("[AUTO-STICKER] Erro ao carregar configuração:", error.message);
  }
  return new Set();
}

// Salva grupos ativos no arquivo
function saveActiveGroups(groups) {
  try {
    const data = { activeGroups: Array.from(groups) };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("[AUTO-STICKER] Erro ao salvar configuração:", error.message);
  }
}

// Armazena os grupos com auto-sticker ativado
const autoStickerGroups = loadActiveGroups();

module.exports = {
  name: "auto-sticker",
  description: "Ativa/desativa a criação automática de figurinhas para imagens e GIFs postados no grupo.",
  commands: ["autosticker", "auto-sticker", "autoS"],
  usage: `${PREFIX}autosticker (1/0)`,
  handle: async ({
    args,
    isGroup,
    sendReply,
    sendErrorReply,
    sendSuccessReact,
    sendErrorReact,
    groupId,
    socket,
    remoteJid,
    userJid,
  }) => {
    const actualGroupId = remoteJid;

    if (!isGroup) {
      throw new InvalidParameterError("Este comando só pode ser usado em grupos!");
    }

    const action = args[0];

    if (!action || (action !== "1" && action !== "0")) {
      return sendReply(`
❓ *Como usar o Auto-Sticker:*

• \`${PREFIX}autosticker 1\` - Ativa o auto-sticker no grupo
• \`${PREFIX}autosticker 0\` - Desativa o auto-sticker no grupo

📝 *O que faz:* Quando ativado, todas as imagens e GIFs enviados no grupo serão automaticamente convertidos em figurinhas.

⚠️ *Nota:* Apenas administradores podem ativar/desativar esta função.
      `);
    }

    try {
      const groupMetadata = await socket.groupMetadata(actualGroupId);
      const participants = groupMetadata.participants || [];
      const userIsAdmin = participants.some(
        participant => 
          participant.id === userJid && 
          (participant.admin === 'admin' || participant.admin === 'superadmin')
      );

      if (!userIsAdmin) {
        await sendErrorReact();
        return sendErrorReply("Apenas administradores podem usar este comando!");
      }

      if (action === "1") {
        if (autoStickerGroups.has(actualGroupId)) {
          await sendErrorReact();
          return sendReply("✅ O auto-sticker já está ativado neste grupo!");
        }

        autoStickerGroups.add(actualGroupId);
        saveActiveGroups(autoStickerGroups);
        
        await sendSuccessReact();
        return sendReply(`
🤖 *Auto-Sticker Ativado!*

✅ Todas as imagens e GIFs enviados neste grupo serão automaticamente convertidos em figurinhas.

💡 *Dica:* Para desativar, use \`${PREFIX}autosticker 0\`
        `);
      }

      if (action === "0") {
        if (!autoStickerGroups.has(actualGroupId)) {
          await sendErrorReact();
          return sendReply("❌ O auto-sticker já está desativado neste grupo!");
        }

        autoStickerGroups.delete(actualGroupId);
        saveActiveGroups(autoStickerGroups);
        
        await sendSuccessReact();
        return sendReply(`
🛑 *Auto-Sticker Desativado!*

✅ As imagens e GIFs não serão mais convertidos automaticamente em figurinhas.

💡 *Dica:* Para reativar, use \`${PREFIX}autosticker 1\`
        `);
      }

    } catch (error) {
      console.error("[AUTO-STICKER] Erro:", error);
      await sendErrorReact();
      return sendErrorReply("Erro ao verificar suas permissões no grupo. Tente novamente!");
    }
  },

  processAutoSticker: async ({
    isImage,
    isVideo,
    isGroup,
    groupId,
    webMessage,
    downloadImage,
    downloadVideo,
    sendStickerFromFile,
    userJid,
    remoteJid,
    sock,
  }) => {
    if (!isGroup || !autoStickerGroups.has(groupId)) {
      return;
    }

    if (!isImage && !isVideo) {
      return;
    }

    const messageText = webMessage.message?.conversation || 
                       webMessage.message?.extendedTextMessage?.text || "";
    
    if (messageText.startsWith(PREFIX)) {
      return;
    }

    try {
      const username = webMessage.pushName || webMessage.notifyName || userJid.replace(/@s.whatsapp.net/, "");
      
      // Busca nome do grupo
      let groupName = "";
      if (isGroup && remoteJid && sock) {
        try {
          const groupMetadata = await sock.groupMetadata(remoteJid);
          groupName = groupMetadata.subject || "Grupo";
        } catch (error) {
          groupName = "Grupo";
        }
      }
      
      const metadata = {
        username: isGroup 
          ? `⚙️ Criada por: ${username}\n🪀 Grupo: ${groupName}\n💚 By` 
          : `⚙️ Criada por: ${username}\n💚 By`,
        botName: BOT_NAME,
      };

      const outputTempPath = path.resolve(TEMP_DIR, getRandomName("webp"));
      let inputPath = null;

      if (isImage) {
        // Processa imagem
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            inputPath = await downloadImage(webMessage, getRandomName());
            break;
          } catch (downloadError) {
            if (attempt === 3) return;
            await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
          }
        }

        await new Promise((resolve, reject) => {
          const cmd = `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease" -f webp -quality 90 "${outputTempPath}"`;
          exec(cmd, (error, _, stderr) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });

      } else if (isVideo) {
        // Processa vídeo/GIF
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            inputPath = await downloadVideo(webMessage, getRandomName());
            break;
          } catch (downloadError) {
            if (attempt === 3) return;
            await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
          }
        }

        // Verifica duração do vídeo (máximo 10 segundos)
        const maxDuration = 10;
        const seconds =
          webMessage.message?.videoMessage?.seconds ||
          webMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage?.seconds;

        if (seconds && seconds > maxDuration) {
          if (inputPath && fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
          }
          return; // Ignora vídeos muito longos
        }

        await new Promise((resolve, reject) => {
          const cmd = `ffmpeg -y -i "${inputPath}" -vcodec libwebp -fs 0.99M -filter_complex "[0:v] scale=512:512, fps=15, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse" -f webp "${outputTempPath}"`;
          exec(cmd, (error, _, stderr) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }

      if (inputPath && fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }

      if (!fs.existsSync(outputTempPath)) {
        throw new Error("Arquivo não foi criado pelo FFmpeg");
      }

      const stickerPath = await addStickerMetadata(
        await fs.promises.readFile(outputTempPath),
        metadata
      );

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await sendStickerFromFile(stickerPath);
          break;
        } catch (stickerError) {
          if (attempt === 3) return;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }

      if (fs.existsSync(outputTempPath)) fs.unlinkSync(outputTempPath);
      if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath);

    } catch (error) {
      console.error("[AUTO-STICKER] Erro ao processar:", error.message);
    }
  },

  isActive: (groupId) => {
    return autoStickerGroups.has(groupId);
  },

  getActiveGroups: () => Array.from(autoStickerGroups),
  
  clear: () => {
    autoStickerGroups.clear();
    saveActiveGroups(autoStickerGroups);
  }
};