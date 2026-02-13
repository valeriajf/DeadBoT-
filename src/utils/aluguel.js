/**
 * Sistema de gerenciamento de aluguéis de grupos
 * Funções para registrar, listar e apagar aluguéis
 * Suporta dias, horas e minutos
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
 * @param {number} quantidade - Quantidade de tempo
 * @param {string} tipo - Tipo: "dias", "horas" ou "minutos"
 * @returns {Date} Data de expiração
 */
function calcularExpiracao(quantidade, tipo) {
  const agora = new Date();
  
  if (tipo === "minutos") {
    agora.setMinutes(agora.getMinutes() + quantidade);
  } else if (tipo === "horas") {
    agora.setHours(agora.getHours() + quantidade);
  } else {
    // dias (padrão)
    agora.setDate(agora.getDate() + quantidade);
  }
  
  return agora;
}

/**
 * Formata uma data para exibição
 * @param {Date} data - Data a ser formatada
 * @returns {string} Data formatada (dd/mm/yyyy, hh:mm:ss)
 */
function formatarData(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');
  const segundo = String(data.getSeconds()).padStart(2, '0');
  
  return `${dia}/${mes}/${ano}, ${hora}:${minuto}:${segundo}`;
}

/**
 * Formata a duração para exibição
 * @param {number} quantidade - Quantidade de tempo
 * @param {string} tipo - Tipo: "dias", "horas" ou "minutos"
 * @returns {string} Duração formatada
 */
function formatarDuracao(quantidade, tipo) {
  if (tipo === "minutos") {
    const horas = Math.floor(quantidade / 60);
    const mins = quantidade % 60;
    return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  } else if (tipo === "horas") {
    return `${String(quantidade).padStart(2, '0')}:00`;
  } else {
    // dias
    return `${quantidade} ${quantidade === 1 ? 'dia' : 'dias'}`;
  }
}

/**
 * Registra um novo aluguel para um grupo
 * @param {string} groupId - ID do grupo
 * @param {number} quantidade - Quantidade de tempo
 * @param {string} tipo - Tipo: "dias", "horas" ou "minutos"
 * @param {string} nomeGrupo - Nome do grupo
 * @returns {Object} Dados do aluguel registrado
 */
exports.registrarAluguel = function(groupId, quantidade, tipo, nomeGrupo = "Grupo sem nome") {
  const alugueis = lerAlugueis();
  
  const id = gerarId();
  const dataExpiracao = calcularExpiracao(quantidade, tipo);
  const expiraFormatado = formatarData(dataExpiracao);
  const duracaoFormatada = formatarDuracao(quantidade, tipo);
  
  const aluguel = {
    id,
    groupId,
    nomeGrupo,
    quantidade,
    tipo,
    duracao: duracaoFormatada,
    expira: expiraFormatado,
    expiraTimestamp: dataExpiracao.getTime(),
    registradoEm: new Date().toISOString(),
    ativo: true,
  };
  
  alugueis[groupId] = aluguel;
  salvarAlugueis(alugueis);
  
  return aluguel;
};

/**
 * Lista todos os aluguéis ativos
 * @returns {Object} Objeto com todos os aluguéis
 */
exports.listarAlugueis = function() {
  return lerAlugueis();
};

/**
 * Busca um aluguel pelo ID
 * @param {string} id - ID do aluguel
 * @returns {Object|null} Dados do aluguel ou null se não encontrado
 */
exports.buscarAluguelPorId = function(id) {
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
};

/**
 * Apaga um aluguel pelo ID
 * @param {string} id - ID do aluguel a ser apagado
 * @returns {boolean} true se apagou com sucesso, false se não encontrou
 */
exports.apagarAluguel = function(id) {
  const alugueis = lerAlugueis();
  
  for (const groupId in alugueis) {
    if (alugueis[groupId].id === id) {
      delete alugueis[groupId];
      salvarAlugueis(alugueis);
      return true;
    }
  }
  
  return false;
};

/**
 * Verifica aluguéis expirados e os remove
 * @returns {Array} Lista de grupos cujos aluguéis expiraram
 */
exports.verificarExpirados = function() {
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
};

/**
 * Verifica se um grupo possui aluguel ativo
 * @param {string} groupId - ID do grupo
 * @returns {boolean} true se tem aluguel ativo, false caso contrário
 */
exports.temAluguelAtivo = function(groupId) {
  const alugueis = lerAlugueis();
  
  if (!alugueis[groupId]) {
    return false;
  }
  
  // Verifica se não está expirado
  const aluguel = alugueis[groupId];
  const agora = Date.now();
  
  if (aluguel.expiraTimestamp <= agora) {
    return false;
  }
  
  return true;
};

/**
 * Obtém informações do aluguel de um grupo específico
 * @param {string} groupId - ID do grupo
 * @returns {Object|null} Dados do aluguel ou null se não encontrado
 */
exports.obterAluguelDoGrupo = function(groupId) {
  const alugueis = lerAlugueis();
  return alugueis[groupId] || null;
};

/**
 * Calcula o tempo restante formatado
 * @param {number} expiraTimestamp - Timestamp de expiração
 * @returns {string} Tempo restante formatado
 */
exports.calcularTempoRestante = function(expiraTimestamp) {
  const agora = Date.now();
  const diferenca = expiraTimestamp - agora;
  
  if (diferenca <= 0) {
    return "EXPIRADO";
  }
  
  const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
  
  if (dias > 0) {
    return `${dias} dia${dias > 1 ? 's' : ''}`;
  } else if (horas > 0) {
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
  } else {
    return `00:${String(minutos).padStart(2, '0')}`;
  }
};

/**
 * Calcula os dias restantes de um aluguel
 * @param {number} expiraTimestamp - Timestamp de expiração
 * @returns {number} Dias restantes (pode ser negativo se expirado)
 */
exports.calcularDiasRestantes = function(expiraTimestamp) {
  const agora = Date.now();
  const diferenca = expiraTimestamp - agora;
  const dias = Math.ceil(diferenca / (1000 * 60 * 60 * 24));
  return dias;
};

/**
 * Ativa ou desativa um aluguel
 * @param {string} groupId - ID do grupo
 * @param {boolean} ativo - true para ativar, false para desativar
 * @returns {boolean} true se alterou com sucesso, false se não encontrou
 */
exports.alterarStatusAluguel = function(groupId, ativo) {
  const alugueis = lerAlugueis();
  
  if (!alugueis[groupId]) {
    return false;
  }
  
  alugueis[groupId].ativo = ativo;
  salvarAlugueis(alugueis);
  
  return true;
};
