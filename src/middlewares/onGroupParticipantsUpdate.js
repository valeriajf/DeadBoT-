/**
 * Evento chamado quando um usuário
 * entra ou sai de um grupo de WhatsApp.
 *
 * @author VaL
 */
const fs = require("node:fs");
const path = require("path");
const { getProfileImageData } = require("../services/baileys");
const { onlyNumbers, getRandomNumber } = require("../utils");
const {
  isActiveWelcomeGroup,
  isActiveExitGroup,
  isActiveGroup,
} = require("../utils/database");
const { welcomeMessage, exitMessage } = require("../messages");
const {
  spiderAPITokenConfigured,
  exit,
  welcome,
} = require("../services/spider-x-api");
const { upload } = require("../services/upload");

// 🎉 WELCOME2 - Sistema de boas-vindas com foto do membro
const { handleWelcome2NewMember } = require("../utils/welcome2Handler");

// 🎉 WELCOME3 - Sistema de boas-vindas com foto do grupo
const { handleWelcome3NewMember } = require("../utils/welcome3Handler");

// 🚫 LISTA NEGRA - Funções para banimento automático
const BLACKLIST_FILE = path.join(__dirname, '..', 'data', 'blacklist.json');

function loadBlacklist() {
  try {
    if (!fs.existsSync(BLACKLIST_FILE)) {
      return {};
    }
    const data = fs.readFileSync(BLACKLIST_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[BLACKLIST] Erro ao carregar lista negra:', error);
    return {};
  }
}

async function checkAndBanBlacklistedUser(socket, remoteJid, userJid) {
  try {
    const blacklist = loadBlacklist();
    
    if (!blacklist[remoteJid] || blacklist[remoteJid].length === 0) {
      return false;
    }

    const userNumber = userJid.replace('@s.whatsapp.net', '');
    
    if (blacklist[remoteJid].includes(userNumber)) {
      console.log(`[BLACKLIST] Detectado usuário ${userNumber} na lista negra do grupo ${remoteJid}`);
      
      try {
        await socket.groupParticipantsUpdate(remoteJid, [userJid], 'remove');
        
        const banMessage = 
          `🚫 *BANIMENTO AUTOMÁTICO*\n\n` +
          `👤 *Usuário:* ${userNumber}\n` +
          `⚠️ *Motivo:* Usuário está na lista negra\n` +
          `🔒 *Ação:* Banido automaticamente\n\n` +
          `💡 Para remover da lista negra, use lista-negra-remover`;
        
        await socket.sendMessage(remoteJid, { text: banMessage });
        
        console.log(`[BLACKLIST] Usuário ${userNumber} banido automaticamente do grupo ${remoteJid}`);
        return true;
      } catch (error) {
        console.error(`[BLACKLIST] Erro ao banir usuário ${userNumber}:`, error);
        try {
          const warningMessage = 
            `⚠️ *ALERTA - LISTA NEGRA*\n\n` +
            `👤 *Usuário:* ${userNumber}\n` +
            `🚨 *Status:* Na lista negra mas não foi possível banir automaticamente\n` +
            `💡 *Ação recomendada:* Bana manualmente ou verifique as permissões do bot`;
          
          await socket.sendMessage(remoteJid, { text: warningMessage });
        } catch (msgError) {
          console.error('[BLACKLIST] Erro ao enviar mensagem de aviso:', msgError);
        }
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('[BLACKLIST] Erro no checkAndBanBlacklistedUser:', error);
    return false;
  }
}

// 🚫 ANTIFAKE - bloqueia números que não são do Brasil (APENAS SE ATIVADO)
async function checkAndBanAntifake(socket, remoteJid, userJid) {
  try {
    const ANTIFAKE_CONFIG_PATH = path.join(__dirname, '..', 'data', 'antifake.json');
    
    let config = {};
    try {
      if (fs.existsSync(ANTIFAKE_CONFIG_PATH)) {
        const data = fs.readFileSync(ANTIFAKE_CONFIG_PATH, 'utf8');
        config = JSON.parse(data);
      }
    } catch (error) {
      console.error('[ANTIFAKE] Erro ao carregar configurações:', error);
    }
    
    if (!config[remoteJid]?.enabled) {
      console.log(`[ANTIFAKE] Desativado no grupo ${remoteJid}, permitindo entrada`);
      return false;
    }

    const userNumber = userJid.replace('@s.whatsapp.net', '');

    if (!userNumber.startsWith("55")) {
      console.log(`[ANTIFAKE] Detectado número estrangeiro: ${userNumber}`);

      try {
        await socket.groupParticipantsUpdate(remoteJid, [userJid], 'remove');
        
        console.log(`[ANTIFAKE] Usuário ${userNumber} banido silenciosamente do grupo ${remoteJid}`);
        return true;
      } catch (error) {
        console.error(`[ANTIFAKE] Erro ao banir ${userNumber}:`, error);
      }
    }

    return false;
  } catch (error) {
    console.error('[ANTIFAKE] Erro no checkAndBanAntifake:', error);
    return false;
  }
}

exports.onGroupParticipantsUpdate = async ({
  userJid,
  remoteJid,
  socket,
  action,
}) => {
  try {
    if (!remoteJid.endsWith("@g.us")) {
      return;
    }

    if (!isActiveGroup(remoteJid)) {
      return;
    }

    if (action === "add") {
      // 🚫 Primeiro verifica o antifake
      const fakeBanned = await checkAndBanAntifake(socket, remoteJid, userJid);
      if (fakeBanned) {
        console.log(`[ANTIFAKE] Usuário banido, pulando mensagem de boas-vindas`);
        return;
      }

      // 🚫 Depois verifica a lista negra
      const wasBanned = await checkAndBanBlacklistedUser(socket, remoteJid, userJid);
      if (wasBanned) {
        console.log(`[BLACKLIST] Usuário banido, pulando mensagem de boas-vindas`);
        return;
      }

      // 🎉 WELCOME2 - Sistema com foto do membro (executa antes do welcome3 e welcome padrão)
      try {
        const groupMetadata = await socket.groupMetadata(remoteJid);
        
        // Tratamento correto do número baseado no tipo de JID
        let userNumber;
        if (userJid.includes('@lid')) {
          userNumber = userJid.replace('@lid', '');
        } else {
          userNumber = userJid.replace('@s.whatsapp.net', '');
        }
        
        console.log(`[WELCOME2] Dados do novo membro:`);
        console.log(`  - userJid: ${userJid}`);
        console.log(`  - userNumber: ${userNumber}`);
        console.log(`  - groupName: ${groupMetadata.subject}`);
        
        await handleWelcome2NewMember({
          groupId: remoteJid,
          groupName: groupMetadata.subject,
          newMemberId: userJid,
          newMemberNumber: userNumber,
          sendImageWithCaption: async ({ image, caption, mentions }) => {
            console.log(`[WELCOME2] Enviando mensagem com menções: ${mentions}`);
            await socket.sendMessage(remoteJid, {
              image: { url: image },
              caption: caption,
              mentions: mentions
            });
          },
          sendTextWithMention: async ({ caption, mentions }) => {
            console.log(`[WELCOME2] Enviando apenas texto com menções: ${mentions}`);
            await socket.sendMessage(remoteJid, {
              text: caption,
              mentions: mentions
            });
          },
          getProfilePicture: async (userId) => {
            try {
              return await socket.profilePictureUrl(userId, 'image');
            } catch (error) {
              console.log('[WELCOME2] Erro ao obter foto de perfil:', error.message);
              return null;
            }
          }
        });
      } catch (error) {
        console.error('[WELCOME2] Erro no sistema welcome2:', error);
      }

      // 🎉 WELCOME3 - Sistema com foto do grupo
      try {
        const groupMetadata = await socket.groupMetadata(remoteJid);
        
        // Tratamento correto do número baseado no tipo de JID
        let userNumber;
        if (userJid.includes('@lid')) {
          userNumber = userJid.replace('@lid', '');
        } else {
          userNumber = userJid.replace('@s.whatsapp.net', '');
        }
        
        console.log(`[WELCOME3] Dados do novo membro:`);
        console.log(`  - userJid: ${userJid}`);
        console.log(`  - userNumber: ${userNumber}`);
        console.log(`  - groupName: ${groupMetadata.subject}`);
        
        await handleWelcome3NewMember({
          groupId: remoteJid,
          groupName: groupMetadata.subject,
          newMemberId: userJid,
          newMemberNumber: userNumber,
          sendImageWithCaption: async ({ image, caption, mentions }) => {
            console.log(`[WELCOME3] Enviando imagem com legenda embaixo`);
            // CORREÇÃO: Igual ao comando regras - imagem em cima, caption embaixo
            await socket.sendMessage(remoteJid, {
              image: { url: image },
              caption: caption,
              mentions: mentions
            });
          },
          sendTextWithMention: async ({ caption, mentions }) => {
            console.log(`[WELCOME3] Enviando apenas texto com menções: ${mentions}`);
            await socket.sendMessage(remoteJid, {
              text: caption,
              mentions: mentions
            });
          },
          getGroupPicture: async (groupId) => {
            try {
              return await socket.profilePictureUrl(groupId, 'image');
            } catch (error) {
              console.log('[WELCOME3] Erro ao obter foto do grupo:', error.message);
              return null;
            }
          }
        });
      } catch (error) {
        console.error('[WELCOME3] Erro no sistema welcome3:', error);
      }
    }

    // 🎉 SISTEMA WELCOME PADRÃO (mantido como estava)
    if (isActiveWelcomeGroup(remoteJid) && action === "add") {
      const { buffer, profileImage } = await getProfileImageData(
        socket,
        userJid
      );

      const hasMemberMention = welcomeMessage.includes("@member");
      const mentions = [];

      let finalWelcomeMessage = welcomeMessage;

      if (hasMemberMention) {
        finalWelcomeMessage = welcomeMessage.replace(
          "@member",
          `@${onlyNumbers(userJid)}`
        );
        mentions.push(userJid);
      }

      if (spiderAPITokenConfigured) {
        try {
          if (!buffer) {
            await socket.sendMessage(remoteJid, {
              image: buffer,
              caption: finalWelcomeMessage,
              mentions,
            });
            return;
          }

          const link = await upload(
            buffer,
            `${getRandomNumber(10_000, 99_9999)}.png`
          );

          if (!link) {
            throw new Error(
              "Não consegui fazer o upload da imagem, tente novamente mais tarde!"
            );
          }

          const url = welcome(
            "participante",
            "Você é o mais novo membro do grupo!",
            link
          );

          await socket.sendMessage(remoteJid, {
            image: { url },
            caption: finalWelcomeMessage,
            mentions,
          });
        } catch (error) {
          console.error("Erro ao fazer upload da imagem:", error);
          await socket.sendMessage(remoteJid, {
            image: buffer,
            caption: finalWelcomeMessage,
            mentions,
          });
        }
      } else {
        await socket.sendMessage(remoteJid, {
          image: buffer,
          caption: finalWelcomeMessage,
          mentions,
        });
      }

      if (!profileImage.includes("default-user")) {
        fs.unlinkSync(profileImage);
      }
    } else if (isActiveExitGroup(remoteJid) && action === "remove") {
      const { buffer, profileImage } = await getProfileImageData(
        socket,
        userJid
      );

      const hasMemberMention = exitMessage.includes("@member");
      const mentions = [];

      let finalExitMessage = exitMessage;

      if (hasMemberMention) {
        finalExitMessage = exitMessage.replace(
          "@member",
          `@${onlyNumbers(userJid)}`
        );
        mentions.push(userJid);
      }

      if (spiderAPITokenConfigured) {
        try {
          const link = await upload(
            buffer,
            `${getRandomNumber(10_000, 99_9999)}.png`
          );

          if (!link) {
            throw new Error(
              "Não consegui fazer o upload da imagem, tente novamente mais tarde!"
            );
          }

          const url = exit("membro", "Você foi um bom membro", link);

          await socket.sendMessage(remoteJid, {
            image: { url },
            caption: finalExitMessage,
            mentions,
          });
        } catch (error) {
          console.error("Erro ao fazer upload da imagem:", error);
          await socket.sendMessage(remoteJid, {
            image: buffer,
            caption: finalExitMessage,
            mentions,
          });
        }
      } else {
        await socket.sendMessage(remoteJid, {
          image: buffer,
          caption: finalExitMessage,
          mentions,
        });
      }

      if (!profileImage.includes("default-user")) {
        fs.unlinkSync(profileImage);
      }
    }
  } catch (error) {
    console.error("Erro ao processar evento onGroupParticipantsUpdate:", error);
    process.exit(1);
  }
};