const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const { 
  activateX9Monitor, 
  deactivateX9Monitor, 
  isActiveX9Monitor,
  getX9Logs,
  clearX9Logs
} = require(`${BASE_DIR}/utils/database`);

module.exports = {
  name: "x9",
  description: "Monitora ações dos administradores no grupo (promoções, rebaixamentos e aprovações de entrada)",
  commands: ["x9", "monitor-adm", "monitor"],
  usage: `${PREFIX}x9 1/0 | ${PREFIX}x9 logs | ${PREFIX}x9 limpar | ${PREFIX}x9 debug`,
  /**
   * @param {import(`${BASE_DIR}/@types`).CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    sendReply,
    args,
    sendSuccessReact,
    sendWarningReply,
    remoteJid,
  }) => {
    // Validação de argumentos
    if (!args.length) {
      throw new InvalidParameterError(
        `❌ *Uso incorreto!*\n\n` +
        `*Comandos disponíveis:*\n` +
        `• ${PREFIX}x9 1 - Ativa o monitor\n` +
        `• ${PREFIX}x9 0 - Desativa o monitor\n` +
        `• ${PREFIX}x9 logs - Ver últimas ações\n` +
        `• ${PREFIX}x9 limpar - Limpar histórico\n` +
        `• ${PREFIX}x9 debug - Ver informações de debug`
      );
    }

    const action = args[0].toLowerCase();

    // ========== DEBUG ==========
    if (action === "debug") {
      try {
        const isActive = await isActiveX9Monitor(remoteJid);
        const logs = await getX9Logs(remoteJid, 5);
        
        const path = require('path');
        const fs = require('fs');
        const dbPath = path.resolve(__dirname, '..', '..', 'database');
        
        let filesInfo = '📁 *Arquivos Database:*\n';
        try {
          const x9GroupsPath = path.join(dbPath, 'x9-monitor-groups.json');
          const x9LogsPath = path.join(dbPath, 'x9-logs.json');
          
          filesInfo += `\n*x9-monitor-groups.json:*\n`;
          filesInfo += `Existe: ${fs.existsSync(x9GroupsPath) ? '✅' : '❌'}\n`;
          if (fs.existsSync(x9GroupsPath)) {
            const content = fs.readFileSync(x9GroupsPath, 'utf8');
            filesInfo += `Conteúdo: ${content.substring(0, 100)}...\n`;
          }
          
          filesInfo += `\n*x9-logs.json:*\n`;
          filesInfo += `Existe: ${fs.existsSync(x9LogsPath) ? '✅' : '❌'}\n`;
          if (fs.existsSync(x9LogsPath)) {
            const content = fs.readFileSync(x9LogsPath, 'utf8');
            filesInfo += `Conteúdo: ${content.substring(0, 100)}...\n`;
          }
        } catch (err) {
          filesInfo += `\nErro ao ler arquivos: ${err.message}\n`;
        }
        
        await sendReply(
          `🔍 *DEBUG X9 MONITOR*\n\n` +
          `*Status Atual:*\n` +
          `Monitor Ativo: ${isActive ? '✅ SIM' : '❌ NÃO'}\n` +
          `Grupo ID: ${remoteJid}\n` +
          `Total de Logs: ${logs.length}\n\n` +
          filesInfo + `\n` +
          `*Funções Importadas:*\n` +
          `activateX9Monitor: ${typeof activateX9Monitor}\n` +
          `deactivateX9Monitor: ${typeof deactivateX9Monitor}\n` +
          `isActiveX9Monitor: ${typeof isActiveX9Monitor}\n` +
          `getX9Logs: ${typeof getX9Logs}\n` +
          `clearX9Logs: ${typeof clearX9Logs}\n\n` +
          `*Último Log (se houver):*\n` +
          `${logs.length > 0 ? JSON.stringify(logs[0], null, 2) : 'Nenhum log disponível'}`
        );
      } catch (error) {
        console.error('Erro no debug:', error);
        await sendReply(
          `❌ *Erro no Debug:*\n\n` +
          `${error.message}\n\n` +
          `Stack: ${error.stack}`
        );
      }
      return;
    }

    // ========== ATIVAR ==========
    if (action === "1" || action === "on" || action === "ativar") {
      const isActive = await isActiveX9Monitor(remoteJid);
      
      if (isActive) {
        throw new WarningError("⚠️ O monitor X9 já está ativo neste grupo!");
      }

      await activateX9Monitor(remoteJid);
      await sendSuccessReact();
      await sendReply(
        `✅ *Monitor X9 Ativado!*\n\n` +
        `🕵️ Agora estou monitorando:\n` +
        `• Promoções a admin\n` +
        `• Rebaixamentos de admin\n` +
        `• Aprovações de entrada\n` +
        `• Rejeições de entrada\n\n` +
        `💡 Use *${PREFIX}x9 logs* para ver o histórico!`
      );
      return;
    }

    // ========== DESATIVAR ==========
    if (action === "0" || action === "off" || action === "desativar") {
      const isActive = await isActiveX9Monitor(remoteJid);
      
      if (!isActive) {
        throw new WarningError("⚠️ O monitor X9 já está desativado neste grupo!");
      }

      await deactivateX9Monitor(remoteJid);
      await sendSuccessReact();
      await sendReply(
        `✅ *Monitor X9 Desativado!*\n\n` +
        `🔕 O monitoramento foi pausado.\n` +
        `📝 O histórico anterior foi mantido.`
      );
      return;
    }

    // ========== VER LOGS ==========
    if (action === "logs" || action === "historico" || action === "ver") {
      const logs = await getX9Logs(remoteJid, 20);
      
      if (!logs || logs.length === 0) {
        await sendWarningReply(
          `⚠️ *Nenhuma ação registrada ainda.*\n\n` +
          `💡 O monitor registrará as próximas ações dos admins.`
        );
        return;
      }

      // Formatar logs
      let message = `🕵️ *RELATÓRIO X9 - ÚLTIMAS AÇÕES*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      logs.forEach((log, index) => {
        const emoji = {
          'promote': '⬆️',
          'demote': '⬇️',
          'approve': '✅',
          'reject': '❌'
        }[log.action] || '📝';

        const actionText = {
          'promote': 'promoveu a admin',
          'demote': 'rebaixou de admin',
          'approve': 'aprovou entrada de',
          'reject': 'rejeitou entrada de'
        }[log.action] || 'fez ação em';

        message += `${emoji} *Ação ${index + 1}:*\n`;
        message += `👤 Admin: @${log.adminPhone}\n`;
        message += `🎯 ${actionText}\n`;
        message += `👥 Membro: @${log.targetPhone}\n`;
        message += `🕐 ${log.timestamp}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      });

      message += `💡 *Dica:* Use *${PREFIX}x9 limpar* para limpar o histórico.`;

      // Extrair números de telefone para mentions
      const mentions = logs.flatMap(log => [
        log.adminJid,
        log.targetJid
      ]);

      await sendSuccessReact();
      await sendReply(message, mentions);
      return;
    }

    // ========== LIMPAR LOGS ==========
    if (action === "limpar" || action === "clear" || action === "apagar") {
      const logs = await getX9Logs(remoteJid);
      
      if (!logs || logs.length === 0) {
        throw new WarningError("⚠️ Não há histórico para limpar!");
      }

      await clearX9Logs(remoteJid);
      await sendSuccessReact();
      await sendReply(
        `✅ *Histórico Limpo!*\n\n` +
        `🗑️ Todos os registros foram apagados.\n` +
        `📝 O monitor continua ativo e registrará novas ações.`
      );
      return;
    }

    // Comando não reconhecido
    throw new InvalidParameterError(
      `❌ *Comando não reconhecido!*\n\n` +
      `*Comandos válidos:*\n` +
      `• ${PREFIX}x9 1/0 - Ativar/Desativar\n` +
      `• ${PREFIX}x9 logs - Ver histórico\n` +
      `• ${PREFIX}x9 limpar - Limpar registros\n` +
      `• ${PREFIX}x9 debug - Ver informações técnicas`
    );
  },
};