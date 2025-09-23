// Marca os ADMs do grupo 
//
// @uthor VaL
  
   

module.exports = {
  name: 'adms',
  description: 'Marca todos os administradores do grupo',
  commands: ['adms', 'admins', 'administradores'],
  handle: async (params) => {
    try {
      const {
        socket,
        remoteJid,
        isGroup,
        getGroupAdmins,
        args
      } = params;

      // Verifica se está em um grupo
      if (!isGroup) {
        await socket.sendMessage(remoteJid, { text: '❌ Esse comando só funciona em grupos.' });
        return;
      }

      // Obtém a lista de administradores
      const admins = await getGroupAdmins(remoteJid);
      
      if (!admins || admins.length === 0) {
        await socket.sendMessage(remoteJid, { text: '❌ Não foi possível encontrar administradores neste grupo.' });
        return;
      }

      // Mensagem opcional fornecida pelo usuário
      const customMessage = args ? args.join(' ') : '';
      
      // Cria a lista de menções dos administradores
      const adminMentions = admins.map(admin => `@${admin.split('@')[0]}`);
      
      // Monta a mensagem final
      const finalMessage = customMessage 
        ? `📢 ${customMessage}\n\n👥 Administradores:\n${adminMentions.join(' ')}`
        : `👥 Administradores do grupo:\n${adminMentions.join(' ')}`;

      // Envia a mensagem com as menções usando o mesmo formato do comando ADV
      await socket.sendMessage(remoteJid, {
        text: finalMessage,
        mentions: admins
      });

    } catch (error) {
      console.error('Erro no comando adms:', error);
      if (params.remoteJid) {
        await socket.sendMessage(params.remoteJid, { text: '❌ Erro inesperado ao executar /adms.' });
      }
    }
  }
};