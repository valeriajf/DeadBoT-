/**
 *
 * Comando: roleta-russa
 * Escolhe apenas entre membros  inativos (0 mensagens) e remove.
 * 
 * @author @VaL
 * 
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "roletarussa",
  description: "Escolhe um membro inativo do grupo (0 mensagens) e remove (exceto admins).",
  commands: ["roletarussa", "roleta-russa", "roleta"],
  usage: `${PREFIX}roletarussa`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    socket,
    remoteJid,
    userJid,
    sendText,
    groupMetadata,
    participants,
    activityTracker,
    getGroupParticipants,
    isGroup,
  }) => {
    try {
      // Verificar se é um grupo
      if (!isGroup || !remoteJid || !remoteJid.endsWith("@g.us")) {
        await sendText("❌ Este comando só pode ser usado em grupos.");
        return;
      }

      let metadata = groupMetadata;
      if ((!metadata || !Array.isArray(metadata.participants)) && typeof socket.groupMetadata === "function") {
        try {
          metadata = await socket.groupMetadata(remoteJid);
        } catch (e) {
          console.error("Erro ao obter groupMetadata:", e?.message || e);
        }
      }

      if (!metadata || !Array.isArray(metadata.participants)) {
        await sendText("❌ Não foi possível obter os dados do grupo.");
        return;
      }

      const normalize = (jid) => {
        if (!jid || typeof jid !== "string") return "";
        return jid.replace(/:.*$/g, "").replace("c.us", "s.whatsapp.net");
      };

      const botJid = socket?.user?.id || "";

      const admins = metadata.participants
        .filter((p) => p && (p.admin === "admin" || p.admin === "superadmin" || p.admin === true))
        .map((p) => normalize(p.id || p.jid))
        .filter(Boolean);

      const sender = normalize(userJid);

      if (!admins.includes(sender)) {
        await sendText("❌ Este comando só pode ser usado por administradores.");
        return;
      }

      // Carregar o activityTracker
      const activityTrackerModule = require(`${BASE_DIR}/utils/activityTracker`);
      
      // Pegar participantes do grupo
      const groupParticipants = getGroupParticipants ? 
        await getGroupParticipants() : 
        metadata.participants.map(p => ({
          id: normalize(p.id || p.jid),
          admin: p.admin
        }));

      // Obter estatísticas do grupo
      const groupStats = activityTrackerModule.getGroupStats(remoteJid);

      // Filtrar apenas membros completamente inativos (0 mensagens)
      const inactiveMembers = [];
      
      for (const participant of groupParticipants) {
        const userId = participant.id;
        const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
        
        // Ignorar administradores e o próprio bot
        if (isAdmin || userId === botJid || userId.endsWith("@g.us")) continue;
        
        // Verificar atividade do usuário
        const userData = groupStats[userId];
        const messages = userData ? (userData.messages || 0) : 0;
        const stickers = userData ? (userData.stickers || 0) : 0;
        const total = messages + stickers;
        
        // Só adicionar se tiver 0 mensagens/figurinhas (completamente inativo)
        if (total === 0) {
          const displayName = activityTrackerModule.getDisplayName(remoteJid, userId);
          
          inactiveMembers.push({
            id: userId,
            display: displayName || userId.split("@")[0],
            total: 0
          });
        }
      }

      // Verificar se há membros inativos para banir
      if (inactiveMembers.length === 0) {
        await sendText(`
╭─「 🎉 *GRUPO ATIVO* 🎉 」
│
├ ✅ *Parabéns!*
├ 👥 Todos os membros já enviaram mensagens
├ 🏆 Não há membros completamente inativos
├ 💪 A roleta não tem alvos hoje!
│
╰─「 *DeadBoT* 」`);
        return;
      }

      // Escolher aleatoriamente um dos membros inativos
      const chosen = inactiveMembers[Math.floor(Math.random() * inactiveMembers.length)];

      await sendText(`🔫 Girando o tambor da roleta...\n`);

      // Remover o membro escolhido
      await socket.groupParticipantsUpdate(remoteJid, [chosen.id], "remove");

      // Mensagem final
      await socket.sendMessage(remoteJid, {
        text: `☠️ A roleta dos inativos girou e @${chosen.id.split("@")[0]} foi o escolhido!\n`,
        mentions: [chosen.id],
      });

      // Remover do tracker de atividade
      try {
        if (activityTrackerModule && typeof activityTrackerModule.removeUser === "function") {
          activityTrackerModule.removeUser(remoteJid, chosen.id);
        }
      } catch (e) {
        console.error("Erro ao atualizar activityTracker.removeUser:", e?.message || e);
      }

    } catch (err) {
      console.error("Erro no comando roleta-russa:", err);
      try {
        await sendText("❌ Ocorreu um erro ao executar a roleta-russa.");
      } catch (_) {}
    }
  },
};