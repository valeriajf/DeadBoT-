/**
 * Converte vídeos em áudio MP3.
 * (Comando temporariamente desativado para manutenção)
 *
 * @author Val
 */

const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "tomp3",
  description: "Converte um vídeo em áudio MP3 (em manutenção)",
  commands: ["tomp3", "video2mp3"],
  usage: `${PREFIX}tomp3`,
  
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ sendReply }) => {
    await sendReply(
      "⚙️ O comando *#tomp3* está temporariamente em manutenção.\n\n" +
      "🧩 A base de conversão e reconhecimento de vídeo já foi testada, mas está sendo ajustada " +
      "para funcionar corretamente no ambiente do DeadBoT.\n\n" +
      "💡 Assim que estiver estável, o comando será reativado!"
    );
  },
};