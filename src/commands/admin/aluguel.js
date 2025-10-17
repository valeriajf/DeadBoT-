// Sistema de lembrete de aluguel 
//para o DeadBoT 
//
//@uthor Dev VaL 
//
const calculateValidity = (dateString) => {
  const [day, month, year] = dateString.split("/").map(Number);
  const dueDate = new Date(year, month - 1, day);
  const today = new Date();
  
  const diffYears = dueDate.getFullYear() - today.getFullYear();
  const diffMonths = dueDate.getMonth() - today.getMonth();
  const diffDays = dueDate.getDate() - today.getDate();
  
  let totalMonths = diffYears * 12 + diffMonths;
  
  // Ajusta se os dias forem negativos
  if (diffDays < 0) {
    totalMonths--;
  }
  
  if (totalMonths < 0) totalMonths = 0;
  
  if (totalMonths === 0) {
    const days = calculateDaysUntil(dateString);
    return days > 0 ? `${days} dia(s)` : "vencido";
  } else if (totalMonths === 1) {
    return "1 mês";
  } else {
    return `${totalMonths} meses`;
  }
};/**
 * Comando para gerenciar vencimentos de aluguel dos membros do grupo.
 * Permite adicionar, remover e listar datas de vencimento.
 * O bot enviará lembretes automáticos próximo ao vencimento.
 *
 * @author Dev VaL 
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const fs = require("node:fs");
const path = require("node:path");

const DATABASE_PATH = path.join(BASE_DIR, "database", "aluguel.json");

// Garante que o arquivo existe
const ensureDatabaseExists = () => {
  const dir = path.dirname(DATABASE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATABASE_PATH)) {
    fs.writeFileSync(DATABASE_PATH, JSON.stringify({}, null, 2), "utf8");
  }
};

// Carrega os dados do banco
const loadDatabase = () => {
  try {
    ensureDatabaseExists();
    const data = fs.readFileSync(DATABASE_PATH, "utf8");
    
    // Verifica se o arquivo está vazio ou corrompido
    if (!data || data.trim() === "") {
      return {};
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error("[ALUGUEL] Erro ao carregar banco de dados:", error);
    // Se houver erro, cria um backup e retorna objeto vazio
    if (fs.existsSync(DATABASE_PATH)) {
      const backupPath = DATABASE_PATH + ".backup";
      fs.copyFileSync(DATABASE_PATH, backupPath);
      console.log(`[ALUGUEL] Backup criado em: ${backupPath}`);
    }
    // Recria o arquivo
    fs.writeFileSync(DATABASE_PATH, JSON.stringify({}, null, 2), "utf8");
    return {};
  }
};

// Salva os dados no banco
const saveDatabase = (data) => {
  try {
    ensureDatabaseExists();
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("[ALUGUEL] Erro ao salvar banco de dados:", error);
    throw error;
  }
};

// Valida formato de data DD/MM/AAAA
const isValidDate = (dateString) => {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(regex);
  
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2150) return false;
  
  // Valida dias por mês
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Verifica ano bissexto
  if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
    daysInMonth[1] = 29;
  }
  
  if (day > daysInMonth[month - 1]) return false;
  
  // Valida se a data existe (verifica se é uma data válida)
  const testDate = new Date(year, month - 1, day);
  if (testDate.getFullYear() !== year || 
      testDate.getMonth() !== month - 1 || 
      testDate.getDate() !== day) {
    return false;
  }
  
  return true;
};

// Valor fixo do aluguel
const FIXED_VALUE = "R$ 20,00";

// Validade fixa
const FIXED_VALIDITY = "1 mês";

// Formata a data para exibição
const formatDate = (dateString) => {
  const [day, month, year] = dateString.split("/");
  return `${day}/${month}/${year}`;
};

// Calcula dias até o vencimento
const calculateDaysUntil = (dateString) => {
  const [day, month, year] = dateString.split("/").map(Number);
  const dueDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Verifica se a data já passou
const isOverdue = (dateString) => {
  return calculateDaysUntil(dateString) < 0;
};

module.exports = {
  name: "aluguel",
  description: "Gerencia vencimentos de aluguel dos membros do grupo",
  commands: ["aluguel", "alugueis", "rent"],
  usage: `${PREFIX}aluguel add @usuario DD/MM/AAAA
${PREFIX}aluguel delete @usuario
${PREFIX}aluguel list
${PREFIX}aluguel hoje
${PREFIX}aluguel vencendo`,
  
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    args,
    fullArgs,
    isGroup,
    remoteJid,
    webMessage,
    sendReply,
    sendSuccessReply,
    sendErrorReply,
    sendWarningReply,
  }) => {
    try {
      if (!isGroup) {
        return await sendErrorReply("❌ Este comando só pode ser usado em grupos!");
      }

      // Pega o subcomando (primeiro argumento antes de qualquer espaço ou menção)
      const subCommand = args[0]?.split(" ")[0]?.toLowerCase();

      // Mostra ajuda se não houver subcomando
      if (!subCommand) {
        return await sendReply(
          `🤖 *SISTEMA DE GESTÃO DE ALUGUÉIS*\n\n` +
          `*Comandos disponíveis:*\n\n` +
          `▸ ${PREFIX}aluguel add @usuario DD/MM/AAAA\n` +
          `   Adiciona um vencimento de aluguel\n\n` +
          `▸ ${PREFIX}aluguel delete @usuario\n` +
          `   Remove um vencimento de aluguel\n\n` +
          `▸ ${PREFIX}aluguel list\n` +
          `   Lista todos os vencimentos\n\n` +
          `▸ ${PREFIX}aluguel hoje\n` +
          `   Mostra vencimentos de hoje\n\n` +
          `▸ ${PREFIX}aluguel vencendo\n` +
          `   Mostra vencimentos próximos (7 dias)\n\n` +
          `*Exemplo:*\n` +
          `${PREFIX}aluguel add @João 15/11/2025`
        );
      }

      const db = loadDatabase();
      if (!db[remoteJid]) {
        db[remoteJid] = {};
      }

      // Comando: ADICIONAR
      if (subCommand === "add" || subCommand === "adicionar") {
        const mentionedJid = webMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        
        if (!mentionedJid) {
          return await sendWarningReply("⚠️ Você precisa mencionar um usuário!\n\nExemplo: " + 
            `${PREFIX}aluguel add @usuario 15/11/2025`);
        }

        // Extrai a data dos argumentos ou do fullArgs
        // Procura por padrão DD/MM/AAAA em qualquer lugar dos argumentos
        let dateString = null;
        const dateRegex = /(\d{2}\/\d{2}\/\d{4})/;
        
        // Limpa o fullArgs de caracteres especiais e espaços extras
        const cleanFullArgs = fullArgs.replace(/\s+/g, ' ').trim();
        
        // Tenta encontrar a data no fullArgs primeiro
        const dateMatch = cleanFullArgs.match(dateRegex);
        if (dateMatch) {
          dateString = dateMatch[1];
        } else {
          // Tenta nos args individuais
          for (const arg of args) {
            const cleanArg = arg.replace(/\s+/g, '').trim();
            if (dateRegex.test(cleanArg)) {
              dateString = cleanArg.match(dateRegex)[1];
              break;
            }
          }
        }
        
        // Debug - log para ver o que foi capturado
        console.log("[ALUGUEL] Data capturada:", dateString);
        console.log("[ALUGUEL] fullArgs original:", fullArgs);
        console.log("[ALUGUEL] fullArgs limpo:", cleanFullArgs);
        console.log("[ALUGUEL] args:", args);
        
        if (!dateString) {
          return await sendWarningReply("⚠️ Você precisa informar a data no formato DD/MM/AAAA!\n\nExemplo: " + 
            `${PREFIX}aluguel add @usuario 15/11/2025`);
        }

        if (!isValidDate(dateString)) {
          return await sendErrorReply(
            `❌ Data inválida! Use o formato DD/MM/AAAA\n\n` +
            `Exemplo: 15/11/2025\n\n` +
            `_Data recebida: "${dateString}"_\n` +
            `_Caracteres: ${dateString.split('').map(c => c.charCodeAt(0)).join(', ')}_`
          );
        }

        // Verifica se a data já passou
        if (isOverdue(dateString)) {
          return await sendErrorReply(
            `❌ A data informada já passou!\n\n` +
            `Por favor, informe uma data futura para o vencimento do aluguel.`
          );
        }

        db[remoteJid][mentionedJid] = {
          date: dateString,
          addedAt: new Date().toISOString(),
        };

        saveDatabase(db);

        const formattedDate = formatDate(dateString);

        return await sendSuccessReply(
          `✅ *Aluguel cadastrado com sucesso!*\n\n` +
          `👤 Usuário: @${mentionedJid.split("@")[0]}\n` +
          `📅 Data: ${formattedDate}\n` +
          `💰 Valor: ${FIXED_VALUE}\n` +
          `⚠️ Válido: ${FIXED_VALIDITY}`,
          [mentionedJid]
        );
      }

      // Comando: DELETAR
      if (subCommand === "delete" || subCommand === "deletar" || subCommand === "remover") {
        const mentionedJid = webMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        
        if (!mentionedJid) {
          return await sendWarningReply("⚠️ Você precisa mencionar um usuário!\n\nExemplo: " + 
            `${PREFIX}aluguel delete @usuario`);
        }

        if (!db[remoteJid][mentionedJid]) {
          return await sendErrorReply("❌ Este usuário não possui aluguel cadastrado!");
        }

        delete db[remoteJid][mentionedJid];
        saveDatabase(db);

        return await sendSuccessReply(
          `✅ *Aluguel removido com sucesso!*\n\n` +
          `👤 Usuário: @${mentionedJid.split("@")[0]}`,
          [mentionedJid]
        );
      }

      // Comando: LISTAR
      if (subCommand === "list" || subCommand === "lista" || subCommand === "listar") {
        const rentals = db[remoteJid];
        
        if (!rentals || Object.keys(rentals).length === 0) {
          return await sendReply("🤖 Nenhum aluguel cadastrado neste grupo ainda!");
        }

        // Ordena por data de vencimento
        const sortedRentals = Object.entries(rentals).sort((a, b) => {
          const [dayA, monthA, yearA] = a[1].date.split("/").map(Number);
          const [dayB, monthB, yearB] = b[1].date.split("/").map(Number);
          
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          
          return dateA - dateB;
        });

        let message = `🤖 *VENCIMENTOS DE ALUGUEL*\n\n`;
        
        sortedRentals.forEach(([userJid, data], index) => {
          const daysUntil = calculateDaysUntil(data.date);
          const formattedDate = formatDate(data.date);
          const status = daysUntil < 0 ? "❌ VENCIDO" : 
                        daysUntil === 0 ? "⚠️ HOJE" :
                        daysUntil <= 7 ? "🔔 PRÓXIMO" : "✅ OK";
          
          message += `${index + 1}. @${userJid.split("@")[0]}\n`;
          message += `   📅 ${formattedDate} • ${FIXED_VALUE}\n`;
          message += `   ${status}`;
          
          if (daysUntil >= 0) {
            message += ` • Faltam ${daysUntil} dia(s)\n\n`;
          } else {
            message += ` • Vencido há ${Math.abs(daysUntil)} dia(s)\n\n`;
          }
        });

        message += `_Total: ${sortedRentals.length} aluguel(is)_`;

        const mentions = sortedRentals.map(([userJid]) => userJid);
        return await sendReply(message, mentions);
      }

      // Comando: HOJE
      if (subCommand === "hoje" || subCommand === "today") {
        const rentals = db[remoteJid];
        
        if (!rentals || Object.keys(rentals).length === 0) {
          return await sendReply("🤖 Nenhum aluguel cadastrado neste grupo ainda!");
        }

        const today = new Date();
        const currentDay = String(today.getDate()).padStart(2, "0");
        const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
        const currentYear = String(today.getFullYear());

        const todayRentals = Object.entries(rentals).filter(([_, data]) => {
          const [day, month, year] = data.date.split("/");
          return day === currentDay && month === currentMonth && year === currentYear;
        });

        if (todayRentals.length === 0) {
          return await sendReply("🤖 Nenhum vencimento de aluguel hoje!");
        }

        let message = `⚠️ *VENCIMENTOS DE HOJE!* ⚠️\n\n`;
        
        todayRentals.forEach(([userJid, data]) => {
          const formattedDate = formatDate(data.date);
          message += `📌 @${userJid.split("@")[0]}\n`;
          message += `   Vencimento: ${formattedDate}\n`;
          message += `   Valor: ${FIXED_VALUE}\n\n`;
        });

        message += `_Atenção! Não esqueça de efetuar o pagamento! 💰_`;

        const mentions = todayRentals.map(([userJid]) => userJid);
        return await sendReply(message, mentions);
      }

      // Comando: VENCENDO (próximos 7 dias)
      if (subCommand === "vencendo" || subCommand === "proximos" || subCommand === "próximos") {
        const rentals = db[remoteJid];
        
        if (!rentals || Object.keys(rentals).length === 0) {
          return await sendReply("🤖 Nenhum aluguel cadastrado neste grupo ainda!");
        }

        const upcomingRentals = Object.entries(rentals).filter(([_, data]) => {
          const daysUntil = calculateDaysUntil(data.date);
          return daysUntil >= 0 && daysUntil <= 7;
        }).sort((a, b) => {
          return calculateDaysUntil(a[1].date) - calculateDaysUntil(b[1].date);
        });

        if (upcomingRentals.length === 0) {
          return await sendReply("🤖 Nenhum vencimento nos próximos 7 dias!");
        }

        let message = `🔔 *VENCIMENTOS PRÓXIMOS* (7 dias)\n\n`;
        
        upcomingRentals.forEach(([userJid, data]) => {
          const daysUntil = calculateDaysUntil(data.date);
          const formattedDate = formatDate(data.date);
          const urgency = daysUntil === 0 ? "🔴 HOJE" :
                         daysUntil === 1 ? "🟡 AMANHÃ" :
                         daysUntil <= 3 ? "🟢 SEGUINTE" : "🔵 PRÓXIMO";
          
          message += `${urgency} @${userJid.split("@")[0]}\n`;
          message += `   📅 ${formattedDate} • ${FIXED_VALUE}\n`;
          message += `   ⏰ ${daysUntil === 0 ? "Vence hoje!" : `Faltam ${daysUntil} dia(s)`}\n\n`;
        });

        message += `_Total: ${upcomingRentals.length} vencimento(s) próximo(s)_`;

        const mentions = upcomingRentals.map(([userJid]) => userJid);
        return await sendReply(message, mentions);
      }

      // Subcomando desconhecido
      return await sendErrorReply(
        `❌ Subcomando desconhecido: *${subCommand}*\n\n` +
        `Use ${PREFIX}aluguel para ver os comandos disponíveis.`
      );
    } catch (error) {
      console.error("[ALUGUEL] Erro no comando:", error);
      return await sendErrorReply(
        `❌ Ocorreu um erro ao executar o comando!\n\n` +
        `*Detalhes:* ${error.message}\n\n` +
        `Se o erro persistir, o arquivo de banco de dados pode estar corrompido. ` +
        `Um backup foi criado automaticamente.`
      );
    }
  },
};