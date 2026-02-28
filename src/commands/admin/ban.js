/**
 *COMANDO BAN - DeadBoT    
 * By Dev VaL 😈  
 */

const { PREFIX, OWNER_NUMBER, OWNER_LID } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "ban",
  description: "Remove um membro do grupo",
  commands: ["ban", "kick", "expulsar"],
  usage: `${PREFIX}ban @usuario`,

  handle: async ({
    socket,
    remoteJid,
    userJid,
    sendText,
    sendReact,
    sendErrorReply,
    groupMetadata,
    isGroup,
    isReply,
    replyJid,
    webMessage,
  }) => {
    try {

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔒 Apenas em grupos
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (!isGroup || !remoteJid.endsWith("@g.us")) {
        await sendReact("❌");
        await sendText("❌ Este comando só pode ser usado em grupos.");
        return;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔧 Normalização de JIDs
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const normalize = (jid) => {
        if (!jid || typeof jid !== "string") return "";
        return jid.replace(/:.*$/g, "").replace("c.us", "s.whatsapp.net");
      };

      const sender       = normalize(userJid);
      const ownerNumJid  = normalize(OWNER_NUMBER + "@s.whatsapp.net");
      const ownerLid     = normalize(OWNER_LID || "");

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 📋 Metadados do grupo
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let metadata = groupMetadata;
      if (!metadata || !Array.isArray(metadata.participants)) {
        metadata = await socket.groupMetadata(remoteJid);
      }

      const admins = (metadata.participants || [])
        .filter((p) => p.admin === "admin" || p.admin === "superadmin" || p.admin === true)
        .map((p) => normalize(p.id || p.jid));

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 👑 Checagem de dona
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const isOwner =
        sender === ownerNumJid ||
        (ownerLid && sender === ownerLid);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔐 Permissão: ADM ou DONA
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (!admins.includes(sender) && !isOwner) {
        await sendReact("🚫");
        await sendText("🚫 Apenas *administradores* podem usar esse comando, novinho.");
        return;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🎯 Pegar alvo
      // Prioridade: menção no texto → resposta a mensagem
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      // Takeshi Bot: mentionedJid fica dentro do webMessage raw
      const mentionedJid =
        webMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        webMessage?.message?.imageMessage?.contextInfo?.mentionedJid?.[0] ||
        webMessage?.message?.videoMessage?.contextInfo?.mentionedJid?.[0];

      // Se marcou alguém no texto usa a menção, senão usa o replyJid (resposta)
      const targetJid = mentionedJid || (isReply ? replyJid : null);

      if (!targetJid) {
        await sendReact("❓");
        await sendText("❓ Marque ou responda a mensagem do usuário que deseja banir.");
        return;
      }

      const alvo = normalize(targetJid);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🛡️ Não banir a DONA
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (alvo === ownerNumJid || (ownerLid && alvo === ownerLid)) {
        await sendReact("😌");
        await sendText("🚫 Você não pode remover a *DONA* do bot. Esquece essa ideia. 😌");
        return;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🛡️ Não banir outro ADM (exceto se for dona)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (admins.includes(alvo) && !isOwner) {
        await sendReact("❌");
        await sendText("❌ Você não pode remover outro *administrador* do grupo.");
        return;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🎲 Frases rotativas
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const frasesBan = [
        "💥 E foi de base! DeadBoT estalou os dedos… membro evaporado.",
        "🗡️ Corte rápido e preciso! Alvo removido do multiverso do grupo.",
        "🚪 DeadBoT abriu a porta… e a pessoa já tá do lado de fora.",
        "🧨 BOOM! Esse NPC acabou de ser desinstalado.",
        "🔫 Missão cumprida. O mercenário aqui não erra.",
        "🩸 Plot twist: achou que era protagonista… era figurante.",
        "🛑 Ban aplicado com sucesso. Reclamações? Fale com o Wolverine.",
        "📦 Embalado, etiquetado e despachado pra fora do grupo.",
        "🧤 DeadBoT estalou os dedos e… tchauzinho.",
        "🎬 Cena deletada do roteiro do grupo.",
        "☠️ Mais um que subestimou o DeadBoT. Erro fatal.",
        "🃏 Cartas na mesa: você perdeu, tchau.",
        "🌪️ Varrido do grupo como poeira. Sem drama.",
        "⚰️ R.I.P. permanência nesse grupo. Curta estadia.",
        "🎯 Headshot! Direto ao ponto, sem chance de defesa.",
      ];

      const frase = frasesBan[Math.floor(Math.random() * frasesBan.length)];

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ⚡ Reação + Banimento + Mensagem
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      await sendReact("💀");

      await socket.groupParticipantsUpdate(remoteJid, [alvo], "remove");

      await socket.sendMessage(remoteJid, {
        text: `☠️ *BANIMENTO*

👤 *Banido:* @${alvo.split("@")[0]}
👮 *ADM:* @${sender.split("@")[0]}

${frase}

👋 *Adeus*`,
        mentions: [alvo, sender],
      });

    } catch (err) {
      console.error("[DeadBoT] Erro no comando ban:", err);
      try {
        await sendReact("⚠️");
        await sendText("⚠️ Ocorreu um erro ao executar o banimento.\n\n💡 Verifique se o bot é *administrador* do grupo.");
      } catch (_) {}
    }
  },
};
