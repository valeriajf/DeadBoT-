/**
 * Comando de anotações e lembretes para o DeadBoT
 * Permite criar, listar e gerenciar notas
 * Comando disponível para todos os administradores
 * 
 * @author Dev VaL 
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const fs = require('fs');
const path = require('path');

const NOTAS_FILE = path.join(BASE_DIR, 'data', 'notas.json');

// Garantir que o diretório data existe
function ensureDataDir() {
  const dataDir = path.join(BASE_DIR, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Gerar próximo ID numérico
function getNextId(notas) {
  if (notas.length === 0) return 1;
  const ids = notas.map(n => n.id);
  return Math.max(...ids) + 1;
}

// Carregar notas do arquivo
function loadNotas() {
  try {
    ensureDataDir();
    if (!fs.existsSync(NOTAS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(NOTAS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Salvar notas no arquivo
function saveNotas(notas) {
  ensureDataDir();
  fs.writeFileSync(NOTAS_FILE, JSON.stringify(notas, null, 2));
}

// Formatar data no padrão brasileiro
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Extrair data do texto (formato DD/MM/YYYY)
function extractDate(text) {
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? match[0] : null;
}

// Verificar se uma data está vencida ou vence hoje
function checkVencimento(vencimento) {
  if (!vencimento) return null;
  
  const parts = vencimento.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!parts) return null;
  
  const dataVenc = new Date(parts[3], parts[2] - 1, parts[1]);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataVenc.setHours(0, 0, 0, 0);
  
  const diff = Math.floor((dataVenc - hoje) / (1000 * 60 * 60 * 24));
  
  if (diff < 0) return 'vencido';
  if (diff === 0) return 'hoje';
  if (diff <= 3) return 'proximo';
  return 'ok';
}

module.exports = {
  name: "notas",
  description: "Sistema de anotações e lembretes",
  commands: ["notas", "nota"],
  usage: `${PREFIX}notas <descrição> DD/MM/YYYY\n${PREFIX}notas listar\n${PREFIX}notas deletar <id>\n${PREFIX}notas limpar`,
  
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    args, 
    sendText 
  }) => {
    // Separar os argumentos corretamente
    const textoCompleto = args.length > 0 ? args[0] : '';
    const argsArray = textoCompleto.split(' ');
    const comando = argsArray[0]?.toLowerCase();
    
    // Verificar se tem argumentos
    if (!textoCompleto || textoCompleto.trim() === '') {
      await sendText(
        `📋 *SISTEMA DE NOTAS*\n\n` +
        `*Comandos disponíveis:*\n` +
        `• ${PREFIX}notas <descrição> DD/MM/YYYY - Criar nota\n` +
        `• ${PREFIX}notas listar - Listar notas\n` +
        `• ${PREFIX}notas deletar <id> - Deletar nota\n` +
        `• ${PREFIX}notas limpar - Limpar todas\n\n` +
        `💡 Exemplo: ${PREFIX}notas Aluguel Felipe 08/11/2025`
      );
      return;
    }
    
    // Listar notas
    if (comando === 'listar' || comando === 'lista' || comando === 'list') {
      const notas = loadNotas();
      
      if (notas.length === 0) {
        await sendText('📋 Nenhuma nota registrada ainda.');
        return;
      }
      
      let mensagem = '📋 *NOTAS REGISTRADAS*\n';
      mensagem += '━━━━━━━━━━━━━━━━━━━\n\n';
      
      for (const nota of notas) {
        const status = checkVencimento(nota.vencimento);
        let emoji = '📝';
        
        if (status === 'vencido') emoji = '🔴';
        else if (status === 'hoje') emoji = '🟡';
        else if (status === 'proximo') emoji = '🟠';
        
        mensagem += `${emoji} *ID*: ${nota.id}\n`;
        mensagem += `💬 ${nota.descricao}\n`;
        mensagem += `🗓️ Criada em: ${nota.abertura}\n`;
        if (nota.vencimento) {
          mensagem += `📆 Vencimento: ${nota.vencimento}\n`;
        }
        mensagem += '\n';
      }
      
      mensagem += '━━━━━━━━━━━━━━━━━━━\n';
      mensagem += `📊 Total: *${notas.length}* nota(s)`;
      
      await sendText(mensagem);
      return;
    }
    
    // Deletar nota
    if (comando === 'deletar' || comando === 'delete' || comando === 'del') {
      const id = argsArray[1];
      
      if (!id) {
        await sendText('❌ Você precisa informar o ID da nota!\n\nExemplo: `#notas deletar 1`');
        return;
      }
      
      let notas = loadNotas();
      const notaIndex = notas.findIndex(n => n.id === parseInt(id));
      
      if (notaIndex === -1) {
        await sendText('❌ Nota não encontrada! Verifique o ID.');
        return;
      }
      
      const notaDeletada = notas[notaIndex];
      notas.splice(notaIndex, 1);
      saveNotas(notas);
      
      await sendText(`🗑️ *Nota deletada com sucesso!*\n\n💬 ${notaDeletada.descricao}`);
      return;
    }
    
    // Limpar todas as notas
    if (comando === 'limpar' || comando === 'clear') {
      const notas = loadNotas();
      
      if (notas.length === 0) {
        await sendText('📋 Não há notas para limpar.');
        return;
      }
      
      const total = notas.length;
      saveNotas([]);
      await sendText(`🗑️ *Todas as notas foram deletadas!*\n\n📊 Total removido: *${total}* nota(s)`);
      return;
    }
    
    // Se chegou aqui, é para criar uma nova nota
    const vencimento = extractDate(textoCompleto);
    const descricao = vencimento ? textoCompleto.replace(vencimento, '').trim() : textoCompleto;
    
    const notas = loadNotas();
    
    const novaNota = {
      id: getNextId(notas),
      descricao,
      vencimento: vencimento || null,
      abertura: formatDate(new Date()),
      timestamp: Date.now()
    };
    
    notas.push(novaNota);
    saveNotas(notas);
    
    let mensagem = 
      `🤖 ✅ *#nota criada com sucesso!*\n\n` +
      `🆔 *ID*: ${novaNota.id}\n` +
      `💬 *Descrição*: ${novaNota.descricao}\n` +
      `🗓️ *Abertura*: ${novaNota.abertura}`;
    
    if (novaNota.vencimento) {
      mensagem += `\n📆 *Vencimento*: ${novaNota.vencimento}`;
    }
    
    await sendText(mensagem);
  },
};