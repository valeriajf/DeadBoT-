// 📁 src/commands/member/duelos.js
// Sistema de agendamento de duelos 1v1 com notificações automáticas

const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const path = require("path");
const fs = require("fs");

// ================== CONFIGURAÇÃO ==================
const DUELOS_DB_PATH = path.join(BASE_DIR, "..", "database", "duelos-agendados.json");

// ================== FUNÇÕES DE DATABASE ==================

function loadDuelos() {
  try {
    if (!fs.existsSync(DUELOS_DB_PATH)) {
      fs.writeFileSync(DUELOS_DB_PATH, JSON.stringify({}), "utf8");
      return {};
    }
    const data = fs.readFileSync(DUELOS_DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Erro ao carregar duelos:", error);
    return {};
  }
}

function saveDuelos(duelos) {
  try {
    fs.writeFileSync(DUELOS_DB_PATH, JSON.stringify(duelos, null, 2), "utf8");
  } catch (error) {
    console.error("Erro ao salvar duelos:", error);
  }
}

function limparDuelosAntigos() {
  try {
    const duelos = loadDuelos();
    const agora = new Date();
    let removidos = 0;

    for (const [chave, duelo] of Object.entries(duelos)) {
      const criadoEm = new Date(duelo.criadoEm);
      const diferencaHoras = (agora - criadoEm) / (1000 * 60 * 60);
      
      if (diferencaHoras > 24) {
        delete duelos[chave];
        removidos++;
      }
    }

    if (removidos > 0) {
      saveDuelos(duelos);
    }
  } catch (error) {
    console.error("Erro na limpeza:", error);
  }
}

// ================== SISTEMA DE NOTIFICAÇÕES ==================

let intervalosNotificacao = {};

function iniciarNotificacoes(socket) {
  Object.values(intervalosNotificacao).forEach(interval => clearInterval(interval));
  intervalosNotificacao = {};

  const intervalo = setInterval(() => {
    verificarNotificacoes(socket);
  }, 60000); // 60 segundos

  intervalosNotificacao.principal = intervalo;
}

async function verificarNotificacoes(socket) {
  try {
    // Verificar se socket está conectado
    if (!socket || !socket.user) {
      console.log("[NOTIFICAÇÕES] ❌ Socket desconectado, pulando verificação...");
      return;
    }
    
    const duelos = loadDuelos();
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
    const dataAtual = agora.toLocaleDateString("pt-BR");
    
    console.log(`[NOTIFICAÇÕES] ⏰ Verificando às ${horaAtual} do dia ${dataAtual}`);

    let duelosProcessados = 0;
    for (const [chave, duelo] of Object.entries(duelos)) {
      // Pular duelos de outras datas (sem log)
      if (duelo.data !== dataAtual) continue;
      
      // Pular duelos incompletos
      if (duelo.participantes.length !== 2) {
        console.log(`[NOTIFICAÇÕES] ⏳ Duelo ${duelo.horario} aguardando participantes (${duelo.participantes.length}/2)`);
        continue;
      }
      
      // Pular duelos já finalizados
      if (duelo.notificado) continue;

      duelosProcessados++;

      const [horaDuelo, minutoDuelo] = duelo.horario.split(":").map(Number);
      const [horaAgora, minutoAgora] = horaAtual.split(":").map(Number);
      
      const minutosDuelo = horaDuelo * 60 + minutoDuelo;
      const minutosAgora = horaAgora * 60 + minutoAgora;
      const diferencaMinutos = minutosDuelo - minutosAgora;

      console.log(`[NOTIFICAÇÕES] 📊 Duelo ${duelo.horario}: ${diferencaMinutos} minutos`);

      // Marcar duelos que já passaram
      if (diferencaMinutos < 0) {
        console.log(`[NOTIFICAÇÕES] ⚠️ Duelo ${duelo.horario} já passou. Marcando como finalizado.`);
        duelo.notificado = true;
        duelo.notificado10min = true;
        duelo.notificado5min = true;
        saveDuelos(duelos);
        continue;
      }

      let notificacaoEnviada = false;

      // Notificação tardia (recuperação)
      if (diferencaMinutos < 10 && !duelo.notificado10min && !duelo.notificado5min && !duelo.notificado) {
        console.log(`[NOTIFICAÇÕES] 🔔 AVISO TARDIO: Duelo ${duelo.horario} (faltam ${diferencaMinutos} min)`);
        const sucesso = await enviarNotificacao(socket, duelo, `⚠️ *ATENÇÃO!* Seu duelo começa em *${diferencaMinutos} minutos*! ⚔️`);
        if (sucesso) {
          duelo.notificado10min = true;
          duelo.notificado5min = true;
          notificacaoEnviada = true;
        }
      }

      // Notificação 10 minutos antes
      if (diferencaMinutos === 10 && !duelo.notificado10min) {
        console.log(`[NOTIFICAÇÕES] 🔔 Enviando aviso de 10 minutos`);
        const sucesso = await enviarNotificacao(socket, duelo, "⏰ *ATENÇÃO!* Seu duelo começa em *10 minutos*! ⚔️");
        if (sucesso) {
          duelo.notificado10min = true;
          notificacaoEnviada = true;
        }
      }

      // Notificação 5 minutos antes
      if (diferencaMinutos === 5 && !duelo.notificado5min) {
        console.log(`[NOTIFICAÇÕES] 🔔 Enviando aviso de 5 minutos`);
        const sucesso = await enviarNotificacao(socket, duelo, "🔥 *ATENÇÃO!* Seu duelo começa em *5 minutos*! Preparem-se! ⚔️");
        if (sucesso) {
          duelo.notificado5min = true;
          notificacaoEnviada = true;
        }
      }

      // Notificação na hora exata
      if (diferencaMinutos === 0 && !duelo.notificado) {
        console.log(`[NOTIFICAÇÕES] 🔔 Enviando aviso de INÍCIO`);
        const sucesso = await enviarNotificacao(socket, duelo, "⚔️ *AGORA!* O duelo começou! Que vença o melhor! 🔥");
        if (sucesso) {
          duelo.notificado = true;
          notificacaoEnviada = true;
        }
      }

      if (notificacaoEnviada) {
        saveDuelos(duelos);
      }
    }
    
    if (duelosProcessados > 0) {
      console.log(`[NOTIFICAÇÕES] 📋 ${duelosProcessados} duelo(s) ativo(s) hoje\n`);
    }
  } catch (error) {
    console.error("[NOTIFICAÇÕES] ❌ Erro ao verificar:", error.message);
  }
}

async function enviarNotificacao(socket, duelo, mensagem) {
  try {
    const mentions = duelo.participantes.map(p => p.jid);
    const mentionText = duelo.participantes.map(p => `@${p.numero}`).join(" vs ");
    
    if (!socket || !socket.user) {
      return false;
    }
    
    // Tentar enviar com retry automático
    let tentativas = 0;
    const maxTentativas = 3;
    
    while (tentativas < maxTentativas) {
      try {
        await socket.sendMessage(duelo.grupoJid, {
          text: `${mensagem}\n\n🥊 *${mentionText}*\n⏰ Horário: *${duelo.horario}*`,
          mentions: mentions,
        });
        
        console.log(`[NOTIFICAÇÕES] ✅ Notificação enviada com sucesso!`);
        return true;
      } catch (error) {
        tentativas++;
        
        if (!error.message.includes("Connection Closed") && error.output?.statusCode !== 428) {
          throw error;
        }
        
        if (tentativas < maxTentativas) {
          console.log(`[NOTIFICAÇÕES] 🔄 Tentativa ${tentativas}/${maxTentativas} falhou, aguardando...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    console.log(`[NOTIFICAÇÕES] ❌ Todas as tentativas falharam`);
    return false;
    
  } catch (error) {
    console.error("[NOTIFICAÇÕES] ❌ Erro crítico:", error.message);
    return false;
  }
}

// ================== MÓDULO PRINCIPAL ==================

module.exports = {
  name: "duelos",
  description: "Sistema de agendamento de duelos 1v1",
  commands: [
    "duelos", "duelo", "duelo-marcar", "duelo-listar", "duelo-remover", 
    "duelo-desafiar", "duelomarcar", "duelolistar", "dueloremover", "duelodesafiar"
  ],
  usage: `${PREFIX}duelo-marcar HH:MM\n${PREFIX}duelo-desafiar @usuario HH:MM\n${PREFIX}duelo-listar\n${PREFIX}duelo-remover HH:MM`,
  
  handle: async (props) => {
    try {
      const { commandName, socket } = props;
      
      if (!intervalosNotificacao.principal) {
        iniciarNotificacoes(socket);
      }

      limparDuelosAntigos();

      const comandoNormalizado = commandName.toLowerCase().replace(/-/g, "");
      
      switch(comandoNormalizado) {
        case "duelomarcar":
          await marcarDuelo(props);
          break;
        case "duelodesafiar":
          await desafiarUsuario(props);
          break;
        case "duelolistar":
          await listarDuelos(props);
          break;
        case "dueloremover":
          await removerDuelo(props);
          break;
        case "duelos":
        case "duelo":
          await mostrarAjuda(props);
          break;
        default:
          await mostrarAjuda(props);
      }
    } catch (error) {
      console.error("Erro no comando duelos:", error);
      
      if (props.sendErrorReply) {
        await props.sendErrorReply(`❌ Erro: ${error.message}`);
      }
    }
  },
};

// ================== COMANDOS ==================

async function marcarDuelo({ args, remoteJid, userJid, sendReply, sendSuccessReact }) {
  if (args.length === 0) {
    throw new InvalidParameterError(
      `❌ *Uso correto:*\n${PREFIX}duelo-marcar HH:MM\n\n` +
      `📌 *Exemplo:* ${PREFIX}duelo-marcar 20:30`
    );
  }

  const horario = args[0];
  
  const regexHorario = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!regexHorario.test(horario)) {
    throw new InvalidParameterError(
      "❌ *Formato de horário inválido!*\n\n" +
      "Use o formato *HH:MM*\n" +
      "📌 Exemplos: 14:30, 09:00, 20:45"
    );
  }

  const duelos = loadDuelos();
  const dataAtual = new Date().toLocaleDateString("pt-BR");
  const chaveDuelo = `${remoteJid}_${dataAtual}_${horario}`;
  const numeroUsuario = userJid.split("@")[0];
  const mentionUsuario = `@${numeroUsuario}`;

  if (duelos[chaveDuelo]) {
    const dueloExistente = duelos[chaveDuelo];
    
    if (dueloExistente.participantes.some(p => p.jid === userJid)) {
      throw new WarningError("⚠️ Você já está marcado para esse horário!");
    }

    if (dueloExistente.participantes.length >= 2) {
      throw new WarningError(
        "⚠️ *Duelo completo!*\n\n" +
        `O duelo das *${horario}* já tem 2 participantes.\n` +
        `Escolha outro horário ou use ${PREFIX}duelo-listar`
      );
    }

    dueloExistente.participantes.push({
      jid: userJid,
      numero: numeroUsuario,
    });
    
    saveDuelos(duelos);
    
    const adversario = dueloExistente.participantes[0];
    
    await sendSuccessReact();
    await sendReply(
      `⚔️ *DUELO CONFIRMADO!*\n\n` +
      `🥊 *@${adversario.numero} vs ${mentionUsuario}*\n` +
      `⏰ Horário: *${horario}*\n` +
      `🔔 Notificações: 10min antes, 5min antes e na hora\n` +
      `💀 Que vença o melhor!`,
      dueloExistente.participantes.map(p => p.jid)
    );
  } else {
    duelos[chaveDuelo] = {
      horario: horario,
      data: dataAtual,
      grupoJid: remoteJid,
      participantes: [{
        jid: userJid,
        numero: numeroUsuario,
      }],
      criadoEm: new Date().toISOString(),
      notificado: false,
      notificado10min: false,
      notificado5min: false,
    };
    
    saveDuelos(duelos);
    
    await sendSuccessReact();
    await sendReply(
      `⚔️ *Duelo aberto para ${horario}!*\n\n` +
      `${mentionUsuario} está aguardando um adversário! 🔥\n\n` +
      `👥 *Vagas:* 1/2\n` +
      `💡 Use *${PREFIX}duelo-marcar ${horario}* para aceitar!`,
      [userJid]
    );
  }
}

async function desafiarUsuario({ args, remoteJid, userJid, webMessage, fullMessage, sendReply, sendSuccessReact }) {
  const mentioned = webMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  
  if (mentioned.length === 0) {
    throw new InvalidParameterError(
      "❌ *Você precisa mencionar um usuário!*\n\n" +
      `📌 Use: ${PREFIX}duelo-desafiar @usuario HH:MM\n` +
      `📌 Exemplo: ${PREFIX}duelo-desafiar @5511999999999 20:30`
    );
  }

  const adversarioJid = mentioned[0];
  const adversarioNumero = adversarioJid.split("@")[0];
  
  const horarioMatch = fullMessage.match(/([0-1]?[0-9]|2[0-3]):([0-5][0-9])/);
  
  if (!horarioMatch) {
    throw new InvalidParameterError(
      `❌ *Uso correto:*\n${PREFIX}duelo-desafiar @usuario HH:MM\n\n` +
      `📌 *Exemplo:* ${PREFIX}duelo-desafiar @5511999999999 20:30`
    );
  }

  const horario = horarioMatch[0];

  if (adversarioJid === userJid) {
    throw new WarningError("⚠️ Você não pode desafiar a si mesmo!");
  }

  const duelos = loadDuelos();
  const dataAtual = new Date().toLocaleDateString("pt-BR");
  const chaveDuelo = `${remoteJid}_${dataAtual}_${horario}`;

  if (duelos[chaveDuelo]) {
    throw new WarningError(
      `⚠️ *Já existe um duelo para ${horario}!*\n\n` +
      `Use ${PREFIX}duelo-listar`
    );
  }

  const numeroUsuario = userJid.split("@")[0];

  duelos[chaveDuelo] = {
    horario: horario,
    data: dataAtual,
    grupoJid: remoteJid,
    participantes: [
      { jid: userJid, numero: numeroUsuario },
      { jid: adversarioJid, numero: adversarioNumero }
    ],
    criadoEm: new Date().toISOString(),
    notificado: false,
    notificado10min: false,
    notificado5min: false,
  };
  
  saveDuelos(duelos);
  
  await sendSuccessReact();
  await sendReply(
    `⚔️ *DESAFIO LANÇADO!*\n\n` +
    `🥊 *@${numeroUsuario} desafiou @${adversarioNumero}*\n` +
    `⏰ Horário: *${horario}*\n` +
    `🔔 Notificações: 10min antes, 5min antes e na hora\n` +
    `💀 Que vença o melhor!`,
    [userJid, adversarioJid]
  );
}

async function listarDuelos({ remoteJid, sendReply }) {
  const duelos = loadDuelos();
  const dataAtual = new Date().toLocaleDateString("pt-BR");
  
  const duelosDoGrupo = Object.entries(duelos)
    .filter(([chave]) => chave.startsWith(`${remoteJid}_${dataAtual}`))
    .map(([_, duelo]) => duelo)
    .sort((a, b) => a.horario.localeCompare(b.horario));

  if (duelosDoGrupo.length === 0) {
    await sendReply(
      "📋 *Nenhum duelo agendado para hoje.*\n\n" +
      `Use *${PREFIX}duelo-marcar HH:MM*\n` +
      `Ou *${PREFIX}duelo-desafiar @usuario HH:MM*`
    );
    return;
  }

  let resposta = "⚔️ *DUELOS AGENDADOS PARA HOJE* ⚔️\n\n";

  duelosDoGrupo.forEach((duelo) => {
    resposta += `🕐 *${duelo.horario}*\n`;
    
    if (duelo.participantes.length === 1) {
      resposta += `⏳ Aguardando adversário...\n`;
      resposta += `   • @${duelo.participantes[0].numero}\n`;
    } else {
      resposta += `🥊 @${duelo.participantes[0].numero} vs @${duelo.participantes[1].numero}\n`;
      resposta += `✅ Confirmado!\n`;
    }
    resposta += "\n";
  });

  resposta += `💡 ${PREFIX}duelo-remover HH:MM para cancelar`;

  const mentions = duelosDoGrupo.flatMap(d => d.participantes.map(p => p.jid));
  await sendReply(resposta, mentions);
}

async function removerDuelo({ args, remoteJid, userJid, sendSuccessReply }) {
  if (args.length === 0) {
    throw new InvalidParameterError(
      `❌ *Uso correto:*\n${PREFIX}duelo-remover HH:MM\n\n` +
      `📌 *Exemplo:* ${PREFIX}duelo-remover 20:30`
    );
  }

  const horario = args[0];
  const duelos = loadDuelos();
  const dataAtual = new Date().toLocaleDateString("pt-BR");
  const chaveDuelo = `${remoteJid}_${dataAtual}_${horario}`;

  if (!duelos[chaveDuelo]) {
    throw new WarningError("❌ Não há duelo para esse horário.");
  }

  const duelo = duelos[chaveDuelo];
  const indexParticipante = duelo.participantes.findIndex(p => p.jid === userJid);

  if (indexParticipante === -1) {
    throw new WarningError("⚠️ Você não está nesse duelo!");
  }

  duelo.participantes.splice(indexParticipante, 1);

  if (duelo.participantes.length === 0) {
    delete duelos[chaveDuelo];
    saveDuelos(duelos);
    await sendSuccessReply(`✅ Duelo das *${horario}* cancelado.`);
  } else {
    saveDuelos(duelos);
    const restante = duelo.participantes[0];
    await sendSuccessReply(
      `✅ Você saiu do duelo das *${horario}*.\n\n` +
      `⏳ @${restante.numero} aguarda novo adversário.`,
      [restante.jid]
    );
  }
}

async function mostrarAjuda({ sendReply, remoteJid, getGroupName }) {
  const nomeGrupo = await getGroupName(remoteJid);
  
  const ajuda = `⚔️ *SISTEMA DE DUELOS do ${nomeGrupo}* ⚔️

*📅 Agendar Duelos:*
• \`${PREFIX}duelo-marcar HH:MM\`
  Abre duelo aguardando adversário

• \`${PREFIX}duelo-desafiar @usuario HH:MM\`
  Desafia alguém diretamente

• \`${PREFIX}duelo-listar\`
  Mostra duelos agendados hoje

• \`${PREFIX}duelo-remover HH:MM\`
  Cancela sua participação

• \`${PREFIX}duelo-reset\` (apenas admins)
  Deleta todos os duelos

*🔥 Atenção:*
Contamos com a participação de vocês para assistir, analisar e votar em quem vocês acham que se saiu melhor na qualidade das respostas.
➖➖➖➖➖➖➖
*Não* vote por afinidade. Vote na melhor resposta ajudando a melhorar a qualidade dos duelos.

*📢 Notificações:*
   • 10 minutos antes do duelo
   • 5 minutos antes do duelo
   • Na hora exata do início`;
  
  await sendReply(ajuda);
}