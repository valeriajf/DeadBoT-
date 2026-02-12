/**
 * Interceptadores diversos.
 *
 * @author Dev Gui
 */
const { delay } = require("baileys");
let { OWNER_NUMBER, OWNER_LID } = require("../config");
const { compareUserJidWithOtherNumber, normalizeToLid } = require("../utils");
const { getPrefix, getOwnerNumber, getOwnerLid } = require("../utils/database");

OWNER_NUMBER = getOwnerNumber() || OWNER_NUMBER;
OWNER_LID = getOwnerLid() || OWNER_LID;

/**
 * 🔧 FIX: Função auxiliar para normalizar JIDs
 * Remove sufixos como :0, :60 e garante formato consistente
 */
const normalizeJidForComparison = (jid) => {
  if (!jid) return '';
  // Remove sufixos (:0, :60, etc) e mantém apenas a parte principal
  return jid.split(':')[0];
};

exports.verifyPrefix = (prefix, groupJid) => {
  const groupPrefix = getPrefix(groupJid);

  return groupPrefix === prefix;
};

exports.hasTypeAndCommand = ({ type, command }) => !!type && !!command;

exports.isLink = (text) => {
  const cleanText = text.trim();

  if (/^\d+$/.test(cleanText)) {
    return false;
  }

  if (/[.]{2,3}/.test(cleanText)) {
    return false;
  }

  const ipPattern =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  if (ipPattern.test(cleanText.split("/")[0])) {
    return true;
  }

  const urlPattern =
    /(https?:\/\/)?(www\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(\/[^\s]*)?/g;

  const matches = cleanText.match(urlPattern);

  if (!matches || matches.length === 0) {
    return false;
  }

  const fileExtensions =
    /\.(txt|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|jpg|jpeg|png|gif|mp4|mp3|avi)$/i;

  return matches.some((match) => {
    const cleanMatch = match.replace(/^https?:\/\//, "").replace(/^www\./, "");

    const matchIndex = cleanText.indexOf(match);
    const beforeMatch = cleanText.substring(0, matchIndex);
    const afterMatch = cleanText.substring(matchIndex + match.length);

    const charBefore = beforeMatch.slice(-1);
    const charAfter = afterMatch.slice(0, 1);

    if (
      charBefore &&
      /[a-zA-Z0-9]/.test(charBefore) &&
      !/[\s\.\,\:\;\!\?\(\)\[\]\{\}]/.test(charBefore)
    ) {
      return false;
    }

    if (
      charAfter &&
      /[a-zA-Z0-9]/.test(charAfter) &&
      !/[\s\.\,\:\;\!\?\(\)\[\]\{\}\/]/.test(charAfter)
    ) {
      return false;
    }

    if (/\s/.test(cleanMatch)) {
      return false;
    }

    if (fileExtensions.test(cleanMatch)) {
      return false;
    }

    const domainPart = cleanMatch.split("/")[0];
    if (domainPart.split(".").length < 2) {
      return false;
    }

    const parts = domainPart.split(".");
    const extension = parts[parts.length - 1];
    if (extension.length < 2) {
      return false;
    }

    try {
      const url = new URL("https://" + cleanMatch);
      return url.hostname.includes(".") && url.hostname.length > 4;
    } catch {
      return false;
    }
  });
};

exports.isAdmin = async ({ remoteJid, userJid, socket }) => {
  const { participants, owner } = await socket.groupMetadata(remoteJid);

  const normalizedUserJid = await normalizeToLid(socket, userJid);

  const participant = participants.find((participant) => {
    const pLid = participant.id.includes("@lid")
      ? participant.id
      : `${onlyNumbers(participant.id)}@lid`;
    return pLid === normalizedUserJid;
  });

  if (!participant) {
    return (
      normalizedUserJid === OWNER_LID ||
      compareUserJidWithOtherNumber({
        userJid: normalizedUserJid,
        otherNumber: OWNER_NUMBER,
      })
    );
  }

  const ownerLid = owner.includes("@lid") ? owner : `${onlyNumbers(owner)}@lid`;

  const isOwner =
    normalizedUserJid === ownerLid ||
    participant.admin === "superadmin" ||
    compareUserJidWithOtherNumber({
      userJid: normalizedUserJid,
      otherNumber: OWNER_NUMBER,
    });

  const isAdmin = participant.admin === "admin";

  return isOwner || isAdmin;
};

exports.isBotOwner = ({ userJid }) => {
  if (userJid === OWNER_LID) {
    return true;
  }

  return compareUserJidWithOtherNumber({
    userJid: userJid,
    otherNumber: OWNER_NUMBER,
  });
};

/**
 * 🔧 FIX COMPLETO: checkPermission com normalização robusta de JIDs
 * 
 * O problema era que a comparação de JIDs falhava quando:
 * - UserJid tinha sufixo (ex: 110604585046097@lid)
 * - Participant tinha sufixo diferente (ex: 110604585046097:60@lid)
 * 
 * Agora normalizamos TUDO antes de comparar!
 */
exports.checkPermission = async ({ type, socket, userJid, remoteJid }) => {
  // Comandos de membro podem ser executados por qualquer um
  if (type === "member") {
    return true;
  }

  try {
    await delay(200);

    const { participants, owner } = await socket.groupMetadata(remoteJid);
    const normalizedUserJid = await normalizeToLid(socket, userJid);

    // 🔧 FIX: Normaliza o JID do usuário removendo sufixos
    const cleanUserJid = normalizeJidForComparison(normalizedUserJid);

    // 🔧 FIX: Busca participante com comparação normalizada
    const participant = participants.find((p) => {
      const pLid = p.id.includes("@lid")
        ? p.id
        : `${onlyNumbers(p.id)}@lid`;
      
      const cleanParticipantJid = normalizeJidForComparison(pLid);
      
      // Compara versões limpas (sem sufixos)
      return cleanParticipantJid === cleanUserJid;
    });

    // Se não encontrou, verifica se é o OWNER do BOT
    if (!participant) {
      const isBotOwner = 
        normalizedUserJid === OWNER_LID ||
        compareUserJidWithOtherNumber({
          userJid: normalizedUserJid,
          otherNumber: OWNER_NUMBER,
        });
      
      return isBotOwner && (type === "admin" || type === "owner");
    }

    // 🔧 FIX: Normaliza owner do grupo também (pode ser undefined!)
    let isGroupOwner = false;
    
    if (owner) {
      const ownerLid = owner.includes("@lid")
        ? owner
        : `${onlyNumbers(owner)}@lid`;
      
      const cleanOwnerJid = normalizeJidForComparison(ownerLid);
      isGroupOwner = cleanUserJid === cleanOwnerJid;
    }

    const isAdmin =
      participant.admin === "admin" || participant.admin === "superadmin";

    const isBotOwner =
      normalizedUserJid === OWNER_LID ||
      compareUserJidWithOtherNumber({
        userJid: normalizedUserJid,
        otherNumber: OWNER_NUMBER,
      });

    // Comandos de admin: aceita dono do grupo, admins ou dono do bot
    if (type === "admin") {
      return isGroupOwner || isAdmin || isBotOwner;
    }

    // Comandos owner: apenas dono do grupo ou dono do bot
    if (type === "owner") {
      return isGroupOwner || isBotOwner;
    }

    return false;
  } catch (error) {
    console.error('❌ [checkPermission] Erro:', error.message);
    return false;
  }
};