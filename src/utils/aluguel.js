/**
 * Sistema de gerenciamento de aluguéis de grupos
 * Funções para registrar, listar e apagar aluguéis
 * 
 * @author Adaptado para DeadBoT
 */
const fs = require("node:fs");
const path = require("node:path");

// Caminho do arquivo JSON que armazena os aluguéis
const ALUGUEIS_FILE = path.join(__dirname, "..", "..", "database", "alugueis.json");

/**
 * Garante que o diretório e arquivo de aluguéis existem
 */
function garantirArquivo() {
  const dir = path.dirname(ALUGUEIS_FILE);
  
  // Cria o diretório database se não existir
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Cria o arquivo se não existir
  if (!fs.existsSync(ALUGUEIS_FILE)) {
    fs.writeFileSync(ALUGUEIS_FILE, JSON.stringify({}, null, 2), "utf-8");
  }
}

/**
 * Lê os aluguéis do arquivo JSON
 * @returns {Object} Objeto com os aluguéis cadastrados
 */
function lerAlugueis() {
  try {
    garantirArquivo();
    const data = fs.readFileSync(ALUGUEIS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Erro ao ler aluguéis:", error);
    return {};
  }
}

/**
 * Salva os aluguéis no arquivo JSON
 * @param {Object} alugueis - Objeto com os aluguéis
 */
function salvarAlugueis(alugueis) {
  try {
    garantirArquivo();
    fs.writeFileSync(ALUGUEIS_FILE, JSON.stringify(alugueis, null, 2), "utf-8");
  } catch (error) {
    console.error("Erro ao salvar aluguéis:", error);
  }
}

/**
 * Gera um ID único para o aluguel
 * @returns {string} ID gerado
 */
function gerarId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Calcula a data de expiração do aluguel
 * @param {number} tempo - Quantidade de tempo
 * @param {string} tipo - Tipo do tempo (dias, horas ou minutos)
 * @returns {Date} Data de expiração
 */
function calcularExpiracao(tempo, tipo) {
  const agora = new Date();
  if (tipo === "dias") {
    agora.setDate(agora.getDate() + tempo);
  } else if (tipo === "horas") {
    agora.setHours(agora.getHours() + tempo);
  } else if (tipo === "minutos") {
    agora.setMinutes(agora.getMinutes() + tempo);
  }
  return agora;
}

/**
 * Formata uma data para exibição
 * @param {Date} data - Data a ser formatada
 * @returns {string} Data formatada
 */
function formatarData(data) {
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Formata a duração de forma legível
 * @param {number} tempo - Quantidade de tempo
 * @param {string} tipo - Tipo do tempo
 * @returns {string} Duração formatada
 */
function formatarDuracao(tempo, tipo) {
  if (tipo === "minutos") {
    if (tempo >= 60) {
      const horas = Math.floor(tempo / 60);
      const mins = tempo % 60;
      if (mins > 0) {
        return `${horas}h ${mins}min`;
      }
      return `${horas} hora${horas > 1 ? 's' : ''}`;
    }
    return `${tempo} minuto${tempo > 1 ? 's' : ''}`;
  }
  return `${tempo} ${tipo}`;
}

/**
 * Registra um novo aluguel para um grupo
 * @param {string} groupId - ID do grupo
 * @param {number} tempo - Quantidade de tempo
 * @param {string} tipo - Tipo do tempo (dias, horas ou minutos)
 * @returns {Object} Dados do aluguel registrado
 */
function registrarAluguel(groupId, tempo, tipo) {
  const alugueis = lerAlugueis();
  
  const id = gerarId();
  const dataExpiracao = calcularExpiracao(tempo, tipo);
  const expiraFormatado = formatarData(dataExpiracao);
  const duracao = formatarDuracao(tempo, tipo);
  
  const aluguel = {
    id,
    groupId,
    duracao,
    expira: expiraFormatado,
    expiraTimestamp: dataExpiracao.getTime(),
    registradoEm: new Date().toISOString(),
  };
  
  alugueis[groupId] = aluguel;
  salvarAlugueis(alugueis);
  
  return aluguel;
}

/**
 * Lista todos os aluguéis ativos
 * @returns {Object} Objeto com todos os aluguéis
 */
function listarAlugueis() {
  return lerAlugueis();
}

/**
 * Busca um aluguel pelo ID
 * @param {string} id - ID do aluguel
 * @returns {Object|null} Dados do aluguel ou null se não encontrado
 */
function buscarAluguelPorId(id) {
  const alugueis = lerAlugueis();
  
  for (const groupId in alugueis) {
    if (alugueis[groupId].id === id) {
      return {
        groupId,
        ...alugueis[groupId],
      };
    }
  }
  
  return null;
}

/**
 * Apaga um aluguel pelo ID
 * @param {string} id - ID do aluguel a ser apagado
 * @returns {boolean} true se apagou com sucesso, false se não encontrou
 */
function apagarAluguel(id) {
  const alugueis = lerAlugueis();
  
  for (const groupId in alugueis) {
    if (alugueis[groupId].id === id) {
      delete alugueis[groupId];
      salvarAlugueis(alugueis);
      return true;
    }
  }
  
  return false;
}

/**
 * Verifica aluguéis expirados e os remove
 * @returns {Array} Lista de grupos cujos aluguéis expiraram
 */
function verificarExpirados() {
  const alugueis = lerAlugueis();
  const agora = Date.now();
  const expirados = [];
  
  for (const groupId in alugueis) {
    const aluguel = alugueis[groupId];
    if (aluguel.expiraTimestamp <= agora) {
      expirados.push({
        groupId,
        ...aluguel,
      });
      delete alugueis[groupId];
    }
  }
  
  if (expirados.length > 0) {
    salvarAlugueis(alugueis);
  }
  
  return expirados;
}

/**
 * Verifica se um grupo possui aluguel ativo
 * @param {string} groupId - ID do grupo
 * @returns {boolean} true se tem aluguel ativo, false caso contrário
 */
function temAluguelAtivo(groupId) {
  const alugueis = lerAlugueis();
  return groupId in alugueis;
}

/**
 * Obtém informações do aluguel de um grupo específico
 * @param {string} groupId - ID do grupo
 * @returns {Object|null} Dados do aluguel ou null se não encontrado
 */
function obterAluguelDoGrupo(groupId) {
  const alugueis = lerAlugueis();
  return alugueis[groupId] || null;
}

/**
 * Renova um aluguel existente (adiciona mais tempo)
 * @param {string} id - ID do aluguel
 * @param {number} tempo - Quantidade de tempo adicional
 * @param {string} tipo - Tipo do tempo (dias, horas ou minutos)
 * @returns {Object|null} Dados do aluguel renovado ou null se não encontrado
 */
function renovarAluguel(id, tempo, tipo) {
  const alugueis = lerAlugueis();
  
  for (const groupId in alugueis) {
    if (alugueis[groupId].id === id) {
      const aluguelAtual = alugueis[groupId];
      const dataAtual = new Date(aluguelAtual.expiraTimestamp);
      
      // Adiciona tempo à data de expiração atual
      if (tipo === "dias") {
        dataAtual.setDate(dataAtual.getDate() + tempo);
      } else if (tipo === "horas") {
        dataAtual.setHours(dataAtual.getHours() + tempo);
      } else if (tipo === "minutos") {
        dataAtual.setMinutes(dataAtual.getMinutes() + tempo);
      }
      
      aluguelAtual.expira = formatarData(dataAtual);
      aluguelAtual.expiraTimestamp = dataAtual.getTime();
      aluguelAtual.renovadoEm = new Date().toISOString();
      
      alugueis[groupId] = aluguelAtual;
      salvarAlugueis(alugueis);
      
      return aluguelAtual;
    }
  }
  
  return null;
}

module.exports = {
  registrarAluguel,
  listarAlugueis,
  apagarAluguel,
  buscarAluguelPorId,
  verificarExpirados,
  temAluguelAtivo,
  obterAluguelDoGrupo,
  renovarAluguel,
};