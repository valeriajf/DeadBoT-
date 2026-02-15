/**
 * Direcionador
 * de comandos.
 *
 * @author Dev Gui
 */
const {
  DangerError,
  WarningError,
  InvalidParameterError,
} = require("../errors");
const { findCommandImport } = require(".");
const {
  verifyPrefix,
  hasTypeAndCommand,
  isLink,
  isAdmin,
  checkPermission,
  isBotOwner,
} = require("../middlewares");
const {
  isActiveGroup,
  getAutoResponderResponse,
  isActiveAutoResponderGroup,
  isActiveAntiLinkGroup,
  isActiveOnlyAdmins,
  getPrefix,
} = require("./database");
const { errorLog } = require("../utils/logger");
const { ONLY_GROUP_ID, BOT_EMOJI } = require("../config");
const { badMacHandler } = require("./badMacHandler");

/**
 * @param {CommandHandleProps} paramsHandler
 * @param {number} startProcess
 */
exports.dynamicCommand = async (paramsHandler, startProcess) => {
  const {
    commandName,
    fullMessage,
    isLid,
    prefix,
    remoteJid,
    sendErrorReply,
    sendReact,
    sendReply,
    sendWarningReply,
    socket,
    userJid,
    webMessage,
  } = paramsHandler;

  const activeGroup = isActiveGroup(remoteJid);

  if (activeGroup && isActiveAntiLinkGroup(remoteJid) && isLink(fullMessage)) {
    if (!userJid) return;

    if (!(await isAdmin({ remoteJid, userJid, socket }))) {
      await socket.groupParticipantsUpdate(remoteJid, [userJid], "remove");

      await sendReply("Anti-link ativado! Você foi removido por enviar um link!");

      await socket.sendMessage(remoteJid, {
        delete: {
          remoteJid,
          fromMe: false,
          id: webMessage.key.id,
          participant: webMessage.key.participant,
        },
      });

      return;
    }
  }

  const { type, command } = findCommandImport(commandName);

  if (ONLY_GROUP_ID && ONLY_GROUP_ID !== remoteJid) {
    return;
  }

  if (activeGroup) {
    if (!verifyPrefix(prefix, remoteJid) || !hasTypeAndCommand({ type, command })) {
      if (isActiveAutoResponderGroup(remoteJid)) {
        const response = getAutoResponderResponse(fullMessage);
        if (response) await sendReply(response);
      }
      return;
    }

    if (!(await checkPermission({ type, ...paramsHandler }))) {
      await sendErrorReply("Você não tem permissão para executar este comando!");
      return;
    }

    if (isActiveOnlyAdmins(remoteJid)) {
      if (!userJid) {
        await sendWarningReply("Não foi possível identificar o usuário!");
        return;
      }
      if (!(await isAdmin({ remoteJid, userJid, socket }))) {
        await sendWarningReply("Somente administradores podem executar comandos!");
        return;
      }
    }
  }

  // ⭐ VERIFICA SE É COMANDO STATUS-ALUGUEL (pode executar mesmo com grupo desativado)
  const isStatusAluguel = command && 
    ['status-aluguel', 'status_aluguel', 'statusaluguel', 'aluguel_info', 'aluguel'].includes(command.name);

  if (!isBotOwner({ userJid, isLid }) && !activeGroup) {
    if (verifyPrefix(prefix, remoteJid) && hasTypeAndCommand({ type, command })) {
      // ⭐ Permite comando "on" (ativar) e "status-aluguel" mesmo com grupo desativado
      if (command.name !== "on" && !isStatusAluguel) {
        // ⭐ NOVA MENSAGEM: Mostra status do aluguel em vez de "grupo desativado"
        await mostrarStatusAluguelDesativado(remoteJid, socket, sendReply);
        return;
      }

      if (!(await checkPermission({ type, ...paramsHandler }))) {
        await sendErrorReply("Você não tem permissão para executar este comando!");
        return;
      }
    } else {
      return;
    }
  }

  if (!verifyPrefix(prefix, remoteJid)) {
    return;
  }

  const groupPrefix = getPrefix(remoteJid);

  if (fullMessage === groupPrefix) {
    await sendReact(BOT_EMOJI);
    await sendReply(
      `Este é meu prefixo! Use ${groupPrefix}menu para ver os comandos disponíveis!`
    );
    return;
  }

  if (!hasTypeAndCommand({ type, command })) {
    await sendWarningReply(
      `Comando não encontrado! Use ${groupPrefix}menu para ver os comandos disponíveis!`
    );
    return;
  }

  // 🔒 VERIFICAÇÃO ESPECÍFICA PARA COMANDOS OWNER
  // Garante que apenas o dono do bot pode executar comandos da pasta owner
  if (type === 'owner' && !isBotOwner({ userJid, isLid })) {
    await sendErrorReply("❌ Este comando é exclusivo para o dono do bot!");
    return;
  }

  try {
    // 🔥 Aqui injetamos groupMetadata e participants
    let groupMetadata = null;
    let participants = [];

    if (remoteJid && remoteJid.endsWith("@g.us")) {
      try {
        groupMetadata = await socket.groupMetadata(remoteJid);
        participants = groupMetadata?.participants?.map((p) => p.id) || [];
      } catch (e) {
        console.error("Erro ao obter groupMetadata:", e?.message || e);
      }
    }

    await command.handle({
      ...paramsHandler,
      type,
      startProcess,
      groupMetadata,
      participants,
    });
  } catch (error) {
    if (badMacHandler.handleError(error, `command:${command?.name}`)) {
      await sendWarningReply(
        "Erro temporário de sincronização. Tente novamente em alguns segundos."
      );
      return;
    }

    if (badMacHandler.isSessionError(error)) {
      errorLog(
        `Erro de sessão durante execução de comando ${command?.name}: ${error.message}`
      );
      await sendWarningReply(
        "Erro de comunicação. Tente executar o comando novamente."
      );
      return;
    }

    if (error instanceof InvalidParameterError) {
      await sendWarningReply(`Parâmetros inválidos! ${error.message}`);
    } else if (error instanceof WarningError) {
      await sendWarningReply(error.message);
    } else if (error instanceof DangerError) {
      await sendErrorReply(error.message);
    } else if (error.isAxiosError) {
      const messageText = error.response?.data?.message || error.message;
      const url = error.config?.url || "URL não disponível";
      const isSpiderAPIError = url.includes("api.spiderx.com.br");

      await sendErrorReply(
        `Ocorreu um erro ao executar uma chamada remota para ${
          isSpiderAPIError ? "a Spider X API" : url
        } no comando ${command.name}!
      
📄 *Detalhes*: ${messageText}`
      );
    } else {
      errorLog("Erro ao executar comando", error);
      await sendErrorReply(
        `Ocorreu um erro ao executar o comando ${command.name}!
      
📄 *Detalhes*: ${error.message}`
      );
    }
  }
};

