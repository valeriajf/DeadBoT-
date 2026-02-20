/**
 * Middleware X9 - Monitora automaticamente ações dos admins
 * 
 * Este middleware deve ser carregado no src/loader.js
 * Ele escuta eventos de grupo e registra ações quando o X9 está ativo
 */

const { addLog, isX9Active, initFiles } = require('../commands/admin/x9');

// Inicializar arquivos na primeira carga
initFiles();

/**
 * Função para extrair número do JID
 */
const extractNumber = (jid) => {
  if (!jid) return "Desconhecido";
  return jid.split("@")[0].split(":")[0];
};

/**
 * Função para obter nome do grupo
 */
const getGroupName = async (socket, groupJid) => {
  try {
    const groupMetadata = await socket.groupMetadata(groupJid);
    return groupMetadata.subject || "Grupo";
  } catch {
    return "Grupo";
  }
};

/**
 * Função para obter nome de contato ou número
 */
const getContactName = (socket, jid) => {
  try {
    const contact = socket.store?.contacts?.[jid];
    if (contact && contact.name) {
      return contact.name;
    }
    if (contact && contact.notify) {
      return contact.notify;
    }
    return extractNumber(jid);
  } catch {
    return extractNumber(jid);
  }
};

/**
 * Função para notificar evento X9 no grupo
 */
async function notifyX9Event(socket, remoteJid, userJid, action, author) {
  if (!userJid || !isX9Active(remoteJid)) {
    return;
  }

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const groupName = await getGroupName(socket, remoteJid);
    const userMention = `@${extractNumber(userJid)}`;
    
    const hasAuthor = author && author !== userJid;
    const authorMention = hasAuthor ? `@${extractNumber(author)}` : null;

    let message = "";
    const mentions = [userJid];
    if (hasAuthor) mentions.push(author);

    switch (action) {
      case "add":
        if (hasAuthor) {
          message = `✅ *MEMBRO ADICIONADO* ✅\n\n🕵️ O admin ${authorMention} acabou de *adicionar* ${userMention} no grupo! 🕵️\n\n🪀 ${groupName}\n\n🕵️ Bem-vindo(a)! 🕵️`;
        }
        break;

      case "remove":
        if (hasAuthor) {
          message = `🚫 *MEMBRO REMOVIDO* 🚫\n\n🕵️ O admin ${authorMention} acabou de *remover* ${userMention} do grupo! 🕵️\n\n🪀 ${groupName}\n\n🕵️ Até logo! 🕵️`;
        }
        break;

      case "promote":
        if (hasAuthor) {
          message = `🌟 *PROMOÇÃO* 🌟\n\n🕵️ O admin ${authorMention} acabou de *promover* ${userMention} a admin! 🕵️\n\n🪀 ${groupName}\n\n🕵️ Parabéns pela promoção! 🕵️`;
        }
        break;

      case "demote":
        if (hasAuthor) {
          message = `😢 *REBAIXAMENTO* 😢\n\n🕵️ O admin ${authorMention} acabou de *rebaixar* ${userMention} de admin! 🕵️\n\n🪀 ${groupName}\n\n🕵️ Perdeu os poderes... 🕵️`;
        }
        break;

      default:
        return;
    }

    if (message) {
      await socket.sendMessage(remoteJid, {
        text: message,
        mentions: mentions.filter(Boolean),
      });
    }
  } catch (error) {
    // Silenciosamente ignora erros
  }
}

/**
 * Middleware para monitorar participantes (add/remove/promote/demote)
 */
