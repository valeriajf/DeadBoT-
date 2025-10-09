/**
 * Comando de teste para verificar como os args chegam
 * 
 * @author Dev Gui
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "teste",
  description: "Comando de teste para ver args",
  commands: ["teste", "test"],
  usage: `${PREFIX}teste arg1 arg2 arg3`,
  
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    args,
    fullArgs,
    sendText 
  }) => {
    console.log('========== TESTE DE ARGS ==========');
    console.log('args:', args);
    console.log('args.length:', args.length);
    console.log('args[0]:', args[0]);
    console.log('args[1]:', args[1]);
    console.log('fullArgs:', fullArgs);
    console.log('===================================');
    
    let mensagem = '🔍 *TESTE DE ARGUMENTOS*\n\n';
    mensagem += `📊 *Total de args*: ${args.length}\n\n`;
    
    if (args.length > 0) {
      mensagem += '📋 *Lista de args*:\n';
      args.forEach((arg, index) => {
        mensagem += `  • args[${index}]: "${arg}"\n`;
      });
    } else {
      mensagem += '❌ Nenhum argumento recebido';
    }
    
    if (fullArgs) {
      mensagem += `\n\n📝 *fullArgs*: "${fullArgs}"`;
    }
    
    await sendText(mensagem);
  },
};