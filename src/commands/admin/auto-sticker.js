/**
 * Auto Sticker - Converte automaticamente imagens em figurinhas
 * Baseado no comando sticker.js original
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
      console.log("[AUTO-STICKER] Grupos carregados do arquivo:", data.activeGroups);
      return new Set(data.activeGroups || []);
    }
  } catch (error) {
    console.error("[AUTO-STICKER] Erro ao carregar configuração:", error.message);
  }
  console.log("[AUTO-STICKER] Nenhum grupo ativo encontrado, iniciando vazio");
  return new Set();
}

// Salva grupos ativos no arquivo
function saveActiveGroups(groups) {
  try {
    const data = { activeGroups: Array.from(groups) };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), "utf8");
    console.log("[AUTO-STICKER] Configuração salva:", data);
  } catch (error) {
    console.error("[AUTO-STICKER] Erro ao salvar configuração:", error.message);
  }
}

// Armazena os grupos com auto-sticker ativado
const autoStickerGroups = loadActiveGroups();

module.exports = {
  name: "auto-sticker",
  description: "Ativa/desativa a criação automática de figurinhas para imagens postadas no grupo.",
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
    // USA REMOTEJID SEMPRE
    const actualGroupId = remoteJid;
    console.log('[AUTO-STICKER] Handle - groupId original:', groupId);
    console.log('[AUTO-STICKER] Handle - remoteJid (USANDO):', actualGroupId);

    if (!isGroup) {
      throw new InvalidParameterError("Este comando só pode ser usado em grupos!");
    }

    const action = args[0];

    if (!action || (action !== "1" && action !== "0")) {
      return sendReply(`
❓ *Como usar o Auto-Sticker:*

• \`${PREFIX}autosticker 1\` - Ativa o auto-sticker no grupo
• \`${PREFIX}autosticker 0\` - Desativa o auto-sticker no grupo

📝 *O que faz:* Quando ativado, todas as imagens enviadas no grupo serão automaticamente convertidas em figurinhas.

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
        console.log("[AUTO-STICKER] Ativado no grupo:", actualGroupId);
        console.log("[AUTO-STICKER] Grupos ativos:", Array.from(autoStickerGroups));
        
        await sendSuccessReact();
        return sendReply(`
🤖 *Auto-Sticker Ativado!*

✅ Todas as imagens enviadas neste grupo serão automaticamente convertidas em figurinhas.

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
        console.log("[AUTO-STICKER] Desativado no grupo:", actualGroupId);
        console.log("[AUTO-STICKER] Grupos ativos:", Array.from(autoStickerGroups));
        
        await sendSuccessReact();
        return sendReply(`
🛑 *Auto-Sticker Desativado!*

✅ As imagens não serão mais convertidas automaticamente em figurinhas.

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
    isGroup,
    groupId,
    webMessage,
    downloadImage,
    sendStickerFromFile,
    userJid,
  }) => {
    if (!isGroup || !autoStickerGroups.has(groupId)) {
      return;
    }

    if (!isImage) {
      return;
    }

    const messageText = webMessage.message?.conversation || 
                       webMessage.message?.extendedTextMessage?.text || "";
    
    if (messageText.startsWith(PREFIX)) {
      return;
    }

    try {
      console.log(`[AUTO-STICKER] Processando imagem no grupo: ${groupId}`);
      
      const username = webMessage.pushName || webMessage.notifyName || userJid.replace(/@s.whatsapp.net/, "");
      const metadata = {
        username: username,
        botName: `${BOT_EMOJI} ${BOT_NAME}`,
      };

      const outputTempPath = path.resolve(TEMP_DIR, getRandomName("webp"));
      let inputPath = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          inputPath = await downloadImage(webMessage, getRandomName());
          break;
        } catch (downloadError) {
          console.error(`[AUTO-STICKER] Download falhou (tentativa ${attempt}):`, downloadError.message);
          if (attempt === 3) return;
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        }
      }

      await new Promise((resolve, reject) => {
        const cmd = `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease" -f webp -quality 90 "${outputTempPath}"`;
        exec(cmd, (error, _, stderr) => {
          if (error) {
            console.error("[AUTO-STICKER] FFmpeg error:", stderr);
            reject(error);
          } else {
            resolve();
          }
        });
      });

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
          console.log(`[AUTO-STICKER] Figurinha enviada com sucesso!`);
          break;
        } catch (stickerError) {
          console.error(`[AUTO-STICKER] Envio falhou (tentativa ${attempt}):`, stickerError.message);
          if (attempt === 3) return;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }

      if (fs.existsSync(outputTempPath)) fs.unlinkSync(outputTempPath);
      if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath);

    } catch (error) {
      console.error("[AUTO-STICKER] Erro:", error);
    }
  },

  isActive: (groupId) => {
    const isActive = autoStickerGroups.has(groupId);
    console.log(`[AUTO-STICKER] Verificando se está ativo no grupo ${groupId}: ${isActive}`);
    console.log(`[AUTO-STICKER] Todos os grupos ativos:`, Array.from(autoStickerGroups));
    return isActive;
  },

  getActiveGroups: () => Array.from(autoStickerGroups),
  
  clear: () => {
    autoStickerGroups.clear();
    saveActiveGroups(autoStickerGroups);
  }
};