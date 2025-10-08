const { PREFIX } = require(`${BASE_DIR}/config`);
const fs = require("fs");
const path = require("path");
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const { deactivateGroup, activateGroup } = require(`${BASE_DIR}/utils/database`);

const ALUGUEL_FILE = path.resolve(__dirname, "../../../aluguel.json");

// Função para carregar dados do arquivo
function loadAlugueis() {
  if (!fs.existsSync(ALUGUEL_FILE)) {
    fs.writeFileSync(ALUGUEL_FILE, JSON.stringify([], null, 2));
    return [];
  }
  const data = fs.readFileSync(ALUGUEL_FILE, "utf-8");
  return JSON.parse(data);
}

// Função para salvar dados no arquivo
function saveAlugueis(data) {
  fs.writeFileSync(ALUGUEL_FILE, JSON.stringify(data, null, 2));
}

// Função para converter DD/MM/AAAA para AAAA-MM-DD
function convertToISODate(dateStr) {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  
  const day = parts[0].padStart(2, "0");
  const month = parts[1].padStart(2, "0");
  const year = parts[2];
  
  return `${year}-${month}-${day}`;
}

// Função para formatar data de AAAA-MM-DD para DD/MM/AAAA
function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

// Função para calcular dias restantes
function getDaysRemaining(dateString) {
  const [year, month, day] = dateString.split("-");
  const targetDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Função para validar data DD/MM/AAAA
function validateDate(dateStr) {
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateRegex.test(dateStr)) return false;
  
  const [day, month, year] = dateStr.split("/").map(Number);
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 2000 || year > 2100) return false;
  
  // Verifica se a data é válida
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

// Função para verificar aluguéis vencidos e desativar bot
function checkAndDeactivateExpired() {
  const alugueis = loadAlugueis();
  let updated = false;
  
  alugueis.forEach(aluguel => {
    const diasRestantes = getDaysRemaining(aluguel.dataRenovacao);
    
    // Se vencido e bot ainda está ativo
    if (diasRestantes < 0 && aluguel.botAtivo !== false) {
      deactivateGroup(aluguel.grupoJid);
      aluguel.botAtivo = false;
      updated = true;
    }
  });
  
  if (updated) {
    saveAlugueis(alugueis);
  }
}

