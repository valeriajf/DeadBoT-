const { PREFIX } = require(`${BASE_DIR}/config`);
const { WarningError } = require(`${BASE_DIR}/errors`);
const { getAllBirthdays } = require(`${BASE_DIR}/utils/niverDatabase`);

module.exports = {
  name: "niver-listar",
  description: "Lista todos os aniversários registrados (do mais velho ao mais novo)",
  commands: ["niver-listar", "niver-lista", "niver-all"],
  usage: `${PREFIX}niver-listar`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    sendSuccessReact,
    sendWaitReact,
    remoteJid,
    socket,
  }) => {
    await sendWaitReact();

    const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);
    const allBirthdays = getAllBirthdays();

    if (!allBirthdays || Object.keys(allBirthdays).length === 0) {
      throw new WarningError(
        `⚠️ Nenhum aniversário registrado ainda!\n\n` +
          `📌 Para registrar, use:\n${PREFIX}niver-reg DD/MM/AAAA`
      );
    }

    // Buscar participantes do grupo
    let rawParticipants = [];
    try {
      const groupMeta = await socket.groupMetadata(remoteJid);
      rawParticipants = groupMeta.participants;
    } catch (e) {}

    // Mapa: LID → JID real (553291945133@s.whatsapp.net)
    // p.lid = LID salvo no birthdays.json
    // p.jid = JID real necessário para menção clicável
    const lidToRealJid = {};
    for (const p of rawParticipants) {
      const lid = p.lid || p.id;
      if (lid && p.jid) {
        lidToRealJid[lid] = p.jid;
      }
    }

    const participantLids = rawParticipants.map((p) => p.lid || p.id);

    // Filtrar apenas membros que ainda estão no grupo
    const groupBirthdays = Object.entries(allBirthdays).filter(([lid]) =>
      participantLids.includes(lid)
    );

    if (groupBirthdays.length === 0) {
      throw new WarningError(
        `⚠️ Nenhum membro do grupo possui aniversário registrado!\n\n` +
          `📌 Para registrar, use:\n${PREFIX}niver-reg DD/MM/AAAA`
      );
    }

    // Ordenar do mais velho ao mais novo
    groupBirthdays.sort((a, b) => {
      const A = a[1], B = b[1];
      if (A.year !== B.year) return A.year - B.year;
      if (A.month !== B.month) return A.month - B.month;
      return A.day - B.day;
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    let list = `🎂 *LISTA DE ANIVERSÁRIOS* 🎂\n`;
    list += `📊 Total: *${groupBirthdays.length} membro${groupBirthdays.length > 1 ? "s" : ""}*\n`;
    list += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // mentions recebe os JIDs reais (553291945133@s.whatsapp.net)
    const mentions = [];

    for (const [lid, { day, month, year }] of groupBirthdays) {
      const formattedDate = `${day.toString().padStart(2, "0")}/${month
        .toString()
        .padStart(2, "0")}/${year}`;

      // Calcular idade corretamente
      const birthdayPassedThisYear =
        month < currentMonth || (month === currentMonth && day <= currentDay);
      const age = currentYear - year - (birthdayPassedThisYear ? 0 : 1);

      const isBirthdayToday = day === currentDay && month === currentMonth;

      // JID real para o mentions
      const realJid = lidToRealJid[lid];

      if (!realJid) continue; // segurança: pula se não achar o JID real

      // Número limpo para o texto: 553291945133
      const phone = realJid.split("@")[0];

      mentions.push(realJid);

      const birthdayEmoji = isBirthdayToday ? "🎉" : "🎈";

      // @numero no texto + realJid no mentions = menção clicável
      list += `${birthdayEmoji} @${phone}\n`;
      list += `   📅 *${formattedDate}* · ${age} anos\n`;

      if (isBirthdayToday) {
        list += `   🥳 _Hoje é seu aniversário!_\n`;
      }

      list += `\n`;
    }

    list += `━━━━━━━━━━━━━━━━━━━━━\n`;
    list += `_"Celebre cada ano de vida!"_ 🎊`;

    await sendSuccessReact();

    await socket.sendMessage(remoteJid, {
      text: list,
      mentions: mentions,
    });
  },
};
