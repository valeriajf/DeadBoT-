/**
 * Middleware para verificar se o grupo tem aluguel ativo
 * Integra com o sistema de verificação de grupos ativos
 * 
 * @author Adaptado para DeadBoT
 */
const path = require("node:path");
const { temAluguelAtivo, obterAluguelDoGrupo } = require(path.join(__dirname, "aluguel"));
const { deactivateGroup } = require(path.join(__dirname, "database"));
const { isDono } = require(path.join(__dirname, "ownerCheck"));

/**
 * Lista de comandos que funcionam mesmo sem aluguel
 * (comandos do sistema de aluguel)
 */
const COMANDOS_LIBERADOS = [
  'reg_aluguel',
  'regaluguel', 
  'registraraluguel',
  'rg_aluguel',
  'listar_aluguel',
  'listaraluguel',
  'listaluguel',
  'apagar_aluguel',
  'del_aluguel',
  'deletaraluguel',
  'removeraluguel',
  'status_aluguel',
  'statusaluguel',
  'aluguel_info',
  'aluguel'
];

/**
 * Verifica se o grupo tem aluguel ativo E válido
 * Se o aluguel expirou mas o grupo ainda está ativo, desativa
 * 
 * @param {string} groupId - ID do grupo
 * @param {string} messageText - Texto da mensagem (para verificar comando)
 * @param {string} userJid - JID do usuário
 * @returns {boolean} true se pode processar, false se deve bloquear
 */
function verificarAluguelAtivo(groupId, messageText = "", userJid = "") {
  // Não é grupo, permite processar
  if (!groupId.endsWith("@g.us")) {
    return true;
  }

  // Verifica se é um comando de aluguel
  const texto = messageText.toLowerCase().trim();
  const ehComandoAluguel = COMANDOS_LIBERADOS.some(cmd => 
    texto.includes(cmd) || texto.startsWith('#' + cmd) || texto.startsWith('!' + cmd)
  );

  // ⭐ Se for comando status_aluguel, SEMPRE permite (para ADMs verem status expirado)
  if (texto.includes('status') && texto.includes('aluguel')) {
    return true;
  }

  // Se for comando de aluguel E for o dono, permite sempre
  if (ehComandoAluguel && isDono(userJid)) {
    return true;
  }

  // Verifica se tem aluguel ativo no banco
  const aluguel = obterAluguelDoGrupo(groupId);
  
  // Não tem aluguel cadastrado, bloqueia
  if (!aluguel) {
    return false;
  }

  // Verifica se o aluguel está expirado
  const agora = Date.now();
  const expirado = aluguel.expiraTimestamp <= agora;

  if (expirado) {
    // Aluguel expirado! Desativa o grupo
    console.log(`⚠️ [Aluguel] Grupo ${groupId} com aluguel expirado, desativando...`);
    deactivateGroup(groupId);
    return false;
  }

  // Aluguel válido, permite processar
  return true;
}

module.exports = {
  verificarAluguelAtivo,
};
