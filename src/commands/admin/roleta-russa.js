/**
 *
 * Comando: roleta-russa
 * Sempre escolhe o membro menos ativo (exceto administradores) e remove.
 * 
 * @author @VaL
 * 
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "roletarussa",
  description: "Escolhe o membro menos ativo do grupo e remove (exceto admins).",
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
  }) => {
    try {
      if (!remoteJid || !remoteJid.endsWith("@g.us")) {
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

      let candidates = [];
      if (Array.isArray(metadata.participants) && metadata.participants.length) {
        candidates = metadata.participants
          .map((p) => ({
            id: normalize(p.id || p.jid),
            display: p.notify || p.name || (p.id || p.jid || "").split("@")[0],
          }))
          .filter((p) => p.id && !admins.includes(p.id) && p.id !== botJid && !p.id.endsWith("@g.us"));
      } else if (Array.isArray(participants) && participants.length) {
        candidates = participants
          .map((jid) => ({ id: normalize(jid), display: (jid || "").split("@")[0] }))
          .filter((p) => p.id && !admins.includes(p.id) && p.id !== botJid && !p.id.endsWith("@g.us"));
      }

      if (candidates.length === 0) {
        await sendText("⚠️ Não há membros comuns no grupo para banir.");
        return;
      }

      let chosen = null;
      try {
        if (activityTracker && typeof activityTracker.getLeastActive === "function") {
          const ids = candidates.map((c) => c.id);
          const leastActiveId = activityTracker.getLeastActive(ids);
          if (leastActiveId) {
            chosen = candidates.find((c) => c.id === leastActiveId) || null;
          }
        }
      } catch (e) {
        console.error("Erro ao consultar activityTracker.getLeastActive:", e?.message || e);
      }

      if (!chosen) {
        chosen = candidates[Math.floor(Math.random() * candidates.length)];
      }

      await sendText("🔫 Girando o tambor da roleta...");

      await socket.groupParticipantsUpdate(remoteJid, [chosen.id], "remove");

      // 🔥 Mensagem final estética simplificada
      await socket.sendMessage(remoteJid, {
        text: `☠️ A roleta girou e o azarado menos ativo foi @${chosen.id.split("@")[0]}`,
        mentions: [chosen.id],
      });

      try {
        if (activityTracker && typeof activityTracker.removeUser === "function") {
          activityTracker.removeUser(remoteJid, chosen.id);
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