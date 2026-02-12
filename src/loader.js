/**

Este script é responsável

por carregar os eventos

que serão escutados pelo

socket do WhatsApp.

@author Dev Gui
*/
const { TIMEOUT_IN_MILLISECONDS_BY_EVENT } = require("./config");
const { onMessagesUpsert } = require("./middlewares/onMesssagesUpsert");
const { onGroupParticipantsUpdate } = require("./middlewares/onGroupParticipantsUpdate");
const path = require("node:path");

exports.load = (socket) => {
  global.BASE_DIR = path.resolve(__dirname);
  
  const safeEventHandler = async (callback, data, eventName) => {
    try {
      await callback(data);
    } catch (error) {
      // Tratamento básico de erro sem logs
    }
  };

  // Evento de mensagens
  socket.ev.on("messages.upsert", async (data) => {
    const startProcess = Date.now();
    setTimeout(() => {
      safeEventHandler(
        () =>
          onMessagesUpsert({
            socket,
            messages: data.messages,
            startProcess,
          }),
        data,
        "messages.upsert"
      );
    }, TIMEOUT_IN_MILLISECONDS_BY_EVENT);
  });

  // Evento de participantes do grupo
  socket.ev.on("group-participants.update", async (update) => {
    setTimeout(() => {
      safeEventHandler(
        () =>
          onGroupParticipantsUpdate({
            socket,
            userJid: update.participants[0],
            remoteJid: update.id,
            action: update.action,
            webMessage: update,
          }),
        update,
        "group-participants.update"
      );
    }, TIMEOUT_IN_MILLISECONDS_BY_EVENT);
  });
};
