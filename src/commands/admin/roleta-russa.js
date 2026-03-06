/**
 *
 * Comando: roleta-russa (VERSÃO TEATRAL)
 * Mensagem única que se edita em cada ato • Suspense real • Chance 1/6
 * Suporte a JID e LID • Áudio • Frases Deadpool
 *
 * DeadBoT Cinematic Universe 🎬
 */

const path = require("path");
const fs = require("fs");
const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { editOwnMessage } = require(`${BASE_DIR}/utils/messageUtils`);

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  name: "roletarussa",
  description: "Versão teatral da roleta-russa (inativos 0 mensagens).",
  commands: ["roletarussa", "roleta-russa", "roleta"],
  usage: `${PREFIX}roletarussa`,

  handle: async ({
    socket,
    remoteJid,
    userJid,
    sendReply,
    groupMetadata,
    getGroupParticipants,
    isGroup,
  }) => {
    try {
      if (!isGroup || !remoteJid.endsWith("@g.us")) {
        return await sendReply("❌ Apenas grupos podem presenciar esse espetáculo.");
      }

      const normalize = (jid) => {
        if (!jid || typeof jid !== "string") return "";
        return jid.replace(/:.*$/g, "").replace("c.us", "s.whatsapp.net");
      };

      let metadata = groupMetadata;
      if (!metadata || !Array.isArray(metadata.participants)) {
        try {
          metadata = await socket.groupMetadata(remoteJid);
        } catch (e) {
          console.error("Erro ao obter groupMetadata:", e?.message || e);
        }
      }

      if (!metadata || !Array.isArray(metadata.participants)) {
        return await sendReply("❌ Não foi possível obter os dados do grupo.");
      }

      const botJid = normalize(socket?.user?.id || "");

      const admins = metadata.participants
        .filter((p) => p && (p.admin === "admin" || p.admin === "superadmin" || p.admin === true))
        .map((p) => normalize(p.id || p.jid))
        .filter(Boolean);

      if (!admins.includes(normalize(userJid))) {
        return await sendReply("❌ Apenas administradores podem abrir as cortinas.");
      }

      const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);
      const groupStats = activityTracker.getGroupStats(remoteJid);

      const rawParticipants = getGroupParticipants
        ? await getGroupParticipants()
        : metadata.participants.map((p) => ({
            id: normalize(p.id || p.jid),
            admin: p.admin,
          }));

      const participants = rawParticipants.map((p) => ({
        ...p,
        id: normalize(p.id || p.jid || ""),
      }));

      const inativos = [];
      for (const p of participants) {
        if (!p.id) continue;
        if (p.admin === "admin" || p.admin === "superadmin") continue;
        if (p.id.endsWith("@g.us")) continue;
        if (botJid && (p.id === botJid || botJid.includes(p.id.split("@")[0]))) continue;

        const data = groupStats[p.id];
        const total = (data?.messages || 0) + (data?.stickers || 0);
        if (total === 0) inativos.push(p.id);
      }

      if (!inativos.length) {
        return await sendReply(`🎭 *TEATRO ENCERRADO*\n\nNão há inativos hoje.\nO elenco está participativo.`);
      }

      const alvo = inativos[Math.floor(Math.random() * inativos.length)];
      const numero = Math.floor(Math.random() * 6) + 1;
      const sobrevive = numero === 6;
      const nome = `@${alvo.split("@")[0]}`;

      // =============================
      // ATOS 1 a 5
      // =============================
      const atos = [
        `🎭 *ROLETA RUSSA*\n\n🕯️ *O silêncio ecoava pelo grupo...*`,
        `🎭 *ROLETA RUSSA*\n\n🎻 *Uma música dramática começa a tocar ao fundo...*`,
        `🎭 *ROLETA RUSSA*\n\n🎲 *O destino foi lançado ao acaso...*`,
        `🎭 *ROLETA RUSSA*\n\n👀 *Todos observam em absoluto suspense...*`,
        `🎭 *ROLETA RUSSA*\n\n🔫 *O tambor gira lentamente...*`,
      ];

      // =============================
      // ATO FINAL — mensagem de adeus com menção
      // =============================
      const atosFinaisEliminado = [
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nome} era tão invisível que o grupo só percebeu quando sumiu.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nome} participava do grupo igual planta: só ocupava espaço.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nome} deve ter achado que curtir story contava como mensagem. Não conta.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nome} confundiu grupo de WhatsApp com modo avião.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nome} tinha 0 mensagens. ZERO. Nem "oi" esse ser mandou.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nome} era tão ativo quanto Wi-Fi de aeroporto.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\nA roleta escolheu ${nome}. Honestamente? Nem surpresa.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nome} foi pro grupo, viu as mensagens, e decidiu que não era com ele. Tá bom então.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nome} achou que silêncio era estratégia. A estratégia falhou.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nome} foi removido com honras. Ser inativo desse nível exige talento.`,
      ];

      // =============================
      // FRASES PÓS-BAN — Deadpool Mode ON (com menção)
      // =============================
      const frasesPosBan = [
        `💀 *Plot twist!*
