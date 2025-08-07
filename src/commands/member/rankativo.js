const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "rankativo",
  description: "Mostra o ranking dos 10 membros mais ativos do grupo com menções",
  commands: ["rankativo", "topativos"],
  usage: `${PREFIX}rankativo`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ sendText, participants, isGroup, chatId }) => {
    if (!isGroup) {
      return sendText(chatId, "❌ Este comando só pode ser usado em grupos.");
    }

    if (!participants) {
      return sendText(chatId, "⚠️ Não consegui obter a lista de participantes do grupo.");
    }

    // Simulação de ranking (exemplo com dados aleatórios)
    const rankingFake = participants
      .map(p => ({
        id: p.id,
        mensagens: Math.floor(Math.random() * 200) + 1, // número aleatório de mensagens
      }))
      .sort((a, b) => b.mensagens - a.mensagens)
      .slice(0, 10); // pega só os 10 primeiros

    const mentions = rankingFake.map(m => m.id);

    let texto = "🏆 *TOP 10 MEMBROS MAIS ATIVOS DO GRUPO*\n\n";

    rankingFake.forEach((m, i) => {
      const tag = "@" + m.id.split("@")[0];
      texto += `*${i + 1}°* — ${tag} • *${m.mensagens} mensagens*\n`;
    });

    // Enviar mensagem com menções
    await sendText(chatId, texto, mentions);
  },
};