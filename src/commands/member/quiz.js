const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

// Armazena quizzes ativos por chat
const activeQuizzes = new Map();

// Banco de perguntas de conhecimentos gerais
const questions = [
  {
    pergunta: "Normalmente, quantos litros de sangue uma pessoa adulta tem?",
    opcoes: ["A) 2 a 4 litros", "B) 4 a 6 litros", "C) 10 litros", "D) 7 litros"],
    resposta: "B",
    explicacao: "Um adulto entre 50 e 80 kg pode ter entre 4 e 6 litros de sangue (7% a 8% do peso corporal).",
  },
  {
    pergunta: "De quem é a famosa frase \"Penso, logo existo\"?",
    opcoes: ["A) Platão", "B) Sócrates", "C) Descartes", "D) Galileu Galilei"],
    resposta: "C",
    explicacao: "A frase é do filósofo René Descartes (1596-1650), originalmente escrita em francês: \"Je pense, donc je suis\".",
  },
  {
    pergunta: "O chuveiro elétrico foi inventado em qual país?",
    opcoes: ["A) França", "B) Inglaterra", "C) Estados Unidos", "D) Brasil"],
    resposta: "D",
    explicacao: "Francisco Canhos desenvolveu o primeiro chuveiro elétrico seguro em Jaú-SP, na década de 40.",
  },
  {
    pergunta: "Qual é o menor país do mundo?",
    opcoes: ["A) Mônaco", "B) Nauru", "C) Vaticano", "D) São Marino"],
    resposta: "C",
    explicacao: "O Vaticano, sede da Igreja Católica, tem apenas 44 hectares (0,44 km²).",
  },
  {
    pergunta: "Qual presidente do Brasil ficou conhecido como Jango?",
    opcoes: ["A) Jânio Quadros", "B) Getúlio Vargas", "C) João Figueiredo", "D) João Goulart"],
    resposta: "D",
    explicacao: "João Belchior Marques Goulart (1919-1976) foi o 24º presidente do Brasil, governando de 1961 a 1964.",
  },
  {
    pergunta: "Qual é o livro mais vendido no mundo, depois da Bíblia?",
    opcoes: ["A) O Senhor dos Anéis", "B) O Pequeno Príncipe", "C) Dom Quixote", "D) Um Conto de Duas Cidades"],
    resposta: "C",
    explicacao: "Dom Quixote, de Miguel de Cervantes, é um clássico da literatura espanhola escrito em duas partes (1605 e 1615).",
  },
  {
    pergunta: "Quantas casas decimais tem o número Pi?",
    opcoes: ["A) Duas", "B) Vinte", "C) Milhares", "D) Infinitas"],
    resposta: "D",
    explicacao: "O número Pi é irracional e possui infinitas casas decimais. Já foram calculados mais de 62 trilhões delas.",
  },
  {
    pergunta: "Quantos elementos químicos a tabela periódica possui atualmente?",
    opcoes: ["A) 92", "B) 109", "C) 113", "D) 118"],
    resposta: "D",
    explicacao: "Os últimos elementos foram adicionados em 2016: Nihônio (113), Moscóvio (115), Tenessino (117) e Oganessônio (118).",
  },
  {
    pergunta: "O que a palavra inglesa \"legend\" significa em português?",
    opcoes: ["A) Legenda", "B) Lenda", "C) Legendário", "D) História"],
    resposta: "B",
    explicacao: "\"Legend\" é um falso cognato. Apesar da grafia parecida com \"legenda\", seu significado é lenda.",
  },
  {
    pergunta: "Qual é o número mínimo de jogadores por time em uma partida de futebol?",
    opcoes: ["A) 5", "B) 8", "C) 7", "D) 9"],
    resposta: "C",
    explicacao: "Uma partida de futebol pode continuar com no mínimo 7 jogadores (incluindo o goleiro) em cada equipe.",
  },
  {
    pergunta: "Quem pintou a famosa obra \"Guernica\"?",
    opcoes: ["A) Salvador Dalí", "B) Tarsila do Amaral", "C) Diego Rivera", "D) Pablo Picasso"],
    resposta: "D",
    explicacao: "Pablo Picasso pintou Guernica em 1937, retratando o bombardeio à cidade espanhola durante a Guerra Civil Espanhola.",
  },
  {
    pergunta: "Quanto tempo a luz do Sol demora para chegar à Terra?",
    opcoes: ["A) 12 minutos", "B) 1 dia", "C) 8 minutos", "D) 12 horas"],
    resposta: "C",
    explicacao: "A luz percorre os 150 milhões de km entre o Sol e a Terra em aproximadamente 8 minutos e 20 segundos.",
  },
  {
    pergunta: "Qual a nacionalidade de Che Guevara?",
    opcoes: ["A) Cubana", "B) Boliviana", "C) Peruana", "D) Argentina"],
    resposta: "D",
    explicacao: "Ernesto Guevara de La Serna nasceu em Rosário, Argentina, em 14 de junho de 1928.",
  },
  {
    pergunta: "Qual é a montanha mais alta do Brasil?",
    opcoes: ["A) Pico da Bandeira", "B) Monte Roraima", "C) Pico da Neblina", "D) Pico Paraná"],
    resposta: "C",
    explicacao: "O Pico da Neblina, com 2.995 metros, localiza-se no Amazonas na fronteira com Venezuela e Colômbia.",
  },
  {
    pergunta: "Qual é a velocidade da luz no vácuo?",
    opcoes: [
      "A) 150.000.000 m/s",
      "B) 299.792.458 m/s",
      "C) 300.000.000 m/s",
      "D) 199.792.458 m/s",
    ],
    resposta: "B",
    explicacao: "A velocidade da luz no vácuo é de exatamente 299.792.458 metros por segundo.",
  },
  {
    pergunta: "Em qual local da Ásia o português é língua oficial?",
    opcoes: ["A) Índia", "B) Filipinas", "C) Tailândia", "D) Macau"],
    resposta: "D",
    explicacao: "Macau tem duas línguas oficiais: mandarim e português. Foi território português até 1999.",
  },
  {
    pergunta: "Quem é o autor do livro \"O Príncipe\"?",
    opcoes: ["A) Rousseau", "B) Maquiavel", "C) Thomas Hobbes", "D) Montesquieu"],
    resposta: "B",
    explicacao: "O Príncipe é a obra mais célebre de Nicolau Maquiavel (1469-1527), publicada postumamente em 1532.",
  },
  {
    pergunta: "Qual é a conjugação correta de \"caber\" na 1ª pessoa do singular do presente do indicativo?",
    opcoes: ["A) Eu cabo", "B) Eu cabe", "C) Que eu caiba", "D) Eu caibo"],
    resposta: "D",
    explicacao: "\"Caber\" é um verbo irregular. A forma correta na 1ª pessoa do presente do indicativo é \"eu caibo\".",
  },
  {
    pergunta: "Qual foi o recurso usado inicialmente pelo homem para explicar a origem das coisas?",
    opcoes: ["A) A Filosofia", "B) A Matemática", "C) A Mitologia", "D) A Astronomia"],
    resposta: "C",
    explicacao: "A mitologia foi usada por diversas civilizações antigas para explicar fenômenos e a origem das coisas.",
  },
  {
    pergunta: "Qual país é transcontinental (pertence a mais de um continente)?",
    opcoes: ["A) Marrocos", "B) Filipinas", "C) Groenlândia", "D) Rússia"],
    resposta: "D",
    explicacao: "A Rússia é transcontinental, pertencendo tanto à Europa quanto à Ásia, sendo também o maior país do mundo.",
  },
  {
    pergunta: "Em que período da pré-história o fogo foi descoberto?",
    opcoes: ["A) Neolítico", "B) Paleolítico", "C) Idade dos Metais", "D) Pedra Polida"],
    resposta: "B",
    explicacao: "Foi no Paleolítico que os homens aprenderam a obter fogo pelo atrito de madeira e pedra.",
  },
  {
    pergunta: "Em que ordem surgiram os modelos atômicos?",
    opcoes: [
      "A) Thomson, Dalton, Rutherford, Bohr",
      "B) Dalton, Thomson, Rutherford-Bohr, Rutherford",
      "C) Dalton, Thomson, Rutherford, Rutherford-Bohr",
      "D) Rutherford, Bohr, Thomson, Dalton",
    ],
    resposta: "C",
    explicacao: "Dalton (1803), Thomson (1898), Rutherford (1911) e Rutherford-Bohr (1913) foram as evoluções do modelo atômico.",
  },
  {
    pergunta: "Qual personagem folclórico costuma ser agradado pelos caçadores com fumo?",
    opcoes: ["A) Saci", "B) Boitatá", "C) Lobisomem", "D) Caipora"],
    resposta: "D",
    explicacao: "A Caipora é considerada a protetora da floresta. Os caçadores deixam fumo de corda perto de árvores para agradá-la.",
  },
  {
    pergunta: "Qual a altura da rede de vôlei no jogo masculino e feminino adulto?",
    opcoes: ["A) 2,5 m e 2,0 m", "B) 2,43 m e 2,24 m", "C) 2,45 m e 2,15 m", "D) 2,4 m para ambos"],
    resposta: "B",
    explicacao: "A rede tem 2,43 m para o masculino e 2,24 m para o feminino nos jogos adultos.",
  },
  {
    pergunta: "Quais destas doenças são sexualmente transmissíveis?",
    opcoes: [
      "A) Aids, tricomoníase e ebola",
      "B) Chikungunya, aids e herpes",
      "C) Gonorreia, clamídia e sífilis",
      "D) Botulismo, cistite e gonorreia",
    ],
    resposta: "C",
    explicacao: "Gonorreia, clamídia e sífilis são infecções sexualmente transmissíveis (ISTs) causadas por bactérias.",
  },
];

