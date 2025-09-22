const fs = require('fs');
const path = require('path');

/**
 * Carrega as figurinhas de ban do arquivo JSON
 * @returns {Array} Array com IDs das figurinhas de ban
 */
function loadBanStickers() {
  try {
    // Caminho relativo ao arquivo fig-ban.json na raiz do projeto
    const figBanPath = path.join(__dirname, '..', '..', 'fig-ban.json');
    
    if (!fs.existsSync(figBanPath)) {
      // Criar arquivo padrão se não existir
      const defaultData = { banStickers: [] };
      fs.writeFileSync(figBanPath, JSON.stringify(defaultData, null, 2), 'utf8');
      console.log('📁 [FIG-BAN] Arquivo fig-ban.json criado automaticamente');
      return [];
    }

    const fileContent = fs.readFileSync(figBanPath, 'utf8');
    const figBanData = JSON.parse(fileContent);
    
    const banStickers = figBanData.banStickers || [];
    
    if (banStickers.length > 0) {
      console.log(`🚫 [FIG-BAN] Carregadas ${banStickers.length} figurinha(s) de ban`);
    }
    
    return banStickers;
  } catch (error) {
    console.error('❌ [FIG-BAN] Erro ao carregar figurinhas de ban:', error.message);
    return [];
  }
}

/**
 * Salva uma nova figurinha de ban
 * @param {string} stickerID - ID da figurinha em formato numérico
 * @returns {boolean} True se salvou com sucesso, False se já existe ou erro
 */
function saveBanSticker(stickerID) {
  try {
    const figBanPath = path.join(__dirname, '..', '..', 'fig-ban.json');
    
    // Carrega dados existentes
    let figBanData = { banStickers: [] };
    if (fs.existsSync(figBanPath)) {
      const fileContent = fs.readFileSync(figBanPath, 'utf8');
      figBanData = JSON.parse(fileContent);
    }

    // Verifica se já existe
    if (figBanData.banStickers.includes(stickerID)) {
      return false; // Já existe
    }

    // Adiciona nova figurinha
    figBanData.banStickers.push(stickerID);
    
    // Salva no arquivo
    fs.writeFileSync(figBanPath, JSON.stringify(figBanData, null, 2), 'utf8');
    console.log(`✅ [FIG-BAN] Figurinha adicionada: ${stickerID.substring(0, 30)}...`);
    
    return true;
  } catch (error) {
    console.error('❌ [FIG-BAN] Erro ao salvar figurinha:', error.message);
    return false;
  }
}

/**
 * Remove uma figurinha de ban
 * @param {string} stickerID - ID da figurinha em formato numérico
 * @returns {boolean} True se removeu com sucesso, False se não existe ou erro
 */
function removeBanSticker(stickerID) {
  try {
    const figBanPath = path.join(__dirname, '..', '..', 'fig-ban.json');
    
    if (!fs.existsSync(figBanPath)) {
      return false; // Arquivo não existe
    }

    const fileContent = fs.readFileSync(figBanPath, 'utf8');
    const figBanData = JSON.parse(fileContent);
    
    const stickerIndex = figBanData.banStickers.indexOf(stickerID);
    
    if (stickerIndex === -1) {
      return false; // Figurinha não encontrada
    }

    // Remove a figurinha
    figBanData.banStickers.splice(stickerIndex, 1);
    
    // Salva no arquivo
    fs.writeFileSync(figBanPath, JSON.stringify(figBanData, null, 2), 'utf8');
    console.log(`🗑️ [FIG-BAN] Figurinha removida: ${stickerID.substring(0, 30)}...`);
    
    return true;
  } catch (error) {
    console.error('❌ [FIG-BAN] Erro ao remover figurinha:', error.message);
    return false;
  }
}

/**
 * Verifica se uma figurinha está na lista de ban
 * @param {string} stickerID - ID da figurinha em formato numérico
 * @returns {boolean} True se é figurinha de ban, False caso contrário
 */
function isBanSticker(stickerID) {
  try {
    const banStickers = loadBanStickers();
    return banStickers.includes(stickerID);
  } catch (error) {
    console.error('❌ [FIG-BAN] Erro ao verificar figurinha:', error.message);
    return false;
  }
}

/**
 * Retorna estatísticas das figurinhas de ban
 * @returns {Object} Objeto com estatísticas
 */
function getBanStickersStats() {
  try {
    const banStickers = loadBanStickers();
    return {
      total: banStickers.length,
      list: banStickers,
      isEmpty: banStickers.length === 0
    };
  } catch (error) {
    console.error('❌ [FIG-BAN] Erro ao obter estatísticas:', error.message);
    return {
      total: 0,
      list: [],
      isEmpty: true
    };
  }
}

module.exports = {
  loadBanStickers,
  saveBanSticker,
  removeBanSticker,
  isBanSticker,
  getBanStickersStats
};