const onGroupParticipantsUpdate = async (socket) => {
  socket.ev.on('group-participants.update', async (event) => {
    try {
      const { id: groupId, participants, action, author } = event;
      
      // Verificar se X9 está ativo neste grupo
      if (!isX9Active(groupId)) {
        return;
      }
      
      // Buscar metadados do grupo
      const groupMetadata = await socket.groupMetadata(groupId).catch(() => null);
      if (!groupMetadata) return;
      
      const groupName = groupMetadata.subject || 'Grupo';
      
      // Verificar se quem executou é admin
      const admins = groupMetadata.participants
        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        .map(p => p.id);
      
      // Para ações add/remove, verificar se author é admin
      // Para promote/demote, author sempre é admin
      const isAdminAction = author && (admins.includes(author) || action === 'promote' || action === 'demote');
      
      if (!author) {
        return;
      }
      
      const actorName = getContactName(socket, author);
      
      // Processar cada participante afetado
      for (const participant of participants) {
        const targetName = getContactName(socket, participant);
        
        // Verificar se é o próprio usuário saindo
        const isSelfAction = author === participant;
        
        // Adicionar log e notificar
        switch (action) {
          case 'add':
            // Se admin adicionou alguém OU aprovou solicitação
            if (isAdminAction) {
              addLog(
                'Adicionar Membro',
                author,
                actorName,
                groupId,
                groupName,
                targetName,
                'Membro adicionado'
              );
              
              // Notificar no grupo
              await notifyX9Event(socket, groupId, participant, 'add', author);
            }
            break;
            
          case 'remove':
            // Apenas salvar log silenciosamente (notificação será feita pelo messageStubType 28)
            if (isAdminAction && !isSelfAction) {
              addLog(
                'Remover Membro',
                author,
                actorName,
                groupId,
                groupName,
                targetName,
                'Membro removido'
              );
              
              // NÃO notificar aqui - será tratado pelo messageStubType 28
            }
            break;
            
          case 'promote':
            if (isAdminAction) {
              addLog(
                'Promover a Admin',
                author,
                actorName,
                groupId,
                groupName,
                targetName,
                'Promovido a admin'
              );
              
              // Notificar no grupo
              await notifyX9Event(socket, groupId, participant, 'promote', author);
            }
            break;
            
          case 'demote':
            if (isAdminAction) {
              addLog(
                'Rebaixar Admin',
                author,
                actorName,
                groupId,
                groupName,
                targetName,
                'Rebaixado de admin'
              );
              
              // Notificar no grupo
              await notifyX9Event(socket, groupId, participant, 'demote', author);
            }
            break;
        }
      }
      
    } catch (error) {
      console.error('Erro no X9 (participants):', error);
    }
  });
};

/**
 * Middleware para monitorar atualizações de grupo (nome, descrição, configs)
 */
