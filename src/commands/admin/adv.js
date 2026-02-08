// @author: VaL

const fs = require('fs');
const warnsFile = './warns.json';

/**
 * Busca o número real do usuário nos metadados do grupo
 */
async function findRealPhoneNumber(socket, remoteJid, userJid) {
  try {
    // Se já é um JID normal, retorna direto
    if (userJid.includes('@s.whatsapp.net')) {
      return userJid;
    }
    
    // Busca nos metadados do grupo
    const metadata = await socket.groupMetadata(remoteJid);
    
    for (const p of metadata.participants) {
      // Compara com id, lid ou jid
      if (p.id === userJid || p.lid === userJid || p.jid === userJid) {
        // PRIORIDADE: Campo JID (número real)
        if (p.jid && p.jid.includes('@s.whatsapp.net')) {
          return p.jid;
        }
        // Fallback: Campo ID
        if (p.id && p.id.includes('@s.whatsapp.net')) {
          return p.id;
        }
      }
    }
    
    // Se não encontrou, retorna o original
    return userJid;
  } catch (error) {
    console.error('Erro ao buscar número real:', error);
    return userJid;
  }
}

module.exports = {
  name: 'adv',
  description: 'Dá advertência a um membro (ban com 3). Só admins podem usar.',
  commands: ['adv'],
  handle: async (params) => {
    try {
      const {
        socket,
        remoteJid,
        replyJid,
        isGroup,
        getGroupAdmins,
        userJid,
        fullMessage,
        mentionedJid
      } = params;

      if (!isGroup) {
        await socket.sendMessage(remoteJid, { text: '❌ Esse comando só funciona em grupos.' });
        return;
      }

      const admins = await getGroupAdmins(remoteJid);
      if (!admins.includes(userJid)) {
        await socket.sendMessage(remoteJid, { text: '❌ Apenas administradores podem usar esse comando.' });
        return;
      }

      let target = null;

      // 1. Verifica se é reply
      if (replyJid) {
        target = replyJid;
      }
      // 2. Verifica se há menção (@usuario)
      else if (mentionedJid && mentionedJid.length > 0) {
        target = mentionedJid[0];
      }
      // 3. Verifica se há número no texto
      else if (fullMessage) {
        const args = fullMessage.trim().split(/\s+/);
        if (args.length > 1) {
          // Remove tudo que não é número
          let numero = args.slice(1).join('').replace(/\D/g, '');
          
          // Se não começar com código de país, assume Brasil (55)
          if (!numero.startsWith('55') && numero.length <= 11) {
            numero = '55' + numero;
          }
          
          // Formata para o padrão do WhatsApp
          target = numero + '@s.whatsapp.net';
        }
      }

      if (!target) {
        await socket.sendMessage(remoteJid, { 
          text: '⚠️ Use o comando de uma das formas:\n' +
                '• Respondendo a mensagem do usuário\n' +
                '• Mencionando: #adv @usuario\n' +
                '• Com número: #adv +55 41 98776-1506'
        });
        return;
      }

      // Converte LID para número real (se necessário)
      const realTarget = await findRealPhoneNumber(socket, remoteJid, target);
      console.log(`📝 ADV - Target original: ${target}, Target real: ${realTarget}`);

      let warns = {};
      if (fs.existsSync(warnsFile)) {
        warns = JSON.parse(fs.readFileSync(warnsFile));
      }

      // Usa o número real para registrar a advertência
      warns[realTarget] = (warns[realTarget] || 0) + 1;
      fs.writeFileSync(warnsFile, JSON.stringify(warns, null, 2));

      const count = warns[realTarget];

      if (count >= 3) {
        await socket.sendMessage(remoteJid, {
          text: `🚫 Usuário atingiu 3 advertências e será removido.`,
          mentions: [realTarget]
        });

        try {
          // Remove usando o target original (pode ser LID)
          await socket.groupParticipantsUpdate(remoteJid, [target], 'remove');
          warns[realTarget] = 0;
          fs.writeFileSync(warnsFile, JSON.stringify(warns, null, 2));
        } catch {
          await socket.sendMessage(remoteJid, { text: '❌ Erro ao remover o usuário. O bot é administrador?' });
        }
      } else {
        await socket.sendMessage(remoteJid, {
          text: `⚠️ Advertência dada ao usuário.\n🔢 Total: ${count}/3.`,
          mentions: [realTarget]
        });
      }

    } catch (error) {
      console.error('Erro no comando adv:', error);
      if (params.remoteJid) {
        await socket.sendMessage(params.remoteJid, { text: '❌ Erro inesperado ao executar #adv.' });
      }
    }
  }
};