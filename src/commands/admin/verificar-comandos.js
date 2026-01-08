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
      } else if (
        !item.name.startsWith("_") &&
        (item.name.endsWith(".js") || item.name.endsWith(".ts"))
      ) {
        results.push(itemPath);
      }
    }
  } catch (error) {
    console.error(`Erro ao ler diretório ${dir}:`, error);
  }

  return results;
}

module.exports = {
  name: "verificar-comandos",
  description: "Verifica todos os comandos em busca de erros",
  commands: [
    "verificar-comandos",
    "verify-commands",
    "check-commands",
    "debug-commands",
  ],
  usage: `${PREFIX}verificar-comandos`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ sendReply, sendSuccessReact }) => {
    await sendSuccessReact();
    
    await sendReply('🔍 Verificando comandos...\n\nAguarde...');

    let totalFiles = 0;
    let okFiles = 0;
    let errorFiles = 0;
    const errors = [];

    try {
      const allFiles = readDirectoryRecursive(COMMANDS_DIR);
      totalFiles = allFiles.length;

      for (const filePath of allFiles) {
        try {
          // Limpa cache
          delete require.cache[require.resolve(filePath)];
          
          const cmd = require(filePath);
          const fileName = path.basename(filePath);

          // Verifica propriedade name
          if (!cmd.name) {
            errors.push(`❌ ${fileName}\n   └─ Falta "name"`);
            errorFiles++;
            continue;
          }

          // Verifica propriedade commands
          if (!cmd.commands) {
            errors.push(`❌ ${fileName}\n   └─ Falta "commands"`);
            errorFiles++;
            continue;
          }

          // Verifica se commands é array
          if (!Array.isArray(cmd.commands)) {
            errors.push(`❌ ${fileName}\n   └─ "commands" não é array`);
            errorFiles++;
            continue;
          }

          // Verifica se commands tem itens
          if (cmd.commands.length === 0) {
            errors.push(`❌ ${fileName}\n   └─ "commands" vazio`);
            errorFiles++;
            continue;
          }

          // Verifica função handle
          if (!cmd.handle || typeof cmd.handle !== 'function') {
            errors.push(`❌ ${fileName}\n   └─ Falta função "handle"`);
            errorFiles++;
            continue;
          }

          okFiles++;

        } catch (err) {
          const fileName = path.basename(filePath);
          errors.push(`⚠️ ${fileName}\n   └─ ${err.message}`);
          errorFiles++;
        }
      }

      // Monta resposta
      let response = `*VERIFICAÇÃO DE COMANDOS*\n\n`;
      response += `📊 *Resumo:*\n`;
      response += `• Total: ${totalFiles}\n`;
      response += `• ✅ OK: ${okFiles}\n`;
      response += `• ❌ Erro: ${errorFiles}\n\n`;

      if (errorFiles > 0) {
        response += `⚠️ *ARQUIVOS COM PROBLEMA:*\n\n`;
        
        // Limita a 20 erros para não estourar o limite de mensagem
        const errorsToShow = errors.slice(0, 20);
        response += errorsToShow.join('\n\n');
        
        if (errors.length > 20) {
          response += `\n\n... e mais ${errors.length - 20} erros.`;
        }
        
        response += `\n\n💡 *Dica:* Verifique os logs do console para detalhes completos.`;
      } else {
        response += `🎉 *Todos os comandos estão OK!*`;
      }

      await sendReply(response);

      // Loga erros completos no console
      if (errorFiles > 0) {
        console.log('\n' + '='.repeat(50));
        console.log('📋 LISTA COMPLETA DE ERROS:');
        console.log('='.repeat(50));
        errors.forEach((err, index) => {
          console.log(`\n${index + 1}. ${err}`);
        });
        console.log('\n' + '='.repeat(50));
      }

    } catch (error) {
      console.error('Erro na verificação:', error);
      await sendReply(
        `❌ Erro ao verificar comandos!\n\n` +
        `${error.message}\n\n` +
        `Verifique os logs do console.`
      );
    }
  },
};