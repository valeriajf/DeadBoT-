exports.commands = ["test-register", "tr"];

exports.handle = async (message, ctx = {}) => {
  console.log('=== TESTE COMANDO FUNCIONANDO ===');
  console.log('Contexto completo:', ctx);
  console.log('Keys do contexto:', Object.keys(ctx));
  console.log('Message keys:', Object.keys(message));
  console.log('Message.key:', message.key);
  
  // Vamos testar diferentes possibilidades para o socket
  const possibleSockets = [
    ctx.socket,
    ctx.client, 
    ctx.bot,
    ctx.sock,
    ctx.connection,
    ctx.whatsapp,
    ctx.wa
  ];
  
  console.log('Testando possíveis sockets:');
  possibleSockets.forEach((socket, index) => {
    const names = ['socket', 'client', 'bot', 'sock', 'connection', 'whatsapp', 'wa'];
    console.log(`${names[index]}: ${socket ? 'ENCONTRADO' : 'não encontrado'}`);
  });
  
  // Se não encontrar socket no ctx, vamos ver se tem no message
  console.log('Verificando se socket está no message...');
  console.log('message.socket:', message.socket ? 'ENCONTRADO' : 'não encontrado');
  console.log('message.client:', message.client ? 'ENCONTRADO' : 'não encontrado');
  
  const chatId = message.key.remoteJid;
  
  // Tenta encontrar qualquer socket válido
  const socket = ctx.socket || ctx.client || ctx.bot || ctx.sock || ctx.connection || ctx.whatsapp || ctx.wa || message.socket || message.client;
  
  if (socket) {
    console.log('Socket encontrado! Enviando mensagem...');
    try {
      await socket.sendMessage(
        chatId,
        { text: "🟢 TESTE: Socket funcionando!" },
        { quoted: message }
      );
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  } else {
    console.log('❌ Nenhum socket encontrado em lugar nenhum');
  }
};