module.exports = {
  name: "aluguel",
  description: "Gerencia informações de aluguel do grupo",
  commands: ["aluguel", "rent"],
  usage: `${PREFIX}aluguel [adicionar|consultar|renovar|remover|listar]\n\n` +
         `Exemplos:\n` +
         `${PREFIX}aluguel adicionar 5511999999999 31/12/2025\n` +
         `${PREFIX}aluguel consultar\n` +
         `${PREFIX}aluguel renovar 31/01/2026\n` +
         `${PREFIX}aluguel remover\n` +
         `${PREFIX}aluguel listar`,
  
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    args, 
    sendSuccessReply, 
    sendWaitReact,
    sendErrorReply,
    groupName,
    remoteJid,
    mentionedJidList,
    userJid
  }) => {
    await sendWaitReact();

    // Verifica aluguéis vencidos toda vez que o comando é usado
    checkAndDeactivateExpired();

    // Filtra os args removendo menções (@) e strings vazias
    const filteredArgs = args.filter(arg => arg && !arg.startsWith('@'));
    
    const action = filteredArgs[0]?.toLowerCase();

    if (!action) {
      throw new InvalidParameterError(
        "Você precisa especificar uma ação: adicionar, consultar, renovar, remover ou listar"
      );
    }

    const alugueis = loadAlugueis();

    switch (action) {
      case "adicionar":
      case "add": {
        // Verifica se passou o número do usuário
        const usuarioNumero = args[1];
        if (!usuarioNumero) {
          throw new InvalidParameterError(
            "Você precisa informar o número do usuário!\n" +
            `Exemplo: ${PREFIX}aluguel adicionar 5511999999999 31/12/2025`
          );
        }

        // Remove caracteres não numéricos do número
        const numeroLimpo = usuarioNumero.replace(/\D/g, "");
        
        if (numeroLimpo.length < 10) {
          throw new InvalidParameterError(
            "Número inválido! Informe o número completo com DDD.\n" +
            `Exemplo: ${PREFIX}aluguel adicionar 5511999999999 31/12/2025`
          );
        }

        // Verifica se passou a data
        const dataRenovacao = args[2];
        if (!dataRenovacao) {
          throw new InvalidParameterError(
            "Você precisa informar a data de renovação!\n" +
            `Formato: DD/MM/AAAA\n` +
            `Exemplo: ${PREFIX}aluguel adicionar 5511999999999 31/12/2025`
          );
        }

        // Valida formato da data
        if (!validateDate(dataRenovacao)) {
          throw new InvalidParameterError(
            "Formato de data inválido!\n" +
            "Use o formato: DD/MM/AAAA\n" +
            "Exemplo: 31/12/2025"
          );
        }

        const dataISO = convertToISODate(dataRenovacao);
        
        // Cria o JID no formato padrão do WhatsApp
        const usuarioJid = `${numeroLimpo}@s.whatsapp.net`;

        // Verifica se já existe aluguel para este grupo
        const index = alugueis.findIndex(a => a.grupoJid === remoteJid);
        
        const novoAluguel = {
          grupoNome: groupName || "Grupo Desconhecido",
          grupoJid: remoteJid,
          usuarioJid: usuarioJid,
          usuarioNumero: numeroLimpo,
          dataRenovacao: dataISO,
          dataCadastro: new Date().toISOString().split('T')[0],
          botAtivo: true
        };

        if (index !== -1) {
          // Atualiza aluguel existente
          alugueis[index] = novoAluguel;
        } else {
          // Adiciona novo aluguel
          alugueis.push(novoAluguel);
        }

        // Ativa o bot no grupo
        activateGroup(remoteJid);
        saveAlugueis(alugueis);

        const diasRestantes = getDaysRemaining(dataISO);
        let statusMsg = "";
        
        if (diasRestantes < 0) {
          statusMsg = `⚠️ *VENCIDO há ${Math.abs(diasRestantes)} dias!*`;
        } else if (diasRestantes === 0) {
          statusMsg = `⚠️ *VENCE HOJE!*`;
        } else if (diasRestantes <= 7) {
          statusMsg = `⚠️ *Vence em ${diasRestantes} dias!*`;
        } else {
          statusMsg = `✅ *${diasRestantes} dias restantes*`;
        }

        await sendSuccessReply(
          `✅ *Aluguel Cadastrado!*\n\n` +
          `📱 *Grupo:* ${groupName || "Desconhecido"}\n` +
          `👤 *Usuário:* ${numeroLimpo}\n` +
          `📅 *Renovação:* ${dataRenovacao}\n` +
          `⏰ *Status:* ${statusMsg}\n` +
          `🤖 *Bot:* Ativado no grupo`
        );
        break;
      }

      case "consultar":
      case "ver":
      case "info": {
        const aluguel = alugueis.find(a => a.grupoJid === remoteJid);

        if (!aluguel) {
          throw new WarningError(
            "Não há aluguel cadastrado para este grupo!\n" +
            `Use: ${PREFIX}aluguel adicionar 5511999999999 31/12/2025`
          );
        }

        const diasRestantes = getDaysRemaining(aluguel.dataRenovacao);
        let statusEmoji = "";
        let statusMsg = "";
        let botStatus = aluguel.botAtivo !== false ? "🟢 Ativo" : "🔴 Desativado";
        
        if (diasRestantes < 0) {
          statusEmoji = "🔴";
          statusMsg = `VENCIDO há ${Math.abs(diasRestantes)} dias`;
          if (aluguel.botAtivo !== false) {
            deactivateGroup(remoteJid);
            aluguel.botAtivo = false;
            saveAlugueis(alugueis);
            botStatus = "🔴 Desativado (vencido)";
          }
        } else if (diasRestantes === 0) {
          statusEmoji = "🟡";
          statusMsg = "VENCE HOJE";
        } else if (diasRestantes <= 7) {
          statusEmoji = "🟡";
          statusMsg = `Vence em ${diasRestantes} dias`;
        } else if (diasRestantes <= 15) {
          statusEmoji = "🟢";
          statusMsg = `${diasRestantes} dias restantes`;
        } else {
          statusEmoji = "🟢";
          statusMsg = `${diasRestantes} dias restantes`;
        }

        await sendSuccessReply(
          `${statusEmoji} *Informações do Aluguel*\n\n` +
          `📱 *Grupo:* ${aluguel.grupoNome}\n` +
          `👤 *Responsável:* ${aluguel.usuarioNumero}\n` +
          `📅 *Data de Renovação:* ${formatDate(aluguel.dataRenovacao)}\n` +
          `⏰ *Status:* ${statusMsg}\n` +
          `🤖 *Bot:* ${botStatus}\n` +
          `📝 *Cadastrado em:* ${formatDate(aluguel.dataCadastro)}`
        );
        break;
      }

      case "renovar":
      case "renew": {
        const aluguel = alugueis.find(a => a.grupoJid === remoteJid);

        if (!aluguel) {
          throw new WarningError(
            "Não há aluguel cadastrado para este grupo!\n" +
            `Use: ${PREFIX}aluguel adicionar 5511999999999 31/12/2025`
          );
        }

        const novaData = args[1];
        if (!novaData) {
          throw new InvalidParameterError(
            "Você precisa informar a nova data de renovação!\n" +
            `Formato: DD/MM/AAAA\n` +
            `Exemplo: ${PREFIX}aluguel renovar 31/01/2026`
          );
        }

        if (!validateDate(novaData)) {
          throw new InvalidParameterError(
            "Formato de data inválido!\n" +
            "Use o formato: DD/MM/AAAA\n" +
            "Exemplo: 31/01/2026"
          );
        }

        const dataISO = convertToISODate(novaData);
        aluguel.dataRenovacao = dataISO;
        aluguel.botAtivo = true;
        
        // Reativa o bot no grupo
        activateGroup(remoteJid);
        saveAlugueis(alugueis);

        const diasRestantes = getDaysRemaining(dataISO);

        await sendSuccessReply(
          `✅ *Aluguel Renovado!*\n\n` +
          `📱 *Grupo:* ${aluguel.grupoNome}\n` +
          `👤 *Responsável:* ${aluguel.usuarioNumero}\n` +
          `📅 *Nova Data:* ${novaData}\n` +
          `⏰ *Dias restantes:* ${diasRestantes} dias\n` +
          `🤖 *Bot:* Reativado no grupo`
        );
        break;
      }

      case "remover":
      case "deletar":
      case "del": {
        const index = alugueis.findIndex(a => a.grupoJid === remoteJid);

        if (index === -1) {
          throw new WarningError("Não há aluguel cadastrado para este grupo!");
        }

        const aluguelRemovido = alugueis[index];
        alugueis.splice(index, 1);
        saveAlugueis(alugueis);

        await sendSuccessReply(
          `✅ *Aluguel Removido!*\n\n` +
          `📱 *Grupo:* ${aluguelRemovido.grupoNome}\n` +
          `👤 *Responsável:* ${aluguelRemovido.usuarioNumero}\n\n` +
          `⚠️ O bot continuará ativo. Use ${PREFIX}off para desativar.`
        );
        break;
      }

      case "listar":
      case "list":
      case "todos": {
        if (alugueis.length === 0) {
          throw new WarningError(
            "Nenhum aluguel cadastrado ainda!\n" +
            `Use: ${PREFIX}aluguel adicionar 5511999999999 31/12/2025`
          );
        }

        // Ordena por data de renovação
        const alugueisOrdenados = alugueis.sort((a, b) => {
          return new Date(a.dataRenovacao) - new Date(b.dataRenovacao);
        });

        let mensagem = `📋 *Lista de Aluguéis* (${alugueis.length})\n\n`;

        alugueisOrdenados.forEach((aluguel, i) => {
          const diasRestantes = getDaysRemaining(aluguel.dataRenovacao);
          let statusEmoji = "";
          let botEmoji = aluguel.botAtivo !== false ? "🟢" : "🔴";
          
          if (diasRestantes < 0) {
            statusEmoji = "🔴";
          } else if (diasRestantes <= 7) {
            statusEmoji = "🟡";
          } else {
            statusEmoji = "🟢";
          }

          mensagem += `${statusEmoji} *${i + 1}. ${aluguel.grupoNome}*\n`;
          mensagem += `   👤 ${aluguel.usuarioNumero}\n`;
          mensagem += `   📅 ${formatDate(aluguel.dataRenovacao)}`;
          
          if (diasRestantes < 0) {
            mensagem += ` (Vencido há ${Math.abs(diasRestantes)}d) ${botEmoji}\n\n`;
          } else if (diasRestantes === 0) {
            mensagem += ` (Vence hoje!) ${botEmoji}\n\n`;
          } else {
            mensagem += ` (${diasRestantes}d) ${botEmoji}\n\n`;
          }
        });

        mensagem += `\n🟢 = OK | 🟡 = Próximo | 🔴 = Vencido\n`;
        mensagem += `Bot: 🟢 Ativo | 🔴 Desativado`;

        await sendSuccessReply(mensagem);
        break;
      }

      default: {
        throw new InvalidParameterError(
          `Ação inválida: *${action}*\n\n` +
          `Ações disponíveis:\n` +
          `• adicionar - Cadastra/atualiza aluguel\n` +
          `• consultar - Consulta aluguel do grupo\n` +
          `• renovar - Renova aluguel e reativa bot\n` +
          `• remover - Remove aluguel do grupo\n` +
          `• listar - Lista todos os aluguéis\n\n` +
          `Exemplo: ${PREFIX}aluguel adicionar 5511999999999 31/12/2025`
        );
      }
    }
  },
};