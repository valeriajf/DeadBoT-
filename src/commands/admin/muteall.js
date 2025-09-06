/**
 * Comando muteall - Muta todos os membros do grupo
 * Permite apenas figurinhas, remove áudios MP3, mensagens de voz,
 * mensagens escritas, fotos, Gifs e vídeos
 * Só pode ser ativado por administradores
 *
 * @author DeadBoT
 */
const { PREFIX } = require("../../config");
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração de muteall
const MUTEALL_CONFIG_PATH = path.join(__dirname, '..', '..', 'database', 'muteall.json');

// Função para carregar configurações do muteall
function loadMuteallConfig() {
    try {
        if (!fs.existsSync(MUTEALL_CONFIG_PATH)) {
            return {};
        }
        const data = fs.readFileSync(MUTEALL_CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ [MUTEALL] Erro ao carregar configurações:', error.message);
        return {};
    }
}

// Função para salvar configurações do muteall
function saveMuteallConfig(config) {
    try {
        const dir = path.dirname(MUTEALL_CONFIG_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(MUTEALL_CONFIG_PATH, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('❌ [MUTEALL] Erro ao salvar configurações:', error.message);
        return false;
    }
}

// Função para verificar se o grupo está em muteall
function isGroupMutedAll(groupId) {
    const config = loadMuteallConfig();
    return config[groupId] === true;
}

// Função para ativar muteall em um grupo
function enableMuteall(groupId) {
    const config = loadMuteallConfig();
    config[groupId] = true;
    return saveMuteallConfig(config);
}

module.exports = {
    name: "muteall",
    description: "Muta todos os membros do grupo, permitindo apenas figurinhas. Remove áudios, mensagens de voz, textos, fotos, GIFs e vídeos",
    commands: ["muteall", "mutartodos"],
    usage: `${PREFIX}muteall`,
    
    /**
     * @param {CommandHandleProps} props
     * @returns {Promise<void>}
     */
    handle: async ({ 
        sendSuccessReply,
        sendErrorReply,
        sendWarningReply,
        isAdmin,
        remoteJid,
        userJid,
        socket
    }) => {
        try {
            // Verifica se é um grupo
            if (!remoteJid.endsWith('@g.us')) {
                return await sendErrorReply('❌ Este comando só funciona em grupos!');
            }

            // Verifica se o usuário é admin (verificação manual se isAdmin não estiver funcionando)
            let userIsAdmin = isAdmin;
            if (!userIsAdmin) {
                try {
                    const groupMetadata = await socket.groupMetadata(remoteJid);
                    const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
                    userIsAdmin = groupAdmins.includes(userJid);
                } catch (error) {
                    console.error('❌ [MUTEALL] Erro ao verificar admin:', error.message);
                }
            }

            if (!userIsAdmin) {
                return await sendErrorReply('❌ Apenas administradores podem usar este comando!');
            }

            // Verifica se o grupo já está em muteall
            if (isGroupMutedAll(remoteJid)) {
                return await sendWarningReply('⚠️ Este grupo já está com o muteall ativado!');
            }

            // Ativa o muteall
            if (enableMuteall(remoteJid)) {
                const message = `🔇 MUTEALL ATIVADO 🔇

📢 Atenção membros:

✅ Apenas figurinhas são permitidas

🔓 Use \`${PREFIX}unmuteall\` para desativar`;

                await sendSuccessReply(message);
                console.log(`🔇 [MUTEALL] Ativado no grupo: ${remoteJid}`);
            } else {
                await sendErrorReply('❌ Erro ao ativar o muteall. Tente novamente.');
            }

        } catch (error) {
            console.error('❌ [MUTEALL] Erro no comando:', error.message);
            await sendErrorReply('❌ Erro interno ao executar o comando.');
        }
    },

    // Exporta funções auxiliares para uso no onMessagesUpsert
    isGroupMutedAll,
    enableMuteall,
    loadMuteallConfig,
    saveMuteallConfig
};