/**
 * ⭐ Mostra status do aluguel quando o grupo está desativado
 * @param {string} remoteJid - ID do grupo
 * @param {Object} socket - Socket do WhatsApp
 * @param {Function} sendReply - Função para enviar resposta
 */
async function mostrarStatusAluguelDesativado(remoteJid, socket, sendReply) {
  try {
    const { obterAluguelDoGrupo } = require("./aluguel");
    const aluguel = obterAluguelDoGrupo(remoteJid);
    
    // Busca o nome do grupo
    let nomeGrupo = "Grupo sem nome";
    try {
      const metadata = await socket.groupMetadata(remoteJid);
      nomeGrupo = metadata?.subject || metadata?.name || "Grupo sem nome";
    } catch (err) {
      console.log("⚠️ Não foi possível obter o nome do grupo");
    }

    // Se tem aluguel mas está expirado
    if (aluguel) {
      const agora = Date.now();
      const expirado = aluguel.expiraTimestamp <= agora;
      
      if (expirado) {
        await sendReply(
          `🪀 *NOME:* ${nomeGrupo}\n` +
          `*🆔 GRUPO:* ${remoteJid}\n` +
          `📅 *VENCIMENTO:* ${aluguel.expira}\n` +
          `💢 *STATUS:* 🔴 DESATIVADO\n\n` +
          `🚨 *Renove seu aluguel*`
        );
        return;
      }
    }

    // Se não tem aluguel cadastrado
    await sendReply(
      `📊 *STATUS DO ALUGUEL*\n\n` +
      `*🪀 NOME:* ${nomeGrupo}\n` +
      `*🆔 GRUPO:* ${remoteJid}\n` +
      `💢 *STATUS:* 🔴 DESATIVADO\n\n` +
      `🚨 *Renove seu aluguel*`
    );
  } catch (error) {
    console.error("Erro ao mostrar status do aluguel:", error);
    // Fallback para mensagem antiga se der erro
    await sendReply(
      "⚠️ Atenção! Este grupo está desativado! Peça para o dono do grupo ativar o bot!"
    );
  }
}
