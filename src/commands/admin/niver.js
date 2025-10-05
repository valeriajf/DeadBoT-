/**
 * Comando para gerenciar aniversários dos membros do grupo.
 * Permite adicionar, remover e listar aniversários.
 * O bot enviará lembretes automáticos no dia do aniversário.
 *
 * @author Dev VaL 
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const fs = require("node:fs");
const path = require("node:path");

const DATABASE_PATH = path.join(BASE_DIR, "database", "niver.json");

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
    console.error("[NIVER] Erro ao carregar banco de dados:", error);
    // Se houver erro, cria um backup e retorna objeto vazio
    if (fs.existsSync(DATABASE_PATH)) {
      const backupPath = DATABASE_PATH + ".backup";
      fs.copyFileSync(DATABASE_PATH, backupPath);
      console.log(`[NIVER] Backup criado em: ${backupPath}`);
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
    console.error("[NIVER] Erro ao salvar banco de dados:", error);
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

// Formata a data para exibição
const formatDate = (dateString) => {
  const [day, month, year] = dateString.split("/");
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  return `${day} de ${months[parseInt(month) - 1]} de ${year}`;
};

// Calcula idade
const calculateAge = (dateString) => {
  const [day, month, year] = dateString.split("/").map(Number);
  const today = new Date();
  const birthDate = new Date(year, month - 1, day);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

module.exports = {
  name: "niver",
  description: "Gerencia aniversários dos membros do grupo",
  commands: ["niver", "aniversario", "birthday"],
  usage: `${PREFIX}niver add @usuario DD/MM/AAAA
${PREFIX}niver delete @usuario
${PREFIX}niver list
${PREFIX}niver hoje`,
  
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
          `📅 *SISTEMA DE ANIVERSÁRIOS*\n\n` +
          `*Comandos disponíveis:*\n\n` +
          `▸ ${PREFIX}niver add @usuario DD/MM/AAAA\n` +
          `   Adiciona um aniversário\n\n` +
          `▸ ${PREFIX}niver delete @usuario\n` +
          `   Remove um aniversário\n\n` +
          `▸ ${PREFIX}niver list\n` +
          `   Lista todos os aniversários\n\n` +
          `▸ ${PREFIX}niver hoje\n` +
          `   Mostra aniversariantes do dia\n\n` +
          `*Exemplo:*\n` +
          `${PREFIX}niver add @João 15/03/1995`
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
            `${PREFIX}niver add @usuario 15/03/1995`);
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
        console.log("[NIVER] Data capturada:", dateString);
        console.log("[NIVER] fullArgs original:", fullArgs);
        console.log("[NIVER] fullArgs limpo:", cleanFullArgs);
        console.log("[NIVER] args:", args);
        
        if (!dateString) {
          return await sendWarningReply("⚠️ Você precisa informar a data no formato DD/MM/AAAA!\n\nExemplo: " + 
            `${PREFIX}niver add @usuario 15/03/1995`);
        }

        if (!isValidDate(dateString)) {
          return await sendErrorReply(
            `❌ Data inválida! Use o formato DD/MM/AAAA\n\n` +
            `Exemplo: 15/03/1995\n\n` +
            `_Data recebida: "${dateString}"_\n` +
            `_Caracteres: ${dateString.split('').map(c => c.charCodeAt(0)).join(', ')}_`
          );
        }

        db[remoteJid][mentionedJid] = {
          date: dateString,
          addedAt: new Date().toISOString(),
        };

        saveDatabase(db);

        const age = calculateAge(dateString);
        const formattedDate = formatDate(dateString);

        return await sendSuccessReply(
          `✅ *Aniversário cadastrado com sucesso!*\n\n` +
          `👤 Usuário: @${mentionedJid.split("@")[0]}\n` +
          `🎂 Data: ${formattedDate}\n` +
          `📅 Idade atual: ${age} anos`,
          [mentionedJid]
        );
      }

      // Comando: DELETAR
      if (subCommand === "delete" || subCommand === "deletar" || subCommand === "remover") {
        const mentionedJid = webMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        
        if (!mentionedJid) {
          return await sendWarningReply("⚠️ Você precisa mencionar um usuário!\n\nExemplo: " + 
            `${PREFIX}niver delete @usuario`);
        }

        if (!db[remoteJid][mentionedJid]) {
          return await sendErrorReply("❌ Este usuário não possui aniversário cadastrado!");
        }

        delete db[remoteJid][mentionedJid];
        saveDatabase(db);

        return await sendSuccessReply(
          `✅ *Aniversário removido com sucesso!*\n\n` +
          `👤 Usuário: @${mentionedJid.split("@")[0]}`,
          [mentionedJid]
        );
      }

      // Comando: LISTAR
      if (subCommand === "list" || subCommand === "lista" || subCommand === "listar") {
        const birthdays = db[remoteJid];
        
        if (!birthdays || Object.keys(birthdays).length === 0) {
          return await sendReply("📅 Nenhum aniversário cadastrado neste grupo ainda!");
        }

        // Ordena por mês e dia
        const sortedBirthdays = Object.entries(birthdays).sort((a, b) => {
          const [dayA, monthA] = a[1].date.split("/").map(Number);
          const [dayB, monthB] = b[1].date.split("/").map(Number);
          
          if (monthA !== monthB) return monthA - monthB;
          return dayA - dayB;
        });

        let message = `🎉 *ANIVERSÁRIOS DO GRUPO*\n\n`;
        
        sortedBirthdays.forEach(([userJid, data], index) => {
          const age = calculateAge(data.date);
          const [day, month] = data.date.split("/");
          
          message += `${index + 1}. @${userJid.split("@")[0]}\n`;
          message += `   📅 ${day}/${month} • ${age} anos\n\n`;
        });

        message += `_Total: ${sortedBirthdays.length} aniversário(s)_`;

        const mentions = sortedBirthdays.map(([userJid]) => userJid);
        return await sendReply(message, mentions);
      }

      // Comando: HOJE
      if (subCommand === "hoje" || subCommand === "today") {
        const birthdays = db[remoteJid];
        
        if (!birthdays || Object.keys(birthdays).length === 0) {
          return await sendReply("📅 Nenhum aniversário cadastrado neste grupo ainda!");
        }

        const today = new Date();
        const currentDay = String(today.getDate()).padStart(2, "0");
        const currentMonth = String(today.getMonth() + 1).padStart(2, "0");

        const todayBirthdays = Object.entries(birthdays).filter(([_, data]) => {
          const [day, month] = data.date.split("/");
          return day === currentDay && month === currentMonth;
        });

        if (todayBirthdays.length === 0) {
          return await sendReply("📅 Nenhum aniversariante hoje!");
        }

        let message = `🎉🎂 *ANIVERSARIANTES DE HOJE!* 🎂🎉\n\n`;
        
        todayBirthdays.forEach(([userJid, data]) => {
          const age = calculateAge(data.date);
          message += `🎈 @${userJid.split("@")[0]}\n`;
          message += `   Completando ${age} anos! 🎊\n\n`;
        });

        message += `_Parabéns! Desejamos muitas felicidades! 🎁_`;

        const mentions = todayBirthdays.map(([userJid]) => userJid);
        return await sendReply(message, mentions);
      }

      // Subcomando desconhecido
      return await sendErrorReply(
        `❌ Subcomando desconhecido: *${subCommand}*\n\n` +
        `Use ${PREFIX}niver para ver os comandos disponíveis.`
      );
    } catch (error) {
      console.error("[NIVER] Erro no comando:", error);
      return await sendErrorReply(
        `❌ Ocorreu um erro ao executar o comando!\n\n` +
        `*Detalhes:* ${error.message}\n\n` +
        `Se o erro persistir, o arquivo de banco de dados pode estar corrompido. ` +
        `Um backup foi criado automaticamente.`
      );
    }
  },
};