/**
Comando BanGhost - Lista e bane membros fantasmas (inativos)

NOVA LÓGICA:
- Lista até 10 membros com atividade <= critério
- Se confirmar SIM, bane 5 aleatórios dos 10 listados (tipo roleta-russa)

@author Dev VaL
*/
const { PREFIX, BOT_NUMBER, OWNER_NUMBER } = require(`${BASE_DIR}/config`);
const { toUserJid, onlyNumbers } = require(`${BASE_DIR}/utils`);

// Armazenamento temporário para confirmações de banimento
const pendingBans = new Map();

module.exports = {
  name: "banghost",
  description: "Lista até 10 membros fantasmas e pode banir 5 aleatórios",
  commands: ["banghost", "banfantasma"],
  usage: `${PREFIX}banghost [número]`,

  // Expõe o Map para ser acessado pelo loader
  getPendingBans: () => pendingBans,
  
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    sendSuccessReact,
    sendWarningReact,
    sendErrorReact,
    sendReply,
    sendErrorReply,
    remoteJid,
    baileysMessage,
    isGroup,
    userJid,
    getGroupParticipants,
    socket,
    args,
    webMessage
  }) => {
    try {
      // Verificar se é um grupo
      if (!isGroup) {
        await sendWarningReact();
        return await sendReply("⚠️ Este comando só pode ser usado em grupos!");
      }

      // Verificar se é resposta SIM/NÃO (tratado pelo loader.js)
      const text = webMessage?.message?.conversation || webMessage?.message?.extendedTextMessage?.text || "";
      const textUpper = text.trim().toUpperCase();
      
      if (textUpper === 'SIM' || textUpper === 'NÃO' || textUpper === 'NAO') {
        return; // Será tratado pelo loader.js
      }

      // Pega os participantes do grupo para verificar admin manualmente
      const participants = await getGroupParticipants();

      // Verifica se o usuário é admin manualmente
      const userParticipant = participants.find(p => p.id === userJid);
      const isUserAdmin = userParticipant && (userParticipant.admin === 'admin' || userParticipant.admin === 'superadmin');

      if (!isUserAdmin) {
        await sendWarningReact();
        return await sendReply("❌ Apenas administradores podem usar este comando!");
      }

      // Verifica se o bot é admin usando LID
      const botLidFromSocket = socket.user?.lid;
      const botLidClean = botLidFromSocket?.split(':')[0] + '@lid';
      
      let botParticipant = participants.find(p => p.id === botLidClean);
      
      if (!botParticipant && botLidFromSocket) {
        botParticipant = participants.find(p => p.id === botLidFromSocket);
      }
      
      const isBotAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');

      if (!isBotAdmin) {
        await sendWarningReact();
        await executeListOnly(remoteJid, args, sendReply, getGroupParticipants, socket);
        return;
      }

      await sendSuccessReact();

      // Pega o número mínimo de mensagens (padrão: 0)
      const minMessages = parseInt(args[0]) || 0;
      
      if (minMessages < 0) {
        await sendWarningReact();
        return await sendReply("❌ O número deve ser maior ou igual a 0!");
      }

      // Carrega o activityTracker
      const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);
      
      // Obtém estatísticas do grupo atual
      const groupStats = activityTracker.getGroupStats(remoteJid);

      // Obter nome do grupo
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const groupName = groupMetadata.subject || "Grupo";

      // Filtrar membros fantasmas - ignorando administradores e owner
      const ghostMembers = [];
      const botJidForFilter = toUserJid(BOT_NUMBER);
      const ownerNumber = OWNER_NUMBER;
      
      for (const participant of participants) {
        const userId = participant.id;
        const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
        const userNumber = onlyNumbers(userId);
        
        // Ignorar administradores, owner e bot
        if (isAdmin) continue;
        if (ownerNumber && userNumber === ownerNumber) continue;
        if (userId === botJidForFilter) continue;
        
        // Verificar atividade do usuário
        const userData = groupStats[userId];
        const messages = userData ? (userData.messages || 0) : 0;
        const stickers = userData ? (userData.stickers || 0) : 0;
        const total = messages + stickers;
        
        // Adicionar se atender ao critério
        if (total <= minMessages) {
          const displayName = activityTracker.getDisplayName(remoteJid, userId);
          
          ghostMembers.push({
            userId,
            jid: userId,
            name: displayName,
            messageCount: messages,
            stickerCount: stickers,
            total: total
          });
        }
      }

      if (ghostMembers.length === 0) {
        return await sendReply(
          `🎉 *GRUPO ATIVO* 🎉\n` +
          `📅 *Grupo:* ${groupName}\n\n` +
          `✅ Parabéns!\n` +
          `👥 Não há membros com ${minMessages} mensagem(s) ou menos\n` +
          `🏆 Todos estão participando ativamente\n` +
          `💪 Continue incentivando a participação!`
        );
      }

      // ⭐ NOVA LÓGICA: Embaralhar e limitar a 10
      const shuffledGhosts = ghostMembers.sort(() => Math.random() - 0.5);
      const ghostsToShow = shuffledGhosts.slice(0, Math.min(10, shuffledGhosts.length));

      // Gera ID de confirmação único
      const confirmationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Construir lista de fantasmas
      let listMessage = `👻 *MEMBROS FANTASMAS* 👻\n`;
      listMessage += `📅 *Grupo:* ${groupName}\n`;
      listMessage += `📊 *Critério:* ${minMessages} mensagem(s) ou menos\n`;
      listMessage += `👥 *Total encontrados:* ${ghostMembers.length} membros\n`;
      listMessage += `📋 *Exibindo:* ${ghostsToShow.length} membros\n\n`;

      // Array para menções
      const mentions = [];

      // Emojis para variar
      const ghostEmojis = ["💀", "👻", "☠️", "🌑", "🦇", "🕷️", "🕸️", "⚰️", "🪦", "💤"];

      ghostsToShow.forEach((member, index) => {
        const emoji = ghostEmojis[index % ghostEmojis.length];
        const userMention = `@${member.userId.split('@')[0]}`;
        mentions.push(member.userId);
        
        listMessage += `${emoji} 👤${userMention}\n`;
        listMessage += `   📝 ${member.messageCount} mensagens\n`;
        listMessage += `   🎭 ${member.stickerCount} figurinhas\n`;
        listMessage += `   📊 ${member.total} total\n\n`;
      });

      listMessage += `⚠️ *ATENÇÃO:*\n`;
      listMessage += `Se você confirmar, *5 MEMBROS ALEATÓRIOS* dos ${ghostsToShow.length} listados serão banidos! 🎲\n\n`;
      listMessage += `Para BANIR 5 aleatórios, digite: *SIM*\n`;
      listMessage += `Para CANCELAR, digite: *NÃO*\n`;
      listMessage += `⏰ Você tem 1 minuto para responder...`;

      // Enviar com menções
      await sendReply(listMessage, mentions);

      // ⭐ Armazena apenas os membros exibidos (não todos)
      pendingBans.set(confirmationId, {
        chatId: remoteJid,
        adminJid: userJid,
        ghostMembers: ghostsToShow, // Apenas os 10 exibidos
        minMessages,
        timestamp: Date.now(),
        expiresAt: Date.now() + 60000 // 1 minuto
      });

    } catch (error) {
      await sendErrorReact();
      await sendErrorReply(`Ocorreu um erro ao buscar os membros fantasmas: ${error.message}`);
    }
  }

};

