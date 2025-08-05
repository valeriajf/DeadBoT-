// @author: VaL

const fs = require('fs');
const warnsFile = './warns.json';

module.exports = {
  name: 'advreset',
  description: 'Reseta as advertências de um usuário.',
  commands: ['advreset'],
  handle: async (params) => {
    try {
      const {
        socket,
        remoteJid,
        replyJid,
        isGroup,
        getGroupAdmins,
        userJid
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

      const target = replyJid;
      if (!target) {
        await socket.sendMessage(remoteJid, { text: '⚠️ Use o comando respondendo à mensagem do usuário que deseja resetar as advertências.' });
        return;
      }

      let warns = {};
      if (fs.existsSync(warnsFile)) {
        warns = JSON.parse(fs.readFileSync(warnsFile));
      }

      if (warns[target]) {
        warns[target] = 0;
        fs.writeFileSync(warnsFile, JSON.stringify(warns, null, 2));
        await socket.sendMessage(remoteJid, { text: '✅ Advertências do usuário foram resetadas.' });
      } else {
        await socket.sendMessage(remoteJid, { text: 'ℹ️ Esse usuário não possui advertências registradas.' });
      }

    } catch (error) {
      console.error('Erro no comando advreset:', error);
      if (params.remoteJid) {
        await socket.sendMessage(params.remoteJid, { text: '❌ Erro inesperado ao executar /advreset.' });
      }
    }
  }
};