// Embaralha as perguntas e retorna N delas
function getRandomQuestions(total = 5) {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, total);
}

module.exports = {
  name: "quiz",
  description: "Quiz de conhecimentos gerais!",
  commands: ["quiz"],
  usage: `${PREFIX}quiz iniciar | ${PREFIX}quiz <A, B, C ou D>`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    args,
    fullArgs,
    sendErrorReply,
    sendText,
    sendReply,
    sendWaitReact,
    sendSuccessReact,
    remoteJid,
    userJid,
  }) => {
    const subCommand = args[0]?.toLowerCase();

    // ───────────── INICIAR ─────────────
    if (subCommand === "iniciar") {
      const currentQuiz = activeQuizzes.get(remoteJid);

      if (currentQuiz) {
        return await sendErrorReply(
          `Já existe um quiz ativo neste chat!\n\n` +
            `Responda com ${PREFIX}quiz <A, B, C ou D>\n` +
            `Para cancelar: ${PREFIX}quiz cancelar`
        );
      }

      await sendWaitReact();

      const quizQuestions = getRandomQuestions(5);

      const quiz = {
        chatId: remoteJid,
        questions: quizQuestions,
        currentIndex: 0,
        score: 0,
        startedBy: userJid,
        startTime: Date.now(),
        timer: null,
      };

      // Função para enviar a próxima pergunta
      const sendNextQuestion = async () => {
        const q = quiz.questions[quiz.currentIndex];
        const num = quiz.currentIndex + 1;
        const total = quiz.questions.length;

        // Limpa timer anterior
        if (quiz.timer) clearTimeout(quiz.timer);

        // Timer de 30s por pergunta
        quiz.timer = setTimeout(async () => {
          const active = activeQuizzes.get(remoteJid);
          if (active && active.startTime === quiz.startTime) {
            await sendText(
              `⏰ *TEMPO ESGOTADO!*\n\n` +
                `A resposta correta era: *${q.resposta}) ${q.opcoes.find((o) => o.startsWith(q.resposta))}*\n\n` +
                `⏭️ Próxima pergunta em 3 segundos...`
            );

            quiz.currentIndex++;

            if (quiz.currentIndex >= quiz.questions.length) {
              await finishQuiz();
            } else {
              setTimeout(sendNextQuestion, 3000);
            }
          }
        }, 30000);

        await sendText(
          `🧠 *QUIZ - CONHECIMENTOS GERAIS*\n` +
            `📊 Pergunta ${num}/${total}\n` +
            `${"▓".repeat(num)}${"░".repeat(total - num)}\n\n` +
            `❓ *${q.pergunta}*\n\n` +
            `${q.opcoes.join("\n")}\n\n` +
            `⏱️ *30 segundos para responder!*\n` +
            `📝 Use: ${PREFIX}quiz <A, B, C ou D>`
        );
      };

      // Função para finalizar o quiz
      const finishQuiz = async () => {
        if (quiz.timer) clearTimeout(quiz.timer);
        activeQuizzes.delete(remoteJid);

        const total = quiz.questions.length;
        const score = quiz.score;
        const timeElapsed = Math.round((Date.now() - quiz.startTime) / 1000);
        const minutes = Math.floor(timeElapsed / 60);
        const seconds = timeElapsed % 60;
        const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        let medal = "🥉";
        if (score === total) medal = "🏆";
        else if (score >= total * 0.7) medal = "🥇";
        else if (score >= total * 0.4) medal = "🥈";

        await sendReply(
          `${medal} *FIM DO QUIZ!*\n\n` +
            `👤 *Jogador:* @${userJid.split("@")[0]}\n` +
            `✅ *Acertos:* ${score}/${total}\n` +
            `⏱️ *Tempo total:* ${timeDisplay}\n\n` +
            `🎮 Use ${PREFIX}quiz iniciar para jogar novamente!`,
          [userJid]
        );
      };

      // Armazena funções no quiz para uso ao responder
      quiz.sendNextQuestion = sendNextQuestion;
      quiz.finishQuiz = finishQuiz;

      activeQuizzes.set(remoteJid, quiz);

      await sendSuccessReact();
      await sendNextQuestion();

    // ───────────── CANCELAR ─────────────
    } else if (subCommand === "cancelar") {
      const currentQuiz = activeQuizzes.get(remoteJid);

      if (!currentQuiz) {
        return await sendErrorReply(
          `Nenhum quiz ativo!\n\nUse ${PREFIX}quiz iniciar para começar.`
        );
      }

      if (currentQuiz.timer) clearTimeout(currentQuiz.timer);
      activeQuizzes.delete(remoteJid);

      await sendText(`❌ *Quiz cancelado!*\n\nUse ${PREFIX}quiz iniciar para começar um novo.`);

    // ───────────── RESPONDER ─────────────
    } else if (fullArgs && fullArgs.trim()) {
      const currentQuiz = activeQuizzes.get(remoteJid);

      if (!currentQuiz) {
        return await sendErrorReply(
          `Nenhum quiz ativo!\n\nUse ${PREFIX}quiz iniciar para começar.`
        );
      }

      const userAnswer = fullArgs.trim().toUpperCase().replace(/[^A-D]/g, "");

      if (!["A", "B", "C", "D"].includes(userAnswer)) {
        return await sendErrorReply(
          `Resposta inválida! Use apenas *A*, *B*, *C* ou *D*.\n` +
            `Exemplo: ${PREFIX}quiz B`
        );
      }

      const q = currentQuiz.questions[currentQuiz.currentIndex];
      const isCorrect = userAnswer === q.resposta;

      if (isCorrect) {
        currentQuiz.score++;
        await sendText(
          `✅ *CORRETO!* Muito bem!\n\n` +
            `💡 ${q.explicacao}\n\n` +
            `⭐ Pontuação: *${currentQuiz.score}/${currentQuiz.questions.length}*`
        );
      } else {
        const respostaCorreta = q.opcoes.find((o) => o.startsWith(q.resposta));
        await sendText(
          `❌ *ERRADO!*\n\n` +
            `A resposta correta era: *${respostaCorreta}*\n\n` +
            `💡 ${q.explicacao}`
        );
      }

      currentQuiz.currentIndex++;

      if (currentQuiz.currentIndex >= currentQuiz.questions.length) {
        await currentQuiz.finishQuiz();
      } else {
        setTimeout(currentQuiz.sendNextQuestion, 2000);
      }

    // ───────────── INVÁLIDO ─────────────
    } else {
      throw new InvalidParameterError(
        `*Como jogar Quiz:*\n\n` +
          `• ${PREFIX}quiz iniciar - Inicia um novo quiz\n` +
          `• ${PREFIX}quiz <A/B/C/D> - Responde a pergunta atual\n` +
          `• ${PREFIX}quiz cancelar - Cancela o quiz em andamento\n\n` +
          `Exemplo: ${PREFIX}quiz A`
      );
    }
  },
};
