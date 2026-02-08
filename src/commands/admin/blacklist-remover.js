const fs = require('fs');
const path = require('path');
const { InvalidParameterError, DangerError } = require(`${BASE_DIR}/errors`);
const { PREFIX } = require(`${BASE_DIR}/config`);

const blacklistFile = path.join(__dirname, '../../../blacklist.json');

/**
 * Lê o arquivo de blacklist
 */
function readBlacklist() {
  if (!fs.existsSync(blacklistFile)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(blacklistFile, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Salva o arquivo de blacklist
 */
function saveBlacklist(blacklist) {
  try {
    fs.writeFileSync(blacklistFile, JSON.stringify(blacklist, null, 2));
  } catch (error) {
    console.error('Erro ao salvar blacklist:', error);
    throw error;
  }
}

/**
 * Remove caracteres não-numéricos
 */
function onlyNumbers(text) {
  return text.replace(/\D/g, '');
}

/**
 * Encontra o JID na blacklist pelo número
 */
function findJidByNumber(blacklist, number) {
  const cleanNumber = onlyNumbers(number);
  
  // Primeiro tenta pelo JID padrão
  const standardJid = `${cleanNumber}@s.whatsapp.net`;
  if (blacklist[standardJid]) {
    return standardJid;
  }
  
  // Busca em todas as entradas pelo número
  for (const [jid, data] of Object.entries(blacklist)) {
    if (!data || typeof data !== 'object') continue;
    
    const blacklistNumber = data.number || onlyNumbers(jid);
    
    if (blacklistNumber === cleanNumber) {
      return jid;
    }
  }
  
  return null;
}

/**
 * Remove TODAS as entradas do mesmo número (JID e LID)
 */
function removeFromBlacklist(blacklist, targetJid, targetNumber) {
  const cleanNumber = onlyNumbers(targetNumber);
  const jidsToRemove = [];
  
  // Coleta todos os JIDs com o mesmo número
  for (const [jid, data] of Object.entries(blacklist)) {
    const blacklistNumber = data.number || onlyNumbers(jid);
    if (blacklistNumber === cleanNumber || jid === targetJid) {
      jidsToRemove.push(jid);
    }
  }
  
  // Remove todos
  jidsToRemove.forEach(jid => delete blacklist[jid]);
  
  return jidsToRemove.length;
}

/**
 * Extrai JID do usuário mencionado, resposta ou argumento
 */
function extractTargetJid(webMessage, args, blacklist) {
  // 1. Verifica se há argumento (número digitado)
  if (args.length > 0) {
    const providedNumber = onlyNumbers(args[0]);
    
    if (providedNumber.length >= 10) {
      // Procura o JID correspondente na blacklist
      const foundJid = findJidByNumber(blacklist, providedNumber);
      if (foundJid) {
        return { jid: foundJid, number: providedNumber };
      }
      
      // Se não encontrou, retorna o número mesmo assim para validação posterior
      return { jid: null, number: providedNumber };
    }
  }

  // 2. Verifica se é uma resposta a mensagem
  const quotedMsg = webMessage.message?.extendedTextMessage?.contextInfo;
  if (quotedMsg?.participant) {
    return { jid: quotedMsg.participant, number: onlyNumbers(quotedMsg.participant) };
  }

  // 3. Verifica se há menção na mensagem
  const mentionedJid = webMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentionedJid) {
    return { jid: mentionedJid, number: onlyNumbers(mentionedJid) };
  }

  return { jid: null, number: null };
}

module.exports = {
  name: "blacklist-remover",
  description: "Remove um usuário da lista negra global",
  commands: ["blacklist-remover", "unblacklist", "remover-blacklist"],
  usage: `${PREFIX}blacklist-remover <número>\n${PREFIX}blacklist-remover (responder mensagem)\n${PREFIX}blacklist-remover @usuário`,
  handle: async ({
    args,
    sendSuccessReply,
    sendErrorReply,
    sendWarningReply,
    webMessage,
    userJid,
  }) => {
    try {
      // Lê a blacklist atual
      const blacklist = readBlacklist();

      // Extrai o JID do alvo (argumento, menção ou resposta)
      const { jid: targetJid, number: targetNumber } = extractTargetJid(webMessage, args, blacklist);

      if (!targetNumber) {
        throw new InvalidParameterError(
          '❌ *Uso incorreto!*\n\n' +
          `📝 *Formas de usar:*\n\n` +
          `1️⃣ ${PREFIX}blacklist-remover 5511999999999\n` +
          `2️⃣ ${PREFIX}blacklist-remover @usuário\n` +
          `3️⃣ ${PREFIX}blacklist-remover (responder mensagem)`
        );
      }

      // Procura o JID na blacklist
      let foundJid = targetJid;
      if (!foundJid) {
        foundJid = findJidByNumber(blacklist, targetNumber);
      }

      // Verifica se o usuário está na blacklist
      if (!foundJid || !blacklist[foundJid]) {
        throw new DangerError(
          `⚠️ *Usuário não encontrado*\n\n` +
          `👤 *Número:* +${targetNumber}\n` +
          `📋 *Status:* Não está na lista negra`
        );
      }

      // Remove TODAS as entradas com esse número (JID + LID se existir)
      const removedCount = removeFromBlacklist(blacklist, foundJid, targetNumber);
      saveBlacklist(blacklist);

      console.log(`✅ Usuário ${targetNumber} removido da blacklist (${removedCount} entrada(s)) por ${onlyNumbers(userJid)}`);

      // Prepara menções (se o JID estiver disponível)
      const mentions = foundJid ? [foundJid, userJid] : [userJid];

      // Envia mensagem de sucesso
      await sendSuccessReply(
        `✅ *Removido da Lista Negra*\n\n` +
        `👤 *Usuário:* +${targetNumber}\n` +
        `🔓 *Status:* Pode entrar em grupos novamente\n` +
        `👮 *Removido por:* @${onlyNumbers(userJid)}\n` +
        `📅 *Data:* ${new Date().toLocaleString('pt-BR')}\n\n` +
        `📊 *Entradas removidas:* ${removedCount}`,
        mentions
      );

    } catch (error) {
      if (error instanceof InvalidParameterError) {
        await sendWarningReply(error.message);
      } else if (error instanceof DangerError) {
        await sendErrorReply(error.message);
      } else {
        console.error('Erro ao remover da blacklist:', error);
        await sendErrorReply(
          '❌ Ocorreu um erro ao remover o usuário da lista negra. Tente novamente.'
        );
      }
    }
  },
};