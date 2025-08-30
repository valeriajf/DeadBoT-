// @author: VaL

const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "motivar",
  description: "Envia uma frase motivacional aleatória",
  commands: ["motivar", "motivacional", "inspirar"],
  usage: `${PREFIX}motivar`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ sendText }) => {
    const frases = [
      "O segredo do sucesso é desistir antes de tentar!",
      "A vida é uma montanha-russa... Pena que você esqueceu o cinto!",
      "O NÃO está garantido, mas ainda dá pra correr atrás da humilhação!",
      "Se está difícil hoje, lembre-se: sempre dá pra piorar!",
      "Insista, persista, desista. Aceite o ciclo natural da vida!",
      "Sempre há luz no fim do túnel, mas é o trem vindo na sua direção!",
      "Se a vida te der limões, faça uma cara feia e aceite que vai ser azedo mesmo!",
      "O importante é competir... E perder com estilo!",
      "Nunca é tarde para desistir dos seus planos!",
      "O tempo muda tudo, menos a minha capacidade de ser trouxa.",
      "Ultimamente tenho trabalhado de forma culposa: quando não há intenção de trabalhar.",
      "Tudo passa, nem que seja por cima de você!",
      "Você falhou hoje? Não se preocupe, amanhã você vai falhar mais!",
      "Sorria! O pior ainda está por vir.",
      "Nunca foi azar, sempre foi incompetência!",
    ];

    const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];

    await sendText(fraseAleatoria);
  },
};