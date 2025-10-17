module.exports = {
  name: "sorteio",
  description: "Sorteia um membro do grupo",
  commands: ["sorteio", "sortear", "sorteie"],
  usage: `${process.env.PREFIX}sorteio [descrição do prêmio]`,
  handle: async ({ 
    isGroup,
    fullArgs, 
    sendReply, 
    sendErrorReply, 
    sendWaitReact, 
    sendSuccessReact,
    getGroupParticipants 
  }) => {
    // Verifica se o comando foi usado em um grupo
    if (!isGroup) {
      return sendErrorReply("❌ Este comando só pode ser usado em grupos!");
    }

    await sendWaitReact();

    try {
      // Obtém todos os participantes do grupo
      const participants = await getGroupParticipants();

      if (!participants || participants.length === 0) {
        return sendErrorReply("❌ Não foi possível obter os membros do grupo!");
      }

      // Filtra apenas membros válidos
      const membros = participants.map(p => p.id || p);

      if (membros.length === 0) {
        return sendErrorReply("❌ Nenhum membro disponível para sortear!");
      }

      // Sorteia um membro aleatório
      const vencedor = membros[Math.floor(Math.random() * membros.length)];
      
      // Extrai o número do vencedor (remove @s.whatsapp.net)
      const numeroVencedor = vencedor.split("@")[0];

      // Define a descrição do sorteio
      const descricao = fullArgs || "sorteio";

      await sendSuccessReact();

      // Envia mensagem com menção
      await sendReply(
        `🎲 *Sorteio - ${descricao}*\n\n` +
        `🎉 *Usuário sorteado:*\n` +
        `👤 @${numeroVencedor}\n\n` +
        `🎊 Parabéns!`,
        [vencedor]
      );

    } catch (error) {
      console.error("Erro no sorteio:", error);
      await sendErrorReply("❌ Erro ao realizar o sorteio. Tente novamente!");
    }
  }
};