/**
 * Sistema de gerenciamento de aluguéis de grupos
 * Suporta dias, horas e minutos
 * @author Adaptado para DeadBoT
 */
const fs = require("node:fs");
const path = require("node:path");

const ALUGUEIS_FILE = path.join(__dirname, "..", "..", "database", "alugueis.json");

function garantirArquivo() {
  const dir = path.dirname(ALUGUEIS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ALUGUEIS_FILE)) fs.writeFileSync(ALUGUEIS_FILE, JSON.stringify({}, null, 2), "utf-8");
}

function lerAlugueis() {
  try {
    garantirArquivo();
    return JSON.parse(fs.readFileSync(ALUGUEIS_FILE, "utf-8"));
  } catch (error) {
    return {};
  }
}

function salvarAlugueis(alugueis) {
  try {
    garantirArquivo();
    fs.writeFileSync(ALUGUEIS_FILE, JSON.stringify(alugueis, null, 2), "utf-8");
  } catch (error) {}
}

function gerarId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function calcularExpiracao(quantidade, tipo) {
  const agora = new Date();
  if (tipo === "minutos") agora.setMinutes(agora.getMinutes() + quantidade);
  else if (tipo === "horas") agora.setHours(agora.getHours() + quantidade);
  else agora.setDate(agora.getDate() + quantidade);
  return agora;
}

function formatarData(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');
  const segundo = String(data.getSeconds()).padStart(2, '0');
  return `${dia}/${mes}/${ano}, ${hora}:${minuto}:${segundo}`;
}

function formatarDuracao(quantidade, tipo) {
  if (tipo === "minutos") {
    const horas = Math.floor(quantidade / 60);
    const mins = quantidade % 60;
    return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  } else if (tipo === "horas") {
    return `${String(quantidade).padStart(2, '0')}:00`;
  }
  return `${quantidade} dias`;
}

function calcularTempoRestante(expiraTimestamp) {
  const agora = Date.now();
  const diferenca = expiraTimestamp - agora;
  if (diferenca <= 0) return "EXPIRADO";
  const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
  if (dias > 0) return `${dias} dia${dias !== 1 ? 's' : ''}`;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

exports.registrarAluguel = function(groupId, quantidade, tipo, nomeGrupo = "Grupo sem nome") {
  const alugueis = lerAlugueis();
  const id = gerarId();
  const dataExpiracao = calcularExpiracao(quantidade, tipo);
  alugueis[groupId] = {
    id, groupId, nomeGrupo, quantidade, tipo,
    duracao: formatarDuracao(quantidade, tipo),
    expira: formatarData(dataExpiracao),
    expiraTimestamp: dataExpiracao.getTime(),
    registradoEm: new Date().toISOString(),
    ativo: true,
  };
  salvarAlugueis(alugueis);
  return alugueis[groupId];
};

exports.listarAlugueis = function() {
  return lerAlugueis();
};

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

exports.verificarExpirados = function() {
  const alugueis = lerAlugueis();
  const agora = Date.now();
  const expirados = [];
  for (const groupId in alugueis) {
    if (alugueis[groupId].expiraTimestamp <= agora) {
      expirados.push({ groupId, ...alugueis[groupId] });
    }
  }
  return expirados;
};

exports.removerAluguelExpirado = function(groupId) {
  const alugueis = lerAlugueis();
  if (alugueis[groupId]) {
    delete alugueis[groupId];
    salvarAlugueis(alugueis);
    return true;
  }
  return false;
};

exports.temAluguelAtivo = function(groupId) {
  const alugueis = lerAlugueis();
  if (!alugueis[groupId]) return false;
  return alugueis[groupId].expiraTimestamp > Date.now();
};

exports.obterAluguelDoGrupo = function(groupId) {
  return lerAlugueis()[groupId] || null;
};

exports.calcularTempoRestante = calcularTempoRestante;
exports.formatarDuracao = formatarDuracao;
exports.formatarData = formatarData;
