// Marca todos os ADMs do grupo (versão melhorada)
// Autor: VaL + melhorias DeadBoT

module.exports = {
  name: 'adms',
  description: 'Marca todos os administradores do grupo',
  commands: ['adms', 'admins', 'administradores'],
  cooldown: 30, // evita spam (30 segundos)

  handle: async (params) => {
    try {
      const {
        socket,
        remoteJid,
        isGroup,
        getGroupAdmins
      } = params;

      // ❌ Só funciona em grupo
      if (!isGroup) {
        await socket.sendMessage(remoteJid, {
          text: '❌ Esse comando só funciona em grupos.'
        });
        return;
      }

      // 🔎 Pega dados do grupo
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const groupName = groupMetadata.subject || 'Grupo';

      // 👮 Lista de admins
      const admins = await getGroupAdmins(remoteJid);

      if (!admins || admins.length === 0) {
        await socket.sendMessage(remoteJid, {
          text: '❌ Não encontrei administradores neste grupo.'
        });
        return;
      }

      // 🏷️ Formata menções
      const adminMentions = admins.map(admin => `@${admin.split('@')[0]}`);

      // 🧾 Mensagem padrão DeadBoT
      const message =
`👮 *Chamando os ADMs*
🪀️ Grupo: *${groupName}*

${adminMentions.join(' ')}`;

      // 📤 Envia com menções reais
      await socket.sendMessage(remoteJid, {
        text: message,
        mentions: admins
      });

    } catch (error) {
      console.error('Erro no comando adms:', error);

      if (params.remoteJid) {
        await params.socket.sendMessage(params.remoteJid, {
          text: '❌ Erro ao chamar os administradores.'
        });
      }
    }
  }
};