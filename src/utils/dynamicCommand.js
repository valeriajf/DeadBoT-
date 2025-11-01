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

  // 🔍 DEBUG - Log 1: Informações básicas do comando
  console.log("=== DEBUG COMANDO ===");
  console.log("Comando:", commandName);
  console.log("Type:", type);
  console.log("Command Name:", command?.name);
  console.log("UserJid:", userJid);
  console.log("isLid:", isLid);
  console.log("RemoteJid:", remoteJid);
  console.log("ActiveGroup:", activeGroup);
  console.log("isBotOwner:", isBotOwner({ userJid, isLid }));
  console.log("===================");

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

  if (!isBotOwner({ userJid, isLid }) && !activeGroup) {
    if (verifyPrefix(prefix, remoteJid) && hasTypeAndCommand({ type, command })) {
      if (command.name !== "on") {
        await sendWarningReply(
          "Este grupo está desativado! Peça para o dono do grupo ativar o bot!"
        );
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