const { toUserJidOrLid, isGroup } = require(`${BASE_DIR}/utils`);
const { errorLog } = require(`${BASE_DIR}/utils/logger`);

const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { getProfileImageData } = require(`${BASE_DIR}/services/baileys`);

module.exports = {
  name: "ficha",
  description: "Mostra a ficha zoeira de um usuário",
  commands: ["ficha"],
  usage: `${PREFIX}ficha @usuario ou responda a mensagem de alguém`,
  handle: async ({
    args,
    socket,
    remoteJid,
    userJid,
    replyJid,      // ✅ JID de quem teve a mensagem respondida
    isReply,       // ✅ true se o comando foi enviado como resposta
    webMessage,
    sendErrorReply,
    sendWaitReply,
    sendSuccessReact,
    getGroupParticipants
  }) => {

    if (!isGroup(remoteJid)) {
      throw new InvalidParameterError(
        "Este comando só pode ser usado em grupo."
      );
    }

    // ==============================
    // 🎯 DEFINIR USUÁRIO ALVO
    // ==============================

    let targetJid = userJid;

    // 1️⃣ Se marcou alguém
    if (args[0]) {
      targetJid = toUserJidOrLid(args[0]);
    }

    // 2️⃣ Se respondeu mensagem de alguém
    else if (isReply && replyJid) {
      targetJid = replyJid;
    }

    await sendWaitReply("Puxando ficha criminal do elemento...");

    try {

      // ==============================
      // 🤖 SE MARCAR OU RESPONDER O BOT
      // ==============================

      const botId = socket.user.id;
      const botIdNormalized = botId.split(":")[0] + "@s.whatsapp.net";
      const targetNormalized = targetJid.split(":")[0] + "@s.whatsapp.net";

      if (targetNormalized === botIdNormalized) {
        await socket.sendMessage(remoteJid, {
          react: { text: "🤨", key: webMessage.key }
        });

        return await socket.sendMessage(remoteJid, {
          text: `⚠️ *ACESSO NEGADO*\n\nVocê tentou investigar o DeadBoT.\nArquivo classificado nível OWNER.\n\n🤖 Sistema anti-fofoca ativado.`,
          mentions: [userJid]
        });
      }

      // ==============================
      // 📸 FOTO + CARGO
      // ==============================

      let profilePicUrl;
      let userRole = "Membro";

      try {
        const { profileImage } = await getProfileImageData(socket, targetJid);
        profilePicUrl =
          profileImage || `${ASSETS_DIR}/images/default-user.png`;
      } catch (error) {
        errorLog(`Erro ao pegar foto do usuário: ${error}`);
        profilePicUrl = `${ASSETS_DIR}/images/default-user.png`;
      }

      const groupMetadata = await socket.groupMetadata(remoteJid);

      const participant = groupMetadata.participants.find(
        (p) => p.id === targetJid
      );

      if (participant?.admin) {
        userRole = "Administrador";
      }

      // ==============================
      // 📊 ACTIVITY TRACKER
      // ==============================

      const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);
      const userStats = activityTracker.getUserStats(remoteJid, targetJid);
      const groupStats = activityTracker.getGroupStats(remoteJid);

      const messages = userStats.messages || 0;
      const stickers = userStats.stickers || 0;
      const commands = userStats.commands || 0;
      const audios = userStats.audios || 0;
      const total = userStats.total || 0;

      // ==============================
      // 🏆 RANKING REAL
      // ==============================

      const participantsList = await getGroupParticipants();
      const activeMembers = [];

      for (const [userId, data] of Object.entries(groupStats)) {
        const isStillInGroup = participantsList.some(p => p.id === userId);
        if (!isStillInGroup) continue;

        const totalUser =
          (data.messages || 0) +
          (data.stickers || 0) +
          (data.commands || 0) +
          (data.audios || 0);

        activeMembers.push({ userId, total: totalUser });
      }

      activeMembers.sort((a, b) => b.total - a.total);

      const index = activeMembers.findIndex(u => u.userId === targetJid);
      const rankPosition = index !== -1 ? `${index + 1}º` : "—";

      // ==============================
      // 📈 PORCENTAGENS REAIS
      // ==============================

      const safeTotal = total === 0 ? 1 : total;

      const textPercent = Math.floor((messages / safeTotal) * 100);
      const stickerPercent = Math.floor((stickers / safeTotal) * 100);
      const commandPercent = Math.floor((commands / safeTotal) * 100);
      const audioPercent = Math.floor((audios / safeTotal) * 100);

      // ==============================
      // 🎭 CLASSE AUTOMÁTICA
      // ==============================

      let classe = "👀 Observador Misterioso";

      const maxValue = Math.max(messages, stickers, commands, audios);

      if (maxValue === messages && total > 0)
        classe = "📢 Digitador Compulsivo";

      if (maxValue === stickers && total > 0)
        classe = "🖼️ Ministro das Figurinhas";

      if (maxValue === audios && total > 0)
        classe = "🎙️ Podcast Humano";

      if (maxValue === commands && total > 0)
        classe = "🤖 Testador Oficial do Bot";

      // ==============================
      // 🔥 NÍVEL DE ATIVIDADE
      // ==============================

      let nivel = "👻 Fantasma Profissional";

      if (total > 0 && total < 50)
        nivel = "💤 Estagiário do Grupo";

      if (total >= 50 && total < 300)
        nivel = "🟡 Funcionário CLT do Zap";

      if (total >= 300 && total < 1000)
        nivel = "🔥 Sócio da Conversa";

      if (total >= 1000)
        nivel = "👑 Dono Emocional do Grupo";

      // ==============================
      // 👑 VERSÃO ESPECIAL ADM
      // ==============================

      const header =
        userRole === "Administrador"
          ? "╭━━━〔 👑 DOSSIÊ CONFIDENCIAL DA AUTORIDADE 〕━━━╮"
          : "╭━━━〔 📋 FICHA CRIMINOSA DO ELEMENTO 〕━━━╮";

      const statusEspecial =
        userRole === "Administrador"
          ? "🛡️ Status: Autoridade sob proteção divina"
          : `🏆 Ranking: ${rankPosition}`;

      // ==============================
      // 🧾 MENSAGEM FINAL
      // ==============================

      const mensagem = `
${header}

👤 Nome: @${targetJid.split("@")[0]}
🎖️ Cargo: ${userRole}

💬 Interações Totais: ${total}
📊 Nível: ${nivel}

📝 Textos: ${textPercent}%
🖼️ Figurinhas: ${stickerPercent}%
🎤 Áudios: ${audioPercent}%
🤖 Comandos: ${commandPercent}%

🧬 Classe Social:
${classe}

${statusEspecial}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

      await sendSuccessReact();

      await socket.sendMessage(remoteJid, {
        image: { url: profilePicUrl },
        caption: mensagem,
        mentions: [targetJid],
      });

    } catch (error) {
      console.error(error);
      sendErrorReply("Erro ao puxar a ficha do elemento.");
    }
  },
};
