// @author: 𝓗𝓮𝓷𝓻𝓲𝓺𝓾𝓮 𝓳𝓸𝓼𝓮 </>

const { PREFIX } = require(`${BASE_DIR}/config`);
const { editOwnMessage } = require(`${BASE_DIR}/utils/messageUtils`);
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = {
  name: "fumar",
  description: "O bot fuma um beck e pode até ter uma overdose 🍁💨",
  commands: ["fumar", "beck", "420"],
  usage: `${PREFIX}fumar`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ sendReply, socket, remoteJid }) => {
    const brisaNormal = [
      `🚬💨 *Acendendo o beck...*`,
      `🍁🔥 *Primeira tragada...* 😶‍🌫️`,
      `🍁💨 *Chapandoooo* 🌀`,
      `🤯 *Efeito bateu...*`,
      `😵 *Vish... to travado*`,
      `🍃💭 *Refletindo sobre a existência do bot...*`,
      `🛸 *Tô na brisa... indo pra Netuno*`,
      `😮‍💨 *A última tragada...*`,
      `✨ *Brisa finalizada. Voltando ao código...*`
    ];

    const overdoseFinal = [
      `☠️ *Opa... acho que exagerei na dose*`,
      `💀 *Sistema travado... Reboot forçado em 3...2...1...*`,
      `😵‍💫 *Maconha adulterada... entrando em coma digital*`,
      `🧠 *Stack Overflow de brisa detectado*`,
      `🔥 *Erro 420: Bot queimou a mente*`
    ];

    const chanceDeOverdose = Math.random() < 0.75; // 75% de chance

    // Envia a primeira mensagem da brisa
    const sentMsg = await sendReply(brisaNormal[0]);
    let messageId = sentMsg.key.id;

    // Executa a sequência da brisa até a penúltima
    for (let i = 1; i < brisaNormal.length - 1; i++) {
      await delay(1300);
      const newMsgId = await editOwnMessage(socket, remoteJid, messageId, brisaNormal[i]);
      if (newMsgId) messageId = newMsgId;
    }

    await delay(1600);

    if (chanceDeOverdose) {
      const finalOverdose = overdoseFinal[Math.floor(Math.random() * overdoseFinal.length)];
      const overdoseMsgId = await editOwnMessage(socket, remoteJid, messageId, finalOverdose);
      if (overdoseMsgId) messageId = overdoseMsgId;
    } else {
      const newMsgId = await editOwnMessage(socket, remoteJid, messageId, brisaNormal[brisaNormal.length - 1]);
      if (newMsgId) messageId = newMsgId;
    }
  },
};