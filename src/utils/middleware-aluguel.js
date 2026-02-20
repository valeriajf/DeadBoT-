/**
 * Middleware para verificar se o grupo tem aluguel ativo
 * @author Adaptado para DeadBoT
 */
const path = require("node:path");
const { obterAluguelDoGrupo } = require(path.join(__dirname, "aluguel"));

const COMANDOS_LIBERADOS = [
  'reg_aluguel', 'regaluguel', 'registraraluguel', 'rg_aluguel',
  'listar_aluguel', 'listaraluguel', 'listaluguel',
  'apagar_aluguel', 'del_aluguel', 'deletaraluguel', 'removeraluguel',
  'status_aluguel', 'statusaluguel', 'status-aluguel', 'aluguel_info', 'aluguel',
  'on'
];

function verificarAluguelAtivo(groupId, messageText = "", userJid = "") {
  if (!groupId || !groupId.endsWith("@g.us")) return true;

  const texto = (messageText || "").toLowerCase().trim();

  const ehComandoLiberado = COMANDOS_LIBERADOS.some(cmd =>
    texto.includes(cmd) ||
    texto.startsWith('#' + cmd) ||
    texto.startsWith('!' + cmd)
  );

  if (ehComandoLiberado) return true;

  const aluguel = obterAluguelDoGrupo(groupId);
  if (!aluguel) return false;

  return aluguel.expiraTimestamp > Date.now();
}

module.exports = { verificarAluguelAtivo };
