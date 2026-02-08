/**
 * Comando para registrar aluguel de grupo
 * Registra o tempo de aluguel do grupo atual (dias ou horas)
 * 
 * @author Adaptado para DeadBoT
 */
const path = require("node:path");
const { PREFIX } = require(path.join(__dirname, "..", "..", "..", "config"));
const { registrarAluguel, listarAlugueis } = require(path.join(__dirname, "..", "..", "..", "utils", "aluguel"));
const { activateGroup } = require(path.join(__dirname, "..", "..", "..", "utils", "database"));
const { isDono } = require(path.join(__dirname, "..", "..", "..", "utils", "ownerCheck"));

module.exports = {
  name: "registrar-aluguel",
  description: "Registra o aluguel do grupo atual",
  commands: ["rg_aluguel", "reg_aluguel", "registraraluguel", "regaluguel"],
  usage: `${PREFIX}rg_aluguel <tempo> <dias|horas|minutos>`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    args, 
    sendErrorReply, 
    sendSuccessReply,
    sendWarningReply,
    isGroup,
    remoteJid,
    prefix,
    fullArgs,
    userJid,
    socket
  }) => {
    // Verifica se é o dono do bot
    if (!isDono(userJid)) {
      await sendErrorReply("❌ Apenas o dono do bot pode usar este comando!");
      return;
    }

    // Verifica se está em grupo
    if (!isGroup) {
      await sendErrorReply("❌ Este comando só pode ser usado em grupos!");
      return;
    }

    // Se não há args, tenta pegar do fullArgs separando por espaço
    let tempo;
    let tipo;
    
    if (!args[0] || !args[1]) {
      // Tenta separar por espaço
      const partes = fullArgs.trim().split(/\s+/);
      
      if (partes.length < 2) {
        await sendWarningReply(
          `⚠️ *Uso correto:*\n${prefix}rg_aluguel <tempo> <dias|horas|minutos>\n\n` +
          `*Exemplos:*\n` +
          `${prefix}rg_aluguel 30 dias\n` +
          `${prefix}rg_aluguel 24 horas\n` +
          `${prefix}rg_aluguel 00:02 horas (2 minutos)\n` +
          `${prefix}rg_aluguel 2 minutos`
        );
        return;
      }
      
      tempo = partes[0];
      tipo = partes[1]?.toLowerCase().trim();
    } else {
      tempo = args[0];
      tipo = args[1]?.toLowerCase().trim();
    }

    // Verifica se é formato HH:MM
    if (tempo.includes(":")) {
      const partes = tempo.split(":");
      const horas = parseInt(partes[0]) || 0;
      const minutos = parseInt(partes[1]) || 0;
      
      // Converte tudo para minutos
      tempo = (horas * 60) + minutos;
      tipo = "minutos";
      
      if (tempo <= 0) {
        await sendErrorReply(
          `❌ *Tempo inválido!*\n\n` +
          `Use o formato HH:MM válido.\n\n` +
          `*Exemplo:* ${prefix}rg_aluguel 00:02 horas`
        );
        return;
      }
    } else {
      tempo = parseInt(tempo);
      
      // Valida se o tempo é um número válido
      if (isNaN(tempo) || tempo <= 0) {
        await sendErrorReply(
          `❌ *Tempo inválido!*\n\n` +
          `O tempo deve ser um número maior que zero.\n\n` +
          `*Exemplo:* ${prefix}rg_aluguel 30 dias`
        );
        return;
      }
    }

    // Valida se o tipo é dias, horas ou minutos
    if (!["dias", "horas", "minutos"].includes(tipo)) {
      await sendErrorReply(
        `❌ *Tipo inválido!*\n\n` +
        `Use apenas "dias", "horas" ou "minutos".\n\n` +
        `*Exemplos:*\n` +
        `${prefix}rg_aluguel 30 dias\n` +
        `${prefix}rg_aluguel 24 horas\n` +
        `${prefix}rg_aluguel 2 minutos\n` +
        `${prefix}rg_aluguel 00:02 horas`
      );
      return;
    }

    try {
      // Verifica se já existe aluguel ativo
      const alugueis = listarAlugueis();
      if (alugueis[remoteJid]) {
        await sendErrorReply(
          `❌ *Este grupo já possui um aluguel ativo!*\n\n` +
          `🔑 *ID:* ${alugueis[remoteJid].id}\n` +
          `📅 *Expira em:* ${alugueis[remoteJid].expira}\n\n` +
          `💡 *Dica:* Se quiser modificar os dias/horas restantes, apague o aluguel com:\n` +
          `${prefix}apagar_aluguel ${alugueis[remoteJid].id}\n` +
          `e depois registre novamente.`
        );
        return;
      }

      // Busca o nome do grupo
      let nomeGrupo = "Grupo sem nome";
      try {
        const metadata = await socket.groupMetadata(remoteJid);
        nomeGrupo = metadata?.subject || metadata?.name || "Grupo sem nome";
      } catch (err) {
        console.log("⚠️ Não foi possível obter o nome do grupo, usando nome padrão");
      }

      // Registra o aluguel com o nome do grupo
      const aluguel = registrarAluguel(remoteJid, tempo, tipo, nomeGrupo);

      // Ativa o bot no grupo automaticamente
      activateGroup(remoteJid);

      await sendSuccessReply(
        `✅ *Grupo alugado com sucesso!*\n\n` +
        `🏷️ *Grupo:* ${nomeGrupo}\n` +
        `🔑 *ID:* ${aluguel.id}\n` +
        `⏳ *Duração:* ${aluguel.duracao}\n` +
        `📅 *Expira em:* ${aluguel.expira}\n\n` +
        `🤖 *Bot ativado automaticamente neste grupo!*\n\n` +
        `💡 O bot será desativado automaticamente quando o aluguel expirar.`
      );
    } catch (error) {
      console.error("Erro ao registrar aluguel:", error);
      await sendErrorReply(
        `❌ *Erro ao registrar aluguel!*\n\n` +
        `Ocorreu um erro ao processar o comando. Tente novamente.\n\n` +
        `Erro: ${error.message}`
      );
    }
  },
};