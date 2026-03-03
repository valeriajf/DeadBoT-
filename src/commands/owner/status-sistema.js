/**
 * Comando: status-sistema
 * Exibe o status de todas as instâncias cadastradas no arquivo instances.json
 *
 * 📁 Coloque este arquivo em: src/commands/owner/
 * 📁 Coloque o instances.json em: database/instances.json
 *
 * @author Dev Gui (template) | Adaptado para STATUS-SISTEMA
 */

const { PREFIX } = require(`${BASE_DIR}/config`);
const path = require("path");
const fs = require("fs");

// Caminho para o arquivo de instâncias
const INSTANCES_PATH = path.join(BASE_DIR, "..", "database", "instances.json");

/**
 * Lê as instâncias do arquivo JSON
 * @returns {Array} Lista de instâncias
 */
function getInstances() {
  if (!fs.existsSync(INSTANCES_PATH)) {
    fs.writeFileSync(INSTANCES_PATH, JSON.stringify([], null, 2), "utf-8");
  }
  const raw = fs.readFileSync(INSTANCES_PATH, "utf-8");
  return JSON.parse(raw);
}

module.exports = {
  name: "status-sistema",
  description: "Exibe o status de todas as instâncias do sistema",
  commands: ["status-sistema"],
  usage: `${PREFIX}status-sistema`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ sendReply }) => {
    const instances = getInstances();

    if (!instances.length) {
      await sendReply(
        "⚠️ Nenhuma instância cadastrada!\n\n" +
        `Adicione instâncias no arquivo:\n📁 database/instances.json`
      );
      return;
    }

    const total = instances.length;
    const separator = "───────────────────";

    let message = `📊 *STATUS DO SISTEMA* 📊\n\nTotal de Instâncias: ${total}\n\n`;

    for (const instance of instances) {
      const status = instance.connected
        ? "✅ *Conectado*"
        : "❌ *Desconectado*";

      message += `🆔 *${instance.id}*\n`;
      message += `📱 @${instance.number}\n`;
      message += `🎈 Grupos: ${instance.groups}\n`;
      message += `${status}\n`;
      if (instance.lastUpdate) {
        message += `🕐 ${instance.lastUpdate}\n`;
      }
      message += `\n${separator}\n\n`;
    }

    // Remove o último separador
    message = message.trimEnd();
    message = message.endsWith(separator)
      ? message.slice(0, -separator.length).trimEnd()
      : message;

    await sendReply(message);
  },
};
