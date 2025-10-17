const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

// Armazena jogos ativos por chat
const activeGames = new Map();

module.exports = {
  name: "gartic",
  description: "Jogo de adivinhação com imagens do Gartic!",
  commands: ["gartic"],
  usage: `${PREFIX}gartic iniciar | ${PREFIX}gartic <resposta>`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    args,
    fullArgs,
    sendErrorReply,
    sendImageFromBuffer,
    sendText,
    sendReply,
    sendWaitReact,
    sendSuccessReact,
    remoteJid,
    userJid,
  }) => {
    const subCommand = args[0]?.toLowerCase();

    // Comando: iniciar jogo
    if (subCommand === "iniciar") {
      const currentGame = activeGames.get(remoteJid);
      
      if (currentGame) {
        return await sendErrorReply(
          `Já existe um jogo ativo neste chat!\n\n` +
          `Use ${PREFIX}gartic <resposta> para responder.`
        );
      }

      await sendWaitReact();

      try {
        const apiUrl = "https://gartic-api-1.onrender.com/api/gartic";
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();

        if (!responseText.trim()) {
          throw new Error("Servidor retornou resposta vazia");
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Resposta inválida do servidor: ${parseError.message}`);
        }

        if (!data.success || !data.data || !data.data.url) {
          throw new Error("Nenhuma imagem encontrada");
        }

        const gameData = data.data;

        // Baixa a imagem
        const imageResponse = await fetch(gameData.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://gartic.com.br/',
          }
        });
        
        if (!imageResponse.ok) {
          throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();

        // Cria o jogo
        const game = {
          chatId: remoteJid,
          data: gameData,
          startTime: Date.now(),
          answers: gameData.respostas_corretas.map(answer => answer.toLowerCase()),
          timer: null,
        };

        // Timer de 60 segundos
        game.timer = setTimeout(async () => {
          const currentGame = activeGames.get(remoteJid);
          if (currentGame && currentGame.startTime === game.startTime) {
            const respostasCorretas = gameData.respostas_corretas.join(", ");
            await sendText(
              `⏰ *TEMPO ESGOTADO!*\n\n` +
              `A resposta correta era: *${respostasCorretas}*\n\n` +
              `Use ${PREFIX}gartic iniciar para jogar novamente!`
            );
            
            activeGames.delete(remoteJid);
          }
        }, 60000);

        activeGames.set(remoteJid, game);

        await sendSuccessReact();

        // Envia a imagem do desafio
        await sendImageFromBuffer(
          Buffer.from(imageBuffer),
          `🎨 *GARTIC - ADIVINHE O DESENHO!*\n\n` +
          `💡 *Dica:* ${gameData.hint}\n` +
          `🆔 *ID:* #${gameData.id}\n` +
          `📊 *Progresso:* ${gameData.images_used}/${gameData.total_images}\n` +
          `⏱️ *Tempo:* 60 segundos\n\n` +
          `❓ O que é este desenho?\n` +
          `📝 Use: ${PREFIX}gartic <sua_resposta>`
        );

      } catch (error) {
        console.error("Erro no Gartic:", error);

        let errorMessage = "Falha ao carregar o jogo do Gartic.";
        
        if (error.message.includes("fetch") || error.message.includes("HTTP")) {
          errorMessage += "\n\n🌐 Problema de conexão. Tente novamente.";
        } else if (error.message.includes("servidor")) {
          errorMessage += "\n\n⚠️ Problema no servidor da API.";
        } else {
          errorMessage += `\n\n❌ ${error.message}`;
        }

        await sendErrorReply(errorMessage);
      }

    } 
    // Comando: responder
    else if (fullArgs && fullArgs.trim()) {
      const currentGame = activeGames.get(remoteJid);
      
      if (!currentGame) {
        return await sendErrorReply(
          `Nenhum jogo ativo!\n\n` +
          `Use ${PREFIX}gartic iniciar para começar.`
        );
      }

      const userAnswer = fullArgs.toLowerCase().trim();
      
      // Verifica se a resposta está correta
      const isCorrect = currentGame.answers.some(answer => 
        answer === userAnswer || 
        userAnswer.includes(answer) || 
        answer.includes(userAnswer)
      );

      if (isCorrect) {
        // Calcula tempo decorrido
        const timeElapsed = Math.round((Date.now() - currentGame.startTime) / 1000);
        const minutes = Math.floor(timeElapsed / 60);
        const seconds = timeElapsed % 60;
        const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        await sendReply(
          `🎉 *CORRETO! PARABÉNS!*\n\n` +
          `✅ *Resposta:* ${currentGame.data.respostas_corretas[0]}\n` +
          `⏱️ *Tempo:* ${timeDisplay}\n` +
          `👤 *Jogador:* @${userJid.split('@')[0]}\n\n` +
          `🎮 Use ${PREFIX}gartic iniciar para uma nova rodada!`,
          [userJid]
        );

        // Limpa o timer
        if (currentGame.timer) {
          clearTimeout(currentGame.timer);
        }
        
        activeGames.delete(remoteJid);
      } else {
        await sendText(`❌ Resposta incorreta! Tente novamente.`);
      }

    } 
    // Comando inválido
    else {
      throw new InvalidParameterError(
        `*Como jogar Gartic:*\n\n` +
        `• ${PREFIX}gartic iniciar - Inicia um novo jogo\n` +
        `• ${PREFIX}gartic <resposta> - Responde ao desafio\n\n` +
        `Exemplo: ${PREFIX}gartic cachorro`
      );
    }
  },
};