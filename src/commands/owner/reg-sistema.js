/**
 * Comando: reg-sistema
 * Registra automaticamente a instância atual no sistema de monitoramento.
 * Coleta: número do bot, ID do grupo, quantidade de grupos e status de conexão.
 * Se a instância já existir no JSON, atualiza os dados.
 *
 * 📁 Coloque este arquivo em: src/commands/owner/
 * 📁 O arquivo instances.json será criado/atualizado em: database/instances.json
 *
 * @author Dev Gui (template) | Adaptado para REG-SISTEMA
 */

const { PREFIX } = require(`${BASE_DIR}/config`);
const path = require("path");
const fs = require("fs");

// Caminho para o arquivo de instâncias
const INSTANCES_PATH = path.join(BASE_DIR, "..", "database", "instances.json");

/**
 * Lê as instâncias do arquivo JSON.
 * Se o arquivo não existir, cria um novo vazio.
 * @returns {Array} Lista de instâncias
 */
function getInstances() {
  if (!fs.existsSync(INSTANCES_PATH)) {
    fs.writeFileSync(INSTANCES_PATH, JSON.stringify([], null, 2), "utf-8");
  }
  const raw = fs.readFileSync(INSTANCES_PATH, "utf-8");
  return JSON.parse(raw);
}

/**
 * Salva a lista de instâncias no arquivo JSON.
 * @param {Array} instances - Lista de instâncias atualizada
 */
function saveInstances(instances) {
  fs.writeFileSync(INSTANCES_PATH, JSON.stringify(instances, null, 2), "utf-8");
}

/**
 * Formata o número do bot para exibição legível.
 * Ex: "5511999998888" → "+55 11 99999-8888"
 * @param {string} number - Número bruto (apenas dígitos)
 * @returns {string} Número formatado
 */
function formatPhoneNumber(number) {
  // Remove qualquer coisa que não seja número
  const digits = number.replace(/\D/g, "");

  // Formato: +55 11 99999-8888 (Brasil, 13 dígitos com código do país)
  if (digits.length === 13 && digits.startsWith("55")) {
    const country = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9);
    return `+${country} ${ddd} ${part1}-${part2}`;
  }

  // Formato: +55 11 9999-8888 (Brasil, 12 dígitos com código do país)
  if (digits.length === 12 && digits.startsWith("55")) {
    const country = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 8);
    const part2 = digits.slice(8);
    return `+${country} ${ddd} ${part1}-${part2}`;
  }

  // Para outros formatos/países, apenas adiciona o "+"
  return `+${digits}`;
}

module.exports = {
  name: "reg-sistema",
  description: "Registra esta instância no sistema de monitoramento",
  commands: ["reg-sistema"],
  usage: `${PREFIX}reg-sistema`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    socket,
    remoteJid,
    sendReply,
    sendSuccessReact,
    sendWaitReact,
    getGroupParticipants,
  }) => {
    // Reação de "aguarde" enquanto processa
    await sendWaitReact();

    // Obtém o número do bot a partir do JID da conexão
    // O JID do bot tem formato: "5511999998888@s.whatsapp.net"
    const botJid = socket.user?.id || "";
    const botNumberRaw = botJid.split(":")[0].split("@")[0];
    const botNumberFormatted = formatPhoneNumber(botNumberRaw);

    // Obtém todos os grupos em que o bot está presente
    let totalGroups = 0;
    try {
      const allChats = await socket.groupFetchAllParticipating();
      totalGroups = Object.keys(allChats).length;
    } catch {
      // Se não conseguir buscar grupos, mantém 0
      totalGroups = 0;
    }

    // Carrega a lista de instâncias atual
    const instances = getInstances();

    // Verifica se essa instância já está registrada (pelo número do bot)
    const existingIndex = instances.findIndex(
      (inst) => inst.number === botNumberFormatted
    );

    let isUpdate = false;
    let instanceId;

    if (existingIndex !== -1) {
      // ✅ Instância já existe → ATUALIZA os dados
      isUpdate = true;
      instanceId = instances[existingIndex].id;

      instances[existingIndex] = {
        id: instanceId,
        number: botNumberFormatted,
        groups: totalGroups,
        connected: true,
        lastUpdate: new Date().toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        }),
        groupJid: remoteJid,
      };
    } else {
      // 🆕 Instância nova → CRIA um novo registro
      // Gera ID sequencial (maior ID existente + 1)
      const maxId =
        instances.length > 0 ? Math.max(...instances.map((i) => i.id)) : 0;
      instanceId = maxId + 1;

      instances.push({
        id: instanceId,
        number: botNumberFormatted,
        groups: totalGroups,
        connected: true,
        lastUpdate: new Date().toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        }),
        groupJid: remoteJid,
      });
    }

    // Salva no arquivo JSON
    saveInstances(instances);

    // Reação de sucesso
    await sendSuccessReact();

    // Monta mensagem de resposta
    const action = isUpdate ? "🔄 *ATUALIZADO*" : "✅ *REGISTRADO*";

    await sendReply(
      `📋 *REG-SISTEMA* ${action}\n\n` +
        `🆔 ID: *${instanceId}*\n` +
        `📱 Número: ${botNumberFormatted}\n` +
        `🎈 Grupos: ${totalGroups}\n` +
        `🟢 Status: *Conectado*\n` +
        `🕐 Atualizado em: ${new Date().toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        })}\n\n` +
        `_Use ${PREFIX}status-sistema para ver todas as instâncias._`
    );
  },
};