*${nome} estava tão inativo que o WhatsApp já tinha declarado como peça de museu.*
*A roleta só fez o que precisava ser feito. 🔫✨*`,
        `🎯 *Missão cumprida!*
*${nome} passou tanto tempo sem falar que achei que era NPC bugado.*
*Atualização concluída: removido com sucesso.*`,
        `🔫 *A roleta girou...*
*E adivinha?*
*${nome} perdeu até sem jogar.*
*Isso que eu chamo de talento raro. 👏*`,
        `☠️ *Silêncio absoluto detectado.*
*${nome} estava treinando pra ser fantasma no grupo.*
*Resultado: promovido a lenda urbana. 👻*`,
        `🧃 *${nome} ficou tão quieto que achei que estava carregando 1% há três meses.*
*A bateria social acabou. Desinstalando...*`,
        `🎪 *Bem-vindos ao circo!*
*Hoje o número principal foi:*
*${nome} desaparecendo magicamente.*
*Palmas, plateia. 👏*`,
        `🕵️ *Investigação concluída:*
*${nome} tinha 0 mensagens. ZERO.*
*Nem um "oi sumida". Isso é dedicação ao silêncio.*`,
        `💣 *Spoiler alert:*
*A roleta não gosta de plantas ornamentais.*
*${nome} foi regado demais pela inatividade.*`,
        `🎮 *Modo difícil ativado.*
*${nome} tentou zerar o grupo sem enviar mensagens.*
*Conquista desbloqueada: Expulsão Aleatória™*`,
        `🧠 *Pensei em dar uma segunda chance…*
*Mentira.*
*A roleta não tem coração.*
*${nome} agora faz parte do multiverso dos removidos.*`,
      ];

      const atoFinalTexto = atosFinaisEliminado[Math.floor(Math.random() * atosFinaisEliminado.length)];
      const fraseFinalTexto = frasesPosBan[Math.floor(Math.random() * frasesPosBan.length)];
      const atoFinalSobreviveu = `🎉 *ATO FINAL*\n\n🎲 Número: ${numero}\n😮‍💨 ${nome} sobreviveu!\nO público vai à loucura!`;

      // =============================
      // PASSO 1 — Envia primeira mensagem
      // =============================
      const sentMsg = await sendReply(atos[0]);
      const msgKey = sentMsg?.key;

      // =============================
      // PASSO 2 — Edita pelos atos seguintes
      // =============================
      for (let i = 1; i < atos.length; i++) {
        await delay(2000);
        try {
          await socket.sendMessage(remoteJid, {
            text: atos[i],
            edit: msgKey,
          });
        } catch (e) {
          console.error(`[roleta] Erro ao editar ato ${i + 1}:`, e?.message || e);
        }
      }

      await delay(2500);

      // =============================
      // DESFECHO: SOBREVIVEU
      // =============================
      if (sobrevive) {
        try {
          await socket.sendMessage(remoteJid, {
            text: atoFinalSobreviveu,
            mentions: [alvo],
            edit: msgKey,
          });
        } catch (e) {
          await sendReply(atoFinalSobreviveu);
        }
        return;
      }

      // =============================
      // DESFECHO: ELIMINADO
      // =============================

      // PASSO 3 — Áudio do tiro
      const audioPath = path.join(ASSETS_DIR, "mp3", "tiro.ogg");
      if (fs.existsSync(audioPath)) {
        try {
          await socket.sendMessage(remoteJid, {
            audio: fs.readFileSync(audioPath),
            mimetype: "audio/mp4",
            ptt: true,
          });
        } catch (e) {
          console.error("[roleta] Erro ao enviar áudio:", e?.message || e);
        }
      } else {
        console.warn("[roleta] Áudio não encontrado:", audioPath);
      }

      await delay(1500);

      // PASSO 4 — ATO FINAL com menção (mensagem de adeus)
      await socket.sendMessage(remoteJid, {
        text: atoFinalTexto,
        mentions: [alvo],
      });

      await delay(1000);

      // PASSO 5 — Ban
      try {
        await socket.groupParticipantsUpdate(remoteJid, [alvo], "remove");
      } catch (removeErr) {
        console.error("Erro ao remover participante:", removeErr?.message || removeErr);
        return await sendReply(`❌ Não foi possível remover ${nome}. Verifique se sou admin.`);
      }

      await delay(500);

      // PASSO 6 — Frase sarcástica pós-ban (com menção)
      await socket.sendMessage(remoteJid, {
        text: fraseFinalTexto,
        mentions: [alvo],
      });

      // Remove do tracker
      try {
        if (typeof activityTracker.removeUser === "function") {
          activityTracker.removeUser(remoteJid, alvo);
        }
      } catch (e) {
        console.error("Erro ao atualizar activityTracker:", e?.message || e);
      }

    } catch (err) {
      console.error("Erro teatral:", err);
      await sendReply("❌ O teatro enfrentou problemas técnicos.");
    }
  },
};
