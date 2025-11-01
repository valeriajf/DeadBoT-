/**
 * Utilitário para verificar se o usuário é dono do bot
 * 
 * @author Adaptado para DeadBoT
 */
const { OWNER_NUMBER, OWNER_LID } = require("../config");

/**
 * Verifica se o usuário é o dono do bot
 * Suporta verificação por número normal e por LID (novo sistema do WhatsApp)
 * 
 * @param {string} userJid - JID do usuário
 * @returns {boolean} true se for o dono, false caso contrário
 */
function isDono(userJid) {
  if (!userJid) return false;

  // Verifica se é o LID do dono
  if (OWNER_LID && userJid === OWNER_LID) {
    return true;
  }

  // Verifica se é o número do dono (formato antigo)
  if (OWNER_NUMBER) {
    // Remove o @s.whatsapp.net se houver
    const userNumber = userJid.split("@")[0];
    const ownerNumber = OWNER_NUMBER.split("@")[0];
    
    if (userNumber === ownerNumber) {
      return true;
    }
  }

  return false;
}

module.exports = {
  isDono,
};