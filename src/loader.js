/**
 * Este script é responsável
 * por carregar os eventos
 * que serão escutados pelo
 * socket do WhatsApp.
 *
 * @author Dev Gui
 */
const { TIMEOUT_IN_MILLISECONDS_BY_EVENT } = require("./config");
const { onMessagesUpsert } = require("./middlewares/onMesssagesUpsert");
const { onGroupParticipantsUpdate } = require("./middlewares/onGroupParticipantsUpdate");
const { isActiveX9Monitor, addX9Log } = require("./utils/database");
const path = require("node:path");
const { errorLog } = require("./utils/logger");
const { badMacHandler } = require("./utils/badMacHandler");

exports.load = (socket) => {
  global.BASE_DIR = path.resolve(__dirname);
  const safeEventHandler = async (callback, data, eventName) => {
    try {
      await callback(data);
    } catch (error) {
      if (badMacHandler.handleError(error, eventName)) {
        return;
      }

      errorLog(`Erro ao processar evento ${eventName}: ${error.message}`);

      if (error.stack) {
        errorLog(`Stack trace: ${error.stack}`);
      }
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

  // Evento de participantes do grupo (X9 Monitor + Welcome/Exit)
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

  // ====================================
  // X9 MONITOR - Polling de solicitações pendentes
  // ====================================
  const pendingRequests = new Map();
  
  // Função para verificar mudanças nas solicitações
  async function checkPendingRequests() {
    try {
      // Busca todos os grupos onde X9 está ativo
      const path = require('path');
      const fs = require('fs');
      const dbPath = path.resolve(__dirname, '..', 'database', 'x9-monitor-groups.json');
      
      if (!fs.existsSync(dbPath)) return;
      
      const activeGroups = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      
      for (const groupId of activeGroups) {
        try {
          // Busca metadados do grupo
          const groupMetadata = await socket.groupMetadata(groupId);
          
          // Filtra solicitações pendentes
          const currentRequests = groupMetadata.participants
            .filter(p => p.admin === 'request_required')
            .map(p => p.id);
          
          // Compara com estado anterior
          const previousRequests = pendingRequests.get(groupId) || [];
          
          // Detecta rejeições (estava pendente, não está mais)
          const rejected = previousRequests.filter(jid => !currentRequests.includes(jid));
          
          if (rejected.length > 0) {
            console.log('[X9 POLLING] Rejeições detectadas:', rejected);
            
            // Processa cada rejeição
            for (const rejectedJid of rejected) {
              // Verifica se a pessoa realmente não entrou no grupo
              const memberExists = groupMetadata.participants.some(p => 
                p.id === rejectedJid && p.admin !== 'request_required'
              );
              
              if (memberExists) {
                console.log('[X9 POLLING] Pessoa foi aprovada, não rejeitada');
                continue;
              }
              
              const targetPhone = rejectedJid.split("@")[0];
              
              // Busca admins do grupo
              const admins = groupMetadata.participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => p.id);
              
              const adminJid = admins[0] || "Sistema";
              const adminPhone = adminJid !== "Sistema" ? adminJid.split("@")[0] : "Sistema";
              
              // Adiciona ao log
              await addX9Log(groupId, {
                adminJid,
                adminPhone,
                targetJid: rejectedJid,
                targetPhone,
                action: "reject",
                description: `@${adminPhone} rejeitou entrada de @${targetPhone}`
              });
              
              // Envia notificação
              await socket.sendMessage(groupId, {
                text: `🕵️ *ALERTA X9*\n\n` +
                      `❌ *Entrada rejeitada!*\n` +
                      `👤 Admin: @${adminPhone}\n` +
                      `🎯 Rejeitou: @${targetPhone}\n` +
                      `⏰ ${new Date().toLocaleTimeString('pt-BR')}`,
                mentions: [adminJid, rejectedJid]
              });
              
              console.log('[X9 POLLING] Notificação de rejeição enviada!');
            }
          }
          
          // Detecta novas solicitações (para debug)
          const newRequests = currentRequests.filter(jid => !previousRequests.includes(jid));
          if (newRequests.length > 0) {
            console.log('[X9 POLLING] Novas solicitações:', newRequests);
          }
          
          // Atualiza estado
          pendingRequests.set(groupId, currentRequests);
          
        } catch (error) {
          // Ignora erros silenciosamente (grupo pode não existir mais, etc)
        }
      }
    } catch (error) {
      console.error('[X9 POLLING] Erro geral:', error);
    }
  }
  
  // Verifica a cada 10 segundos
  const pollingInterval = setInterval(checkPendingRequests, 10000);
  
  // Faz primeira verificação após 5 segundos
  setTimeout(checkPendingRequests, 5000);
  
  console.log('[X9 POLLING] Sistema de monitoramento de rejeições iniciado (verifica a cada 10s)');

  process.on("uncaughtException", (error) => {
    if (badMacHandler.handleError(error, "uncaughtException")) {
      return;
    }
    errorLog(`Erro não capturado: ${error.message}`);
  });

  process.on("unhandledRejection", (reason) => {
    if (badMacHandler.handleError(reason, "unhandledRejection")) {
      return;
    }
    errorLog(`Promessa rejeitada não tratada: ${reason}`);
  });
};