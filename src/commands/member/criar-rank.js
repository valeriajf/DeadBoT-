/**
 * Comando: criar-rank
 * Descricao: Cria um rank tematico com 5 membros aleatorios do grupo.
 *
 * @author DeadBoT (Takeshi)
 */

const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function gerarPorcentagem(position) {
  const faixas = [
    [80, 100],
    [60, 79],
    [40, 59],
    [20, 39],
    [1, 19],
  ];
  const [min, max] = faixas[position];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gerarCaracteristica(position) {
  const lista = [
    [
      "lenda viva do grupo",
      "imbativel nessa categoria",
      "o numero 1 sem discussao",
      "simplesmente o melhor de todos",
      "ninguem chega perto",
    ],
    [
      "quase chegou la, mas quase...",
      "vice-campiao do grupo",
      "deu trabalho pro 1 lugar",
      "reserva de luxo",
      "mencao honrosa garantida",
    ],
    [
      "ta no podio, mas nao brilhou",
      "medalha de bronze nas maos",
      "deu o seu maximo (e ficou em 3 mesmo)",
      "nem bom nem ruim, e mediano",
      "foi por pouco que ficou em 3",
    ],
    [
      "quase no podio, mas quase",
      "o azarao do grupo",
      "tentou, mas nao foi dessa vez",
      "precisava se esforcar mais",
      "chegou pertinho do podio",
    ],
    [
      "o lanterna oficial do grupo",
      "conquistou o ultimo lugar com maestria",
      "dificil de ser assim tao... assim",
      "o grupo inteiro torcia pra nao ganhar",
      "ultimo lugar e campeao no coracao",
    ],
  ];
  const opcoes = lista[position];
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

function sortearEmoji(position) {
  const emojis = [
    ["🔥", "⚡", "💯", "🚀", "👑"],  // 1 lugar - intenso
    ["💥", "✨", "🎯", "💪", "🏆"],  // 2 lugar - forte
    ["💢", "🌟", "🎖️", "👏", "🔝"], // 3 lugar - mediano pra cima
    ["🙊", "😬", "🫠", "😅", "🤏"],  // 4 lugar - mediano pra baixo
    ["💤", "🪦", "😵", "🫥", "🗿"],  // 5 lugar - lanterna
  ];
  const opcoes = emojis[position];
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

const MEDALHAS = ["🥇", "🥈", "🥉", "🏅", "💀"];
const TITULOS  = ["1º Lugar", "2º Lugar", "3º Lugar", "4º Lugar", "5º Lugar"];

module.exports = {
  name: "criar-rank",
  description: "Cria um rank tematico com 5 membros aleatorios do grupo.",
  commands: ["criar-rank", "rank"],
  usage: `${PREFIX}criar-rank dos mais tagarelas do grupo`,

  handle: async ({
    sendReply,
    sendSuccessReact,
    sendWaitReact,
    sendErrorReply,
    fullArgs,
    remoteJid,
    isGroup,
    getGroupParticipants,
  }) => {
    if (!isGroup) {
      throw new InvalidParameterError(
        "Este comando so pode ser usado em grupos!"
      );
    }

    const tema = fullArgs?.trim();
    if (!tema) {
      throw new InvalidParameterError(
        `Informe o tema do rank!\n\n*Exemplo:* ${PREFIX}criar-rank dos mais tagarelas`
      );
    }

    await sendWaitReact();

    const participantes = await getGroupParticipants(remoteJid);

    if (!participantes || participantes.length === 0) {
      return sendErrorReply("Nao foi possivel obter os membros do grupo.");
    }

    const jids = participantes
      .map((p) => (typeof p === "string" ? p : p.id || p.jid))
      .filter(Boolean);

    if (jids.length < 5) {
      return sendErrorReply(
        "O grupo precisa ter pelo menos 5 membros para usar este comando!"
      );
    }

    const escolhidos = shuffle(jids).slice(0, 5);

    let msg = `🏆 *RANK ${tema.toUpperCase()}*\n`;
    msg    += `━━━━━━━━━━━━━━━━━━━\n\n`;

    escolhidos.forEach((jid, i) => {
      const mencao = "@" + jid.split("@")[0];
      msg += `${MEDALHAS[i]} *${TITULOS[i]}* — ${mencao}\n`;
      msg += `📊 ${gerarPorcentagem(i)}% ${sortearEmoji(i)}\n`;
      msg += `💬 _${gerarCaracteristica(i)}_\n\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💚 *By DeadBoT*`;

    await sendSuccessReact();
    await sendReply(msg, escolhidos);
  },
};
