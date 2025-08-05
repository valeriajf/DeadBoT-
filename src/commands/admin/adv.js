// @author: VaL

const fs = require('fs');
const warnsFile = './warns.json';

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
        await socket.sendMessage(remoteJid, { text: '⚠️ Use o comando respondendo à mensagem do usuário que deseja advertir.' });
        return;
      }

      let warns = {};
      if (fs.existsSync(warnsFile)) {
        warns = JSON.parse(fs.readFileSync(warnsFile));
      }

      warns[target] = (warns[target] || 0) + 1;
      fs.writeFileSync(warnsFile, JSON.stringify(warns, null, 2));

      const count = warns[target];

      if (count >= 3) {
        // Mensagem com menção (array no mentionedJid)
        await socket.sendMessage(remoteJid, {
          text: `🚫 Usuário atingiu 3 advertências e será removido.`,
        }, {
          contextInfo: { mentionedJid: [target] }
        });

        try {
          await socket.groupParticipantsUpdate(remoteJid, [target], 'remove');
          warns[target] = 0;
          fs.writeFileSync(warnsFile, JSON.stringify(warns, null, 2));
        } catch {
          await socket.sendMessage(remoteJid, { text: '❌ Erro ao remover o usuário. O bot é administrador?' });
        }
      } else {
        await socket.sendMessage(remoteJid, {
          text: `⚠️ Advertência dada ao usuário.\n🔢 Total: ${count}/3.`,
        }, {
          contextInfo: { mentionedJid: [target] }
        });
      }

    } catch (error) {
      console.error('Erro no comando adv:', error);
      if (params.remoteJid) {
        await socket.sendMessage(params.remoteJid, { text: '❌ Erro inesperado ao executar /adv.' });
      }
    }
  }
};