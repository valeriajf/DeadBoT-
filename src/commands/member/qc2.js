/**
 * Comando QC2 - Quote falsificado de outro usuário
 * Cria uma figurinha como se outro usuário tivesse escrito o texto
 * Suporta tanto formato antigo (@s.whatsapp.net) quanto novo (@lid)
 * USO: Responda a mensagem de alguém com !qc2 <texto>
 * 
 * @author Adaptado para DeadBoT
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const axios = require('axios');
const { writeFile, unlink } = require('fs/promises');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const execPromise = promisify(exec);

module.exports = {
  name: "qc2",
  description: "Cria uma figurinha quote como se outro usuário tivesse escrito",
  commands: ["qc2", "fqc", "fakequote"],
  usage: `${PREFIX}qc2 <texto> (responda a mensagem de alguém)`,
  handle: async ({ 
    fullArgs,
    isReply,
    replyJid,
    sendErrorReply,
    sendWarningReply, 
    sendWaitReact,
    sendSuccessReact,
    sendStickerFromBuffer,
    sendImageFromBuffer,
    socket,
    webMessage,
    remoteJid,
    isGroup
  }) => {
    const tempDir = '/data/data/com.termux/files/usr/tmp';
    const tempPngPath = path.join(tempDir, `qc2_${Date.now()}.png`);
    const tempWebpPath = path.join(tempDir, `qc2_${Date.now()}.webp`);

    // Função auxiliar para extrair ID do usuário
    function extractUserId(jid) {
      if (!jid) return null;
      if (jid.includes('@lid')) return jid.split('@')[0];
      if (jid.includes('@s.whatsapp.net')) return jid.split('@')[0];
      return jid;
    }

    // Função para verificar se é LID
    function isLID(id) {
      if (!id) return false;
      return id.length >= 15 || id.includes('@lid');
    }

    try {
      // Verifica se está respondendo uma mensagem
      if (!isReply) {
        return await sendErrorReply(
          '❌ Você precisa responder a mensagem de alguém!\n\n' +
          '💡 Uso correto:\n' +
          '1️⃣ Responda a mensagem de alguém\n' +
          '2️⃣ Digite: ' + PREFIX + 'qc2 <texto>\n\n' +
          '📝 Exemplo:\n' +
          'Responda a mensagem e digite:\n' +
          PREFIX + 'qc2 Olá Mundo'
        );
      }

      // Verifica se o texto foi fornecido
      if (!fullArgs || fullArgs.trim() === '') {
        return await sendErrorReply(
          '❌ Insira o texto!\n\n' +
          '💡 Uso: ' + PREFIX + 'qc2 <texto>\n\n' +
          '✨ Dica: ' + PREFIX + 'qc2 <texto> | <nome>\n' +
          'Exemplo: ' + PREFIX + 'qc2 Olá | João'
        );
      }

      // Separa texto do nome customizado
      let texto = fullArgs.trim();
      let customName = null;
      
      if (texto.includes('|')) {
        const parts = texto.split('|');
        texto = parts[0].trim();
        customName = parts[1].trim();
      }

      // Verifica limite de 30 caracteres
      if (texto.length > 30) {
        return await sendWarningReply(
          `⚠️ Limite de caracteres ultrapassado!\n\n` +
          `📊 Seu texto: ${texto.length} caracteres\n` +
          `📏 Máximo: 30 caracteres`
        );
      }

      await sendWaitReact();

      // Cores aleatórias
      const randomColors = ['#FFFFFF', '#000000'];
      const backgroundColor = randomColors[Math.floor(Math.random() * randomColors.length)];

      // Inicializa variáveis
      let targetJid = replyJid;
      let targetUserId = extractUserId(replyJid);
      let targetUserName = "Usuário";
      let targetUserPhoto = 'https://telegra.ph/file/b5427ea4b8701bc47e751.jpg';

      try {
        const quotedMessage = webMessage.message?.extendedTextMessage?.contextInfo;
        
        // DEBUG: Vamos explorar TODA a estrutura
        console.log('🔍 DEBUG: Estrutura completa do contextInfo:');
        console.log(JSON.stringify(quotedMessage, null, 2));
        
        if (quotedMessage && quotedMessage.participant) {
          targetJid = quotedMessage.participant;
          targetUserId = extractUserId(targetJid);

          // === P1: pushName da mensagem CITADA ===
          if (quotedMessage.pushName && !isLID(quotedMessage.pushName)) {
            targetUserName = quotedMessage.pushName;
            console.log('✅ P1: contextInfo.pushName:', targetUserName);
          }
          
          // === P1.5: Buscar no quotedMessage diretamente ===
          if ((targetUserName === "Usuário" || isLID(targetUserName))) {
            // Tenta extrair do quotedMessage
            const quoted = quotedMessage.quotedMessage;
            
            // Verifica se tem pushName embutido na mensagem citada
            if (quoted) {
              console.log('🔍 P1.5: Explorando quotedMessage:', Object.keys(quoted));
              
              // Tenta encontrar pushName em diferentes tipos de mensagem
              const msgTypes = ['conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage'];
              
              for (const type of msgTypes) {
                if (quoted[type]) {
                  console.log(`📌 Tipo encontrado: ${type}`);
                  // Algumas mensagens têm contextInfo com pushName
                  if (quoted[type].contextInfo?.pushName && !isLID(quoted[type].contextInfo.pushName)) {
                    targetUserName = quoted[type].contextInfo.pushName;
                    console.log('✅ P1.5: quotedMessage.' + type + '.contextInfo.pushName:', targetUserName);
                    break;
                  }
                }
              }
            }
          }

          // === P2: Metadados do grupo ===
          if ((targetUserName === "Usuário" || isLID(targetUserName)) && isGroup) {
            try {
              const groupMetadata = await socket.groupMetadata(remoteJid);
              const participant = groupMetadata.participants.find(p => 
                p.id === targetJid || extractUserId(p.id) === targetUserId
              );
              
              if (participant) {
                // Usa JID real se disponível
                if (participant.jid && participant.jid !== targetJid) {
                  targetJid = participant.jid;
                  targetUserId = extractUserId(participant.jid);
                }
                
                // Busca nome
                if (participant.notify && !isLID(participant.notify)) {
                  targetUserName = participant.notify;
                  console.log('✅ P2: metadata.notify:', targetUserName);
                } else if (participant.verifiedName && !isLID(participant.verifiedName)) {
                  targetUserName = participant.verifiedName;
                  console.log('✅ P2: metadata.verifiedName:', targetUserName);
                } else if (participant.name && !isLID(participant.name)) {
                  targetUserName = participant.name;
                  console.log('✅ P2: metadata.name:', targetUserName);
                }
              }
            } catch (err) {
              console.log('❌ P2 erro:', err.message);
            }
          }

          // === P3: socket.store.contacts ===
          if (targetUserName === "Usuário" || isLID(targetUserName) || /^\+?\d/.test(targetUserName)) {
            try {
              if (socket.store?.contacts?.[targetJid]) {
                const contact = socket.store.contacts[targetJid];
                
                if (contact.name && !isLID(contact.name)) {
                  targetUserName = contact.name;
                  console.log('✅ P3: store.name:', targetUserName);
                } else if (contact.notify && !isLID(contact.notify)) {
                  targetUserName = contact.notify;
                  console.log('✅ P3: store.notify:', targetUserName);
                }
              } else {
                console.log('❌ P3: store não disponível');
              }
            } catch (err) {
              console.log('❌ P3 erro:', err.message);
            }
          }

          // === P4: socket.authState.creds.contacts ===
          if (targetUserName === "Usuário" || isLID(targetUserName) || /^\+?\d/.test(targetUserName)) {
            try {
              if (socket.authState?.creds?.contacts?.[targetJid]) {
                const contact = socket.authState.creds.contacts[targetJid];
                
                if (contact.notify && !isLID(contact.notify)) {
                  targetUserName = contact.notify;
                  console.log('✅ P4: authState.notify:', targetUserName);
                } else if (contact.name && !isLID(contact.name)) {
                  targetUserName = contact.name;
                  console.log('✅ P4: authState.name:', targetUserName);
                }
              } else {
                console.log('❌ P4: authState não disponível');
              }
            } catch (err) {
              console.log('❌ P4 erro:', err.message);
            }
          }
          
          // === P5: Buscar diretamente do webMessage (ÚLTIMA CHANCE) ===
          if (targetUserName === "Usuário" || isLID(targetUserName) || /^\+?\d/.test(targetUserName)) {
            try {
              // O pushName pode estar no webMessage principal (de quem respondeu)
              // Vamos buscar todas as mensagens recentes do grupo para encontrar o nome
              console.log('🔍 P5: Tentando buscar histórico de mensagens...');
              
              // Tenta buscar no histórico de mensagens
              const messages = await socket.fetchMessagesFromWA(remoteJid, 50).catch(() => []);
              
              if (messages && messages.length > 0) {
                // Procura mensagens do usuário alvo
                const userMessages = messages.filter(msg => {
                  const msgFrom = msg.key?.participant || msg.key?.remoteJid;
                  return msgFrom === targetJid || extractUserId(msgFrom) === targetUserId;
                });
                
                if (userMessages.length > 0) {
                  // Pega o pushName da mensagem mais recente
                  const recentMsg = userMessages[0];
                  if (recentMsg.pushName && !isLID(recentMsg.pushName)) {
                    targetUserName = recentMsg.pushName;
                    console.log('✅ P5: histórico.pushName:', targetUserName);
                  }
                }
              } else {
                console.log('❌ P5: sem histórico disponível');
              }
            } catch (err) {
              console.log('❌ P5 erro:', err.message);
            }
          }
        }

        // Usa nome customizado se fornecido
        if (customName && !isLID(customName)) {
          targetUserName = customName;
          console.log('✅ Nome customizado:', targetUserName);
        }

        // Formata número se necessário
        if (targetUserName === "Usuário" || /^\+?\d/.test(targetUserName)) {
          if (targetUserId && /^\d+$/.test(targetUserId) && targetUserId.length < 15) {
            if (targetUserId.startsWith('55') && targetUserId.length >= 12) {
              targetUserName = targetUserId.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3');
            } else {
              targetUserName = `+${targetUserId}`;
            }
          }
        }

        // Foto de perfil
        try {
          targetUserPhoto = await socket.profilePictureUrl(targetJid, 'image');
        } catch {
          targetUserPhoto = 'https://telegra.ph/file/b5427ea4b8701bc47e751.jpg';
        }

      } catch (error) {
        console.log('Erro geral:', error.message);
      }

      console.log('📌 Final:', { targetJid, targetUserId, targetUserName });

      // Gera a figurinha
      const json = {
        "type": "quote",
        "format": "png",
        "backgroundColor": backgroundColor,
        "width": 512,
        "height": 768,
        "scale": 2,
        "messages": [{
          "entities": [],
          "avatar": true,
          "from": {
            "id": 1,
            "name": targetUserName,
            "photo": { "url": targetUserPhoto }
          },
          "text": texto,
          "replyMessage": {}
        }]
      };

      const res = await axios.post('https://btzqc.betabotz.eu.org/generate', json, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (!res.data?.result?.image) {
        return await sendErrorReply("❌ Erro ao gerar a figurinha!");
      }

      const imageBuffer = Buffer.from(res.data.result.image, 'base64');

      // Converte para WebP com FFmpeg
      let ffmpegAvailable = false;
      const ffmpegPath = '/data/data/com.termux/files/usr/bin/ffmpeg';
      
      try {
        const testResult = await execPromise(`${ffmpegPath} -version 2>&1`);
        if (testResult.stdout?.includes('ffmpeg version')) {
          ffmpegAvailable = true;
        }
      } catch {}

      if (ffmpegAvailable) {
        try {
          await writeFile(tempPngPath, imageBuffer);
          await execPromise(
            `cd /data/data/com.termux/files/usr/bin && ./ffmpeg -y -i "${tempPngPath}" -vcodec libwebp -q:v 75 -preset default -loop 0 -an -vsync 0 "${tempWebpPath}" 2>&1`,
            {
              env: {
                ...process.env,
                PATH: '/data/data/com.termux/files/usr/bin:' + process.env.PATH,
                LD_LIBRARY_PATH: '/data/data/com.termux/files/usr/lib'
              }
            }
          );

          if (fs.existsSync(tempWebpPath)) {
            const webpBuffer = fs.readFileSync(tempWebpPath);
            await sendStickerFromBuffer(webpBuffer, true);
            await unlink(tempPngPath).catch(() => {});
            await unlink(tempWebpPath).catch(() => {});
          } else {
            throw new Error('WebP não criado');
          }
        } catch {
          await sendImageFromBuffer(imageBuffer, `✅ Quote!\n👤 ${targetUserName}\n📝 ${texto}`, undefined, true);
          await unlink(tempPngPath).catch(() => {});
          await unlink(tempWebpPath).catch(() => {});
        }
      } else {
        await sendImageFromBuffer(imageBuffer, `✅ Quote!\n👤 ${targetUserName}\n📝 ${texto}`, undefined, true);
      }
      
      await sendSuccessReact();

    } catch (e) {
      await unlink(tempPngPath).catch(() => {});
      await unlink(tempWebpPath).catch(() => {});
      console.error('Erro no qc2:', e.message);
      await sendErrorReply("❌ Erro ao gerar a figurinha!");
    }
  },
};