const onGroupUpdate = async (socket) => {
  socket.ev.on('groups.update', async (updates) => {
    try {
      for (const update of updates) {
        const { id: groupId, subject, desc, restrict, announce, joinApprovalMode, memberAddMode, author } = update;
        
        // Verificar se X9 está ativo neste grupo
        const x9Active = isX9Active(groupId);
        
        if (!x9Active) {
          continue;
        }
        
        // Buscar metadados do grupo
        const groupMetadata = await socket.groupMetadata(groupId).catch(() => null);
        
        if (!groupMetadata) {
          continue;
        }
        
        const groupName = subject || groupMetadata.subject || 'Grupo';
        
        // Se não tiver autor, pular
        if (!author) {
          continue;
        }
        
        // Tentar obter nome real do admin (converter @lid para JID real)
        let actorName = author;
        let adminJid = author;
        
        if (author.includes('@lid')) {
          const participant = groupMetadata.participants.find(p => p.lid === author);
          if (participant && participant.id) {
            adminJid = participant.id;
            actorName = getContactName(socket, adminJid);
          }
        } else {
          actorName = getContactName(socket, author);
        }
        
        const authorMention = `@${extractNumber(adminJid)}`;
        
        // Registrar mudança de nome
        if (subject !== undefined) {
          addLog(
            'Alterar Nome do Grupo',
            adminJid,
            actorName,
            groupId,
            groupName,
            null,
            `Novo nome: ${subject}`
          );
          
          // Notificar no grupo
          await socket.sendMessage(groupId, {
            text: `📝 *NOME ALTERADO* 📝\n\n🕵️ O admin ${authorMention} alterou o nome do grupo!\n\n🪀 Novo nome: ${subject}\n\n🕵️ Grupo renomeado! 🕵️`,
            mentions: [adminJid]
          }).catch(() => {});
        }
        
        // Registrar mudança de descrição
        if (desc !== undefined) {
          addLog(
            'Alterar Descrição do Grupo',
            adminJid,
            actorName,
            groupId,
            groupName,
            null,
            'Descrição do grupo foi alterada'
          );
          
          // Notificar no grupo
          await socket.sendMessage(groupId, {
            text: `📄 *DESCRIÇÃO ALTERADA* 📄\n\n🕵️ O admin ${authorMention} alterou a descrição do grupo!\n\n🪀 ${groupName}\n\n🕵️ Nova descrição definida! 🕵️`,
            mentions: [adminJid]
          }).catch(() => {});
        }
        
        // Registrar mudança de restrição (quem pode editar info)
        if (restrict !== undefined) {
          addLog(
            'Alterar Configurações',
            adminJid,
            actorName,
            groupId,
            groupName,
            null,
            `Editar info do grupo: ${restrict ? 'Apenas admins' : 'Todos os membros'}`
          );
          
          // Notificar no grupo
          const restrictMsg = restrict ? 'Apenas admins' : 'Todos os membros';
          await socket.sendMessage(groupId, {
            text: `⚙️ *CONFIGURAÇÃO ALTERADA* ⚙️\n\n🕵️ O admin ${authorMention} alterou as permissões!\n\n🪀 Editar info: ${restrictMsg}\n\n🕵️ Configuração atualizada! 🕵️`,
            mentions: [adminJid]
          }).catch(() => {});
        }
        
        // Registrar mudança de announce (quem pode enviar mensagens)
        if (announce !== undefined) {
          addLog(
            'Alterar Configurações',
            adminJid,
            actorName,
            groupId,
            groupName,
            null,
            `Enviar mensagens: ${announce ? 'Apenas admins' : 'Todos os membros'}`
          );
          
          // Notificar no grupo
          const announceMsg = announce ? 'Apenas admins' : 'Todos os membros';
          await socket.sendMessage(groupId, {
            text: `⚙️ *CONFIGURAÇÃO ALTERADA* ⚙️\n\n🕵️ O admin ${authorMention} alterou as permissões!\n\n🪀 Enviar mensagens: ${announceMsg}\n\n🕵️ Configuração atualizada! 🕵️`,
            mentions: [adminJid]
          }).catch(() => {});
        }
        
        // Registrar mudança de aprovação de membros
        if (joinApprovalMode !== undefined) {
          addLog(
            'Alterar Configurações',
            adminJid,
            actorName,
            groupId,
            groupName,
            null,
            `Aprovação de novos membros: ${joinApprovalMode ? 'Ativada' : 'Desativada'}`
          );
          
          // Notificar no grupo
          const approvalMsg = joinApprovalMode ? 'ATIVOU' : 'DESATIVOU';
          const approvalStatus = joinApprovalMode ? 'Admins precisam aprovar novos membros' : 'Qualquer um pode entrar pelo link';
          await socket.sendMessage(groupId, {
            text: `⚙️ *CONFIGURAÇÃO ALTERADA* ⚙️\n\n🕵️ O admin ${authorMention} ${approvalMsg} a aprovação de membros!\n\n🪀 ${approvalStatus}\n\n🕵️ Configuração atualizada! 🕵️`,
            mentions: [adminJid]
          }).catch(() => {});
        }
        
        // Registrar mudança de quem pode adicionar membros
        if (memberAddMode !== undefined) {
          addLog(
            'Alterar Configurações',
            adminJid,
            actorName,
            groupId,
            groupName,
            null,
            `Adicionar membros: ${memberAddMode ? 'Apenas admins' : 'Todos os membros'}`
          );
          
          // Notificar no grupo
          const memberAddMsg = memberAddMode ? 'Apenas admins' : 'Todos os membros';
          await socket.sendMessage(groupId, {
            text: `⚙️ *CONFIGURAÇÃO ALTERADA* ⚙️\n\n🕵️ O admin ${authorMention} alterou as permissões!\n\n🪀 Adicionar membros: ${memberAddMsg}\n\n🕵️ Configuração atualizada! 🕵️`,
            mentions: [adminJid]
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Erro no X9 (update):', error);
    }
  });
};

/**
 * Middleware para monitorar mudança de foto do grupo
 * Nota: O Baileys pode não disparar eventos de foto de forma consistente
 */
const onGroupPictureUpdate = async (socket) => {
  socket.ev.on('groups.update', async (updates) => {
    try {
      
      for (const update of updates) {
        const { id: groupId, author } = update;
        
        
        // Verificar se X9 está ativo neste grupo
        if (!isX9Active(groupId)) {
          continue;
        }
        
        // Verificar TODAS as possíveis propriedades de foto
        const hasPicture = update.pictureUrl !== undefined || 
                          update.picture !== undefined || 
                          update.profilePicture !== undefined ||
                          update.profilePictureUrl !== undefined ||
                          update.avatar !== undefined;
        
        
        if (hasPicture) {
          
          const groupMetadata = await socket.groupMetadata(groupId).catch(() => null);
          
          if (!groupMetadata) {
            continue;
          }
          
          const groupName = groupMetadata.subject || 'Grupo';
          
          
          if (!author) {
            continue;
          }
          
          const actorName = getContactName(socket, author);
          const authorMention = `@${extractNumber(author)}`;
          
          
          addLog(
            'Alterar Foto do Grupo',
            author,
            actorName,
            groupId,
            groupName,
            null,
            'Foto do grupo foi alterada'
          );
          
          
          // Notificar no grupo
          await socket.sendMessage(groupId, {
            text: `🖼️ *FOTO ALTERADA* 🖼️\n\n🕵️ O admin ${authorMention} alterou a foto do grupo!\n\n🪀 ${groupName}\n\n🕵️ Nova foto definida! 🕵️`,
            mentions: [author]
          }).catch((err) => {
          });
          
        } else {
        }
      }
    } catch (error) {
      console.error('❌ [X9-PHOTO-DEBUG] Erro geral:', error);
    }
  });
};

/**
 * Middleware para monitorar ações via messageStubType
 * Captura ações que não vêm nos eventos normais
 */
const onMessageStubType = async (socket) => {
  socket.ev.on('messages.upsert', async ({ messages }) => {
    for (const message of messages) {
      try {
        const { key, messageStubType, messageStubParameters, participant } = message;
        
        // Debug: Mostrar TODOS os messageStubType recebidos
        if (messageStubType) {
        }
        
        if (!messageStubType || !key.remoteJid || !key.remoteJid.endsWith('@g.us')) {
          continue;
        }
        
        const groupJid = key.remoteJid;
        
        // Verificar se X9 está ativo
        if (!isX9Active(groupJid)) {
          continue;
        }
        
        const groupName = await getGroupName(socket, groupJid);
        
        
        switch (messageStubType) {
          // Case 22: Foto do grupo alterada
          case 22: {
            
            if (!participant) {
              break;
            }
            
            const adminJid = participant;
            const actorName = getContactName(socket, adminJid);
            const authorMention = `@${extractNumber(adminJid)}`;
            
            
            // Adicionar log
            addLog(
              'Alterar Foto do Grupo',
              adminJid,
              actorName,
              groupJid,
              groupName,
              null,
              'Foto do grupo foi alterada'
            );
            
            
            // Notificar no grupo
            await socket.sendMessage(groupJid, {
              text: `🖼️ *FOTO ALTERADA* 🖼️\n\n🕵️ O admin ${authorMention} alterou a foto do grupo!\n\n🪀 ${groupName}\n\n🕵️ Nova foto definida! 🕵️`,
              mentions: [adminJid]
            }).catch((err) => {
            });
            
            
            break;
          }
          
          // Case 28: Membro removido do grupo
          case 28: {
            
            if (!participant || !messageStubParameters || !messageStubParameters[0]) {
              break;
            }
            
            const adminJid = participant;
            const targetJid = messageStubParameters[0];
            
            
            const adminName = getContactName(socket, adminJid);
            const targetName = getContactName(socket, targetJid);
            const adminMention = `@${extractNumber(adminJid)}`;
            const targetMention = `@${extractNumber(targetJid)}`;
            
            
            // Adicionar log
            addLog(
              'Remover Membro',
              adminJid,
              adminName,
              groupJid,
              groupName,
              targetName,
              'Membro removido do grupo'
            );
            
            
            // Notificar no grupo
            await socket.sendMessage(groupJid, {
              text: `🚫 *MEMBRO REMOVIDO* 🚫\n\n🕵️ O admin ${adminMention} removeu ${targetMention} do grupo!\n\n🪀 ${groupName}\n\n🕵️ Membro expulso! 🕵️`,
              mentions: [adminJid, targetJid]
            }).catch((err) => {
            });
            
            
            break;
          }
          
          // Case 171/172: Solicitação de entrada criada OU rejeitada
          case 171:
          case 172: {
            
            if (!messageStubParameters || !messageStubParameters[0]) {
              break;
            }
            
            const acao = messageStubParameters[1]; // 'created' ou 'rejected'
            
            // SOLICITAÇÃO CRIADA
            if (acao === 'created') {
              
              const solicitante = messageStubParameters[0];
              
              const horario = new Date(message.messageTimestamp * 1000).toLocaleTimeString('pt-BR', { 
                timeZone: 'America/Sao_Paulo', 
                hour12: false 
              });
              
              const mentionJid = solicitante.includes('@') ? solicitante : `${solicitante}@s.whatsapp.net`;
              const userClean = mentionJid.replace(/(@s\.whatsapp\.net|@lid)/g, '');
              
              // Adicionar log
              addLog(
                'Solicitação de Entrada',
                solicitante,
                userClean,
                groupJid,
                groupName,
                null,
                `Solicitação às ${horario}`
              );
              
              let texto = `🔔 *SOLICITAÇÃO DE ENTRADA* 🔔\n\n🕵️ @${userClean} solicitou entrar no grupo às ${horario}!\n\n🪀 ${groupName}\n\n🕵️ Aguardando aprovação... 🕵️`;
              
              
              await socket.sendMessage(groupJid, {
                text: texto,
                mentions: [mentionJid]
              }).catch((err) => {
              });
            }
            // SOLICITAÇÃO REJEITADA
            else if (acao === 'rejected') {
              
              const targetJid = messageStubParameters[0];
              const adminJid = participant;
              
              
              if (!adminJid) {
                break;
              }
              
              const adminName = getContactName(socket, adminJid);
              const targetName = getContactName(socket, targetJid);
              const adminMention = `@${extractNumber(adminJid)}`;
              const targetMention = `@${extractNumber(targetJid)}`;
              
              // Adicionar log
              addLog(
                'Recusar Entrada',
                adminJid,
                adminName,
                groupJid,
                groupName,
                targetName,
                'Solicitação recusada'
              );
              
              
              // Notificar no grupo
              await socket.sendMessage(groupJid, {
                text: `🚫 *SOLICITAÇÃO RECUSADA* 🚫\n\n🕵️ O admin ${adminMention} recusou a solicitação de ${targetMention}!\n\n🪀 ${groupName}\n\n🕵️ Entrada negada! 🕵️`,
                mentions: [adminJid, targetJid]
              }).catch((err) => {
              });
              
            }
            
            break;
          }
        }
        
      } catch (error) {
        console.error('❌ [X9-STUB-DEBUG] Erro geral:', error);
      }
    }
  });
};

/**
 * Função principal para inicializar todos os middlewares X9
 */
const initX9Monitoring = (socket) => {
  
  onGroupParticipantsUpdate(socket);
  onGroupUpdate(socket);
  onGroupPictureUpdate(socket);
  onMessageStubType(socket);
  
};

module.exports = { initX9Monitoring };
