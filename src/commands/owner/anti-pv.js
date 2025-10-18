const path = require("path");
const BASE_DIR = path.resolve(__dirname, "../..");
const { PREFIX, OWNER_NUMBER, OWNER_LID } = require(`${BASE_DIR}/config`);
const { WarningError } = require(`${BASE_DIR}/errors`);
const fs = require("fs");

// Caminho para o arquivo JSON que armazenará as configurações
const ANTI_PV_FILE = path.join(BASE_DIR, "database", "anti-pv.json");

// Função para carregar configurações
function loadAntiPvData() {
  try {
    if (!fs.existsSync(ANTI_PV_FILE)) {
      const dbDir = path.dirname(ANTI_PV_FILE);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      fs.writeFileSync(ANTI_PV_FILE, JSON.stringify({}, null, 2));
      return {};
    }
    const data = fs.readFileSync(ANTI_PV_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ [ANTI-PV] Erro ao carregar anti-pv.json:", error);
    return {};
  }
}

// Função para salvar configurações
function saveAntiPvData(data) {
  try {
    fs.writeFileSync(ANTI_PV_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ [ANTI-PV] Erro ao salvar anti-pv.json:", error);
  }
}

// Função para verificar se anti-pv está ativo (exportada para uso no handler)
function isAntiPvActive() {
  const data = loadAntiPvData();
  return Object.values(data).some(value => value === true);
}

module.exports = {
  name: "anti-pv",
  description: "Ativa ou desativa o bloqueio automático de mensagens no privado (apenas dono)",
  commands: ["anti-pv", "antipv"],
  usage: `${PREFIX}anti-pv 1 (ativar) ou ${PREFIX}anti-pv 0 (desativar)`,
  
  // Exporta a função de verificação
  isAntiPvActive,
  loadAntiPvData,
  
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ args, sendSuccessReply, sendErrorReply, isGroup, remoteJid, userJid }) => {
    // Limpa o OWNER_LID para evitar duplicação de @lid
    const cleanOwnerLid = OWNER_LID ? OWNER_LID.replace(/@lid@lid$/, '@lid') : '';
    
    const isOwnerByNumber = OWNER_NUMBER && userJid.includes(OWNER_NUMBER.split('@')[0]);
    const isOwnerByLid = cleanOwnerLid && userJid === cleanOwnerLid;
    const isOwner = isOwnerByNumber || isOwnerByLid;
    
    if (!isOwner) {
      throw new WarningError("⛔ Este comando é exclusivo para o dono do bot!");
    }

    if (!isGroup) {
      throw new WarningError("Este comando deve ser usado dentro de um grupo.");
    }

    if (args.length === 0) {
      return await sendErrorReply(
        `❌ Use: ${PREFIX}anti-pv 1 (ativar) ou ${PREFIX}anti-pv 0 (desativar)`
      );
    }

    const option = args[0].trim();

    if (option !== "1" && option !== "0") {
      return await sendErrorReply(
        `❌ Opção inválida! Use:\n${PREFIX}anti-pv 1 (ativar)\n${PREFIX}anti-pv 0 (desativar)`
      );
    }

    const antiPvData = loadAntiPvData();

    if (option === "1") {
      antiPvData[remoteJid] = true;
      saveAntiPvData(antiPvData);
      await sendSuccessReply(
        "✅ *Anti-PV ativado!*\n\n" +
        "🔒 O bot agora bloqueará automaticamente mensagens no privado.\n" +
        "✅ Respostas apenas em grupos."
      );
    } else {
      antiPvData[remoteJid] = false;
      saveAntiPvData(antiPvData);
      await sendSuccessReply(
        "✅ *Anti-PV desativado!*\n\n" +
        "🔓 O bot voltará a responder mensagens privadas."
      );
    }
  },
};