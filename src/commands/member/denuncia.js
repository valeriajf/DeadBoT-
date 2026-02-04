const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "denuncia",
  description: "Envia uma denúncia aos administradores do grupo",
  commands: ["denuncia", "denunciar", "reportar"],
  usage: `${PREFIX}denuncia @usuário / motivo da denúncia`,
  category: "member",
  
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    socket,
    args,
    sendSuccessReact,
    getGroupAdmins,
    getGroupParticipants,
    remoteJid,
    userJid,
    isGroup,
    webMessage,
  }) => {
    // Verifica se está em grupo
    if (!isGroup) {
      throw new InvalidParameterError("Este comando só funciona em grupos!");
    }

    // Valida argumentos
    if (!args.length || args.length < 2) {
      throw new InvalidParameterError(
        `❌ *Uso incorreto!*\n\n` +
        `📌 *Formato:* ${PREFIX}denuncia @usuário / motivo\n\n` +
        `💡 *Exemplo:*\n${PREFIX}denuncia @5511999999999 / enviando spam`
      );
    }

    // Extrai o número do infrator e o motivo
    const [infractorArg, ...motivoParts] = args;
    const motivo = motivoParts.join(" / ").trim();

    if (!motivo) {
      throw new InvalidParameterError(
        "❌ Você precisa informar o motivo da denúncia!"
      );
    }

    // MÉTODO 1: Verifica se há menção direta na mensagem
    let infractorJid;
    const mentionedJids = webMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    if (mentionedJids.length > 0) {
      // Se alguém foi mencionado, usa a primeira menção
      infractorJid = mentionedJids[0];
    } else {
      // MÉTODO 2: Extrai número e procura nos participantes
      const numbersOnly = infractorArg.replace(/\D/g, "");
      
      if (!numbersOnly) {
        throw new InvalidParameterError(
          "❌ Número do usuário inválido! Mencione o usuário com @ ou use o número completo."
        );
      }

      // Obtém todos os participantes do grupo
      const participants = await getGroupParticipants(remoteJid);
      
      // Procura o participante com o número correspondente
      infractorJid = participants.find(p => p.includes(numbersOnly));
      
      if (!infractorJid) {
        // Se não encontrar, tenta formato padrão
        infractorJid = `${numbersOnly}@s.whatsapp.net`;
      }
    }

    // Obtém lista de administradores
    const admins = await getGroupAdmins(remoteJid);
    
    if (!admins || admins.length === 0) {
      throw new InvalidParameterError(
        "❌ Não foi possível obter a lista de administradores!"
      );
    }

    // Reação de processamento
    await sendSuccessReact();

    // Cria a lista de menções dos administradores
    const adminMentions = admins.map(admin => `@${admin.split('@')[0]}`);
    
    // Extrai o número do denunciado para exibição
    const infractorNumber = infractorJid.split('@')[0];

    // Monta a mensagem de denúncia
    const denunciaMsg = 
      `🚨 *NOVA DENÚNCIA RECEBIDA* 🚨\n\n` +
      `👤 *Denunciado:* @${infractorNumber}\n` +
      `📝 *Motivo:* ${motivo}\n` +
      `👮 *Denunciante:* @${userJid.split("@")[0]}\n\n` +
      `⚠️ *Administradores, verifiquem esta denúncia:*\n` +
      `${adminMentions.join(' ')}`;

    // Array com TODAS as menções necessárias
    const allMentions = [
      infractorJid,      // Denunciado
      userJid,           // Denunciante
      ...admins          // Todos os administradores
    ];

    // ENVIA USANDO SOCKET DIRETAMENTE
    await socket.sendMessage(remoteJid, {
      text: denunciaMsg,
      mentions: allMentions
    });

  },
};