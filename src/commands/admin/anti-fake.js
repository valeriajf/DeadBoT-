/**
 * Comando Anti-Fake - Impede entrada de números estrangeiros (não +55)
 *
 * @author VaL
 */
const { PREFIX } = require("../../config");
const fs = require('fs');
const path = require('path');

// Caminho para armazenar configurações do anti-fake
const ANTIFAKE_CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'antifake.json');

// Função para carregar configurações
function loadAntiFakeConfig() {
  try {
    if (fs.existsSync(ANTIFAKE_CONFIG_PATH)) {
      const data = fs.readFileSync(ANTIFAKE_CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ [ANTI-FAKE] Erro ao carregar configurações:', error);
  }
  return {};
}

// Função para salvar configurações
function saveAntiFakeConfig(config) {
  try {
    const dir = path.dirname(ANTIFAKE_CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ANTIFAKE_CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('❌ [ANTI-FAKE] Erro ao salvar configurações:', error);
  }
}

// Função para verificar se o número é brasileiro (+55)
function isBrazilianNumber(number) {
  // Remove caracteres especiais e espaços
  const cleanNumber = number.replace(/[^\d+]/g, '');
  
  // Verifica se começa com +55
  return cleanNumber.startsWith('+55') || cleanNumber.startsWith('55');
}

module.exports = {
  name: "anti-fake",
  description: "Ativa/desativa proteção contra números estrangeiros (apenas +55 Brasil)",
  commands: ["antifake", "anti-fake"],
  usage: `${PREFIX}antifake [1/0]`,
  
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async (props) => {
    try {
      // Extrair propriedades do DeadBoT
      const { sendText, args, isGroup, remoteJid, userJid } = props;

      // Verificar se é um grupo
      if (!isGroup) {
        await sendText("❌ Este comando só funciona em grupos!");
        return;
      }

      const config = loadAntiFakeConfig();
      const action = args[0];

      if (action === '1') {
        config[remoteJid] = { 
          enabled: true, 
          enabledBy: userJid, 
          enabledAt: new Date().toISOString() 
        };
        saveAntiFakeConfig(config);
        await sendText("✅ *Anti-Fake ativado!*\n\n🛡️ Agora apenas números brasileiros (+55) podem entrar no grupo.\n\n📱 Números estrangeiros serão automaticamente removidos.");
        console.log(`🛡️ [ANTI-FAKE] Ativado no grupo ${remoteJid.split('@')[0]}`);
        
      } else if (action === '0') {
        if (config[remoteJid]) {
          config[remoteJid].enabled = false;
          config[remoteJid].disabledBy = userJid;
          config[remoteJid].disabledAt = new Date().toISOString();
        } else {
          config[remoteJid] = { enabled: false };
        }
        saveAntiFakeConfig(config);
        await sendText("❌ *Anti-Fake desativado!*\n\n🌍 Números de qualquer país podem entrar no grupo novamente.");
        console.log(`🛡️ [ANTI-FAKE] Desativado no grupo ${remoteJid.split('@')[0]}`);
        
      } else {
        await sendText(`🛡️ *Anti-Fake*\n\n*Descrição:*\nQuando ativado, apenas números brasileiros (+55) podem entrar no grupo. Números estrangeiros são automaticamente removidos.`);
      }

    } catch (error) {
      console.error("❌ [ANTI-FAKE] Erro no handle:", error);
      throw error;
    }
  },

  // Event listener para novos membros
  onGroupParticipantsUpdate: async ({ groupId, participants, action, client }) => {
    if (action !== 'add') return;

    const config = loadAntiFakeConfig();
    if (!config[groupId]?.enabled) return;

    console.log(`🛡️ [ANTI-FAKE] Verificando novos membros no grupo ${groupId}`);

    for (const participant of participants) {
      const participantId = participant._serialized || participant;
      const participantNumber = participantId.split('@')[0];

      console.log(`🛡️ [ANTI-FAKE] Verificando número: ${participantNumber}`);

      // Verificar se é número brasileiro
      if (!isBrazilianNumber(participantNumber)) {
        try {
          console.log(`🛡️ [ANTI-FAKE] Removendo número estrangeiro: ${participantNumber}`);
          
          // Enviar mensagem melhorada
          await client.sendMessage(groupId, {
            text: `🚫 *ANTIFAKE ATIVADO*\n\n⚠️ *Banindo estrangeiro automaticamente*`
          });
          
          // Remover participante
          await client.groupParticipantsUpdate(groupId, [participantId], "remove");
          
          console.log(`🛡️ [ANTI-FAKE] Removido número estrangeiro ${participantNumber} do grupo ${groupId}`);
        } catch (error) {
          console.error(`❌ [ANTI-FAKE] Erro ao remover número estrangeiro ${participantNumber}:`, error);
        }
      } else {
        console.log(`🛡️ [ANTI-FAKE] Número brasileiro aprovado: ${participantNumber}`);
      }
    }
  }
};