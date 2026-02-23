/**
 * src/utils/niverDatabase.js
 *
 * Funções para gerenciar o banco de dados de aniversários.
 * Usa arquivos JSON na pasta database/, seguindo o padrão do Takeshi Bot.
 *
 * Arquivos utilizados:
 *   - database/birthdays.json         → Dados de aniversário de cada usuário
 *   - database/birthday-groups.json   → Grupos com sistema de aniversário ativo
 *   - database/birthday-greeted.json  → Controle de parabéns enviados no dia
 */

const fs = require("fs");
const path = require("path");
const { DATABASE_DIR } = require(`${BASE_DIR}/config`);

const BIRTHDAYS_FILE = path.join(DATABASE_DIR, "birthdays.json");
const BIRTHDAY_GROUPS_FILE = path.join(DATABASE_DIR, "birthday-groups.json");

// ─────────────────────────────────────────────────────────────────────────────
// Funções auxiliares internas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lê um arquivo JSON, retornando o valor padrão se não existir.
 * @param {string} filePath
 * @param {any} defaultValue
 * @returns {any}
 */
function readJson(filePath, defaultValue = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

/**
 * Escreve dados em um arquivo JSON.
 * @param {string} filePath
 * @param {any} data
 */
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ─────────────────────────────────────────────────────────────────────────────
// Funções públicas — Aniversários dos usuários
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna todos os aniversários registrados.
 * @returns {{ [jid: string]: { day: number, month: number, year: number } }}
 */
function getAllBirthdays() {
  return readJson(BIRTHDAYS_FILE, {});
}

/**
 * Retorna o aniversário de um usuário específico.
 * @param {string} userJid
 * @returns {{ day: number, month: number, year: number } | null}
 */
function getBirthday(userJid) {
  const data = readJson(BIRTHDAYS_FILE, {});
  return data[userJid] || null;
}

/**
 * Registra ou atualiza o aniversário de um usuário.
 * @param {string} userJid
 * @param {number} day
 * @param {number} month
 * @param {number} year
 */
function registerBirthday(userJid, day, month, year) {
  const data = readJson(BIRTHDAYS_FILE, {});
  data[userJid] = { day, month, year };
  writeJson(BIRTHDAYS_FILE, data);
}

/**
 * Exclui o aniversário de um usuário.
 * @param {string} userJid
 */
function deleteBirthday(userJid) {
  const data = readJson(BIRTHDAYS_FILE, {});
  delete data[userJid];
  writeJson(BIRTHDAYS_FILE, data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Funções públicas — Sistema de grupos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica se o sistema de aniversários está ativo em um grupo.
 * @param {string} groupJid
 * @returns {boolean}
 */
function isBirthdaySystemActive(groupJid) {
  const data = readJson(BIRTHDAY_GROUPS_FILE, []);
  return data.includes(groupJid);
}

/**
 * Ativa ou desativa o sistema de aniversários em um grupo.
 * @param {string} groupJid
 * @param {boolean} active
 */
function setBirthdaySystem(groupJid, active) {
  let data = readJson(BIRTHDAY_GROUPS_FILE, []);

  if (active) {
    if (!data.includes(groupJid)) {
      data.push(groupJid);
    }
  } else {
    data = data.filter((jid) => jid !== groupJid);
  }

  writeJson(BIRTHDAY_GROUPS_FILE, data);
}

/**
 * Retorna todos os grupos com o sistema de aniversários ativo.
 * @returns {string[]}
 */
function getActiveBirthdayGroups() {
  return readJson(BIRTHDAY_GROUPS_FILE, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// Funções públicas — Controle de "já parabenizado hoje"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna a chave do dia atual para controle de parabéns.
 * @returns {string}
 */
function getTodayKey() {
  const now = new Date();
  return `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
}

/**
 * Retorna os JIDs já parabenizados hoje no grupo.
 * @param {string} groupJid
 * @returns {string[]}
 */
function getGreetedTodayForGroup(groupJid) {
  const filePath = path.join(DATABASE_DIR, "birthday-greeted.json");
  const data = readJson(filePath, {});
  const today = getTodayKey();
  return (data[today] && data[today][groupJid]) || [];
}

/**
 * Marca um usuário como já parabenizado hoje em determinado grupo.
 * @param {string} groupJid
 * @param {string} userJid
 */
function markGreetedToday(groupJid, userJid) {
  const filePath = path.join(DATABASE_DIR, "birthday-greeted.json");
  const data = readJson(filePath, {});
  const today = getTodayKey();

  if (!data[today]) data[today] = {};
  if (!data[today][groupJid]) data[today][groupJid] = [];

  if (!data[today][groupJid].includes(userJid)) {
    data[today][groupJid].push(userJid);
  }

  // Limpar registros de dias anteriores para não acumular lixo
  for (const key of Object.keys(data)) {
    if (key !== today) {
      delete data[key];
    }
  }

  writeJson(filePath, data);
}

module.exports = {
  getAllBirthdays,
  getBirthday,
  registerBirthday,
  deleteBirthday,
  isBirthdaySystemActive,
  setBirthdaySystem,
  getActiveBirthdayGroups,
  getGreetedTodayForGroup,
  markGreetedToday,
};