/**
Executa apenas listagem quando bot não é admin
*/
async function executeListOnly(remoteJid, args, sendReply, getGroupParticipants, socket) {
  try {
    const minMessages = parseInt(args[0]) || 0;

    // Carrega o activityTracker
    const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);

    // Pega os participantes do grupo
    const participants = await getGroupParticipants();

    // Obtém estatísticas do grupo atual
    const groupStats = activityTracker.getGroupStats(remoteJid);

    // Obter nome do grupo
    const groupMetadata = await socket.groupMetadata(remoteJid);
    const groupName = groupMetadata.subject || "Grupo";

    // Filtrar membros fantasmas - ignorando administradores
    const ghostMembers = [];
    const botJid = toUserJid(BOT_NUMBER);
    const ownerNumber = OWNER_NUMBER;

    for (const participant of participants) {
      const userId = participant.id;
      const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
      const userNumber = onlyNumbers(userId);

      // Ignorar administradores
      if (isAdmin) continue;
      if (ownerNumber && userNumber === ownerNumber) continue;
      if (userId === botJid) continue;

      // Verificar atividade do usuário
      const userData = groupStats[userId];
      const messages = userData ? (userData.messages || 0) : 0;
      const stickers = userData ? (userData.stickers || 0) : 0;
      const total = messages + stickers;

      // Adicionar se atender ao critério
      if (total <= minMessages) {
        const displayName = activityTracker.getDisplayName(remoteJid, userId);

        ghostMembers.push({
          userId,
          name: displayName,
          messageCount: messages,
          stickerCount: stickers,
          total: total
        });
      }
    }

    if (ghostMembers.length === 0) {
      return await sendReply(
        `🎉 *GRUPO ATIVO* 🎉\n` +
        `📅 *Grupo:* ${groupName}\n\n` +
        `✅ Parabéns!\n` +
        `👥 Não há membros com ${minMessages} mensagem(s) ou menos\n` +
        `🏆 Todos estão participando ativamente`
      );
    }

    // ⭐ Embaralhar e limitar a 10
    const shuffledGhosts = ghostMembers.sort(() => Math.random() - 0.5);
    const ghostsToShow = shuffledGhosts.slice(0, Math.min(10, ghostMembers.length));

    // Construir lista (modo apenas visualização)
    let listMessage = `👻 *MEMBROS FANTASMAS* 👻\n`;
    listMessage += `📅 *Grupo:* ${groupName}\n`;
    listMessage += `📊 *Critério:* ${minMessages} mensagem(s) ou menos\n`;
    listMessage += `👥 *Total encontrados:* ${ghostMembers.length} membros\n`;
    listMessage += `📋 *Exibindo:* ${ghostsToShow.length} membros\n`;
    listMessage += `⚠️ *Bot não é admin - Apenas listando*\n\n`;

    // Array para menções
    const mentions = [];

    // Emojis para variar
    const ghostEmojis = ["💀", "👻", "☠️", "🌑", "🦇", "🕷️", "🕸️", "⚰️", "🪦", "💤"];

    ghostsToShow.forEach((member, index) => {
      const emoji = ghostEmojis[index % ghostEmojis.length];
      const userMention = `@${member.userId.split('@')[0]}`;
      mentions.push(member.userId);

      listMessage += `${emoji} 👤${userMention}\n`;
      listMessage += `   📝 ${member.messageCount} mensagens\n`;
      listMessage += `   🎭 ${member.stickerCount} figurinhas\n`;
      listMessage += `   📊 ${member.total} total\n\n`;
    });

    listMessage += `💡 *Para banir:*\n`;
    listMessage += `Torne o bot administrador e use o comando novamente`;

    // Enviar com menções
    await sendReply(listMessage, mentions);

  } catch (error) {
    await sendReply('❌ Erro ao listar membros fantasmas!');
  }
}

// ⚠️ NÃO COLOQUE setInterval AQUI!
// A limpeza de confirmações antigas está no loader.js
