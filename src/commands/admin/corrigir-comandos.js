const { PREFIX, COMMANDS_DIR } = require(`${BASE_DIR}/config`);
const fs = require('fs');
const path = require('path');

function readDirectoryRecursive(dir) {
  const results = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const itemPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results.push(...readDirectoryRecursive(itemPath));
      } else if (!item.name.startsWith("_") && item.name.endsWith(".js")) {
        results.push(itemPath);
      }
    }
  } catch (error) {
    console.error(`Erro ao ler diretório ${dir}:`, error);
  }
  return results;
}

module.exports = {
  name: "corrigir-comandos",
  description: "Corrige comandos com propriedade 'name' faltando",
  commands: [
    "corrigir-comandos",
    "fix-commands",
    "autofix-commands",
  ],
  usage: `${PREFIX}corrigir-comandos`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ sendReply, sendSuccessReact }) => {
    await sendSuccessReact();
    await sendReply('🔧 Corrigindo comandos...\n\nAguarde...');

    const fixed = [];
    const errors = [];

    try {
      const allFiles = readDirectoryRecursive(COMMANDS_DIR);

      for (const filePath of allFiles) {
        try {
          delete require.cache[require.resolve(filePath)];
          const cmd = require(filePath);
          const fileName = path.basename(filePath, '.js');

          // Verifica se falta a propriedade name
          if (!cmd.name) {
            console.log(`[AUTOFIX] Corrigindo ${fileName}.js...`);
            
            // Lê o conteúdo do arquivo
            let fileContent = fs.readFileSync(filePath, 'utf8');
            
            // Procura o module.exports
            const exportMatch = fileContent.match(/module\.exports\s*=\s*{/);
            
            if (exportMatch) {
              const insertPosition = exportMatch.index + exportMatch[0].length;
              
              // Adiciona a propriedade name logo após o {
              const nameProperty = `\n  name: "${fileName}",`;
              
              fileContent = 
                fileContent.slice(0, insertPosition) +
                nameProperty +
                fileContent.slice(insertPosition);
              
              // Salva o arquivo corrigido
              fs.writeFileSync(filePath, fileContent, 'utf8');
              
              fixed.push(`✅ ${fileName}.js`);
              console.log(`[AUTOFIX] ✅ ${fileName}.js corrigido!`);
            } else {
              errors.push(`⚠️ ${fileName}.js - Não encontrou module.exports`);
            }
          }

        } catch (err) {
          const fileName = path.basename(filePath);
          errors.push(`❌ ${fileName} - ${err.message}`);
          console.error(`[AUTOFIX] Erro em ${fileName}:`, err);
        }
      }

      // Monta resposta
      let response = `*CORREÇÃO AUTOMÁTICA*\n\n`;
      
      if (fixed.length > 0) {
        response += `✅ *Corrigidos (${fixed.length}):*\n`;
        response += fixed.join('\n');
        response += '\n\n';
      }
      
      if (errors.length > 0) {
        response += `⚠️ *Erros (${errors.length}):*\n`;
        response += errors.join('\n');
        response += '\n\n';
      }
      
      if (fixed.length === 0 && errors.length === 0) {
        response += `✅ Nenhuma correção necessária!`;
      } else {
        response += `🔄 *Reinicie o bot* para aplicar as correções.`;
      }

      await sendReply(response);

    } catch (error) {
      console.error('[AUTOFIX] Erro geral:', error);
      await sendReply(
        `❌ Erro ao corrigir comandos!\n\n` +
        `${error.message}`
      );
    }
  },
};