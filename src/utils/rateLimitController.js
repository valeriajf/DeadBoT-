/**
 * Sistema de Controle de Rate Limit Global para DeadBoT
 * 
 * Este módulo controla globalmente todas as operações do bot
 * para evitar rate limit do WhatsApp.
 * 
 * 
 * @author VaL
 */

// Configurações
const CONFIG = {
    MAX_OPERATIONS_PER_MINUTE: 20, // Máximo de operações por minuto
    MIN_DELAY_BETWEEN_OPS: 1000,   // Delay mínimo entre operações (1 segundo)
    COOLDOWN_ON_ERROR: 30000,      // Cooldown de 30s se detectar rate limit
};

// Controle de operações
let operationQueue = [];
let operationCount = 0;
let lastOperationTime = 0;
let lastResetTime = Date.now();
let isInCooldown = false;
let cooldownUntil = 0;

/**
 * Verifica se está em cooldown
 */
function isInCooldownMode() {
    if (isInCooldown && Date.now() < cooldownUntil) {
        return true;
    }
    if (isInCooldown && Date.now() >= cooldownUntil) {
        isInCooldown = false;
        console.log('✅ [RATE LIMIT] Cooldown finalizado, operações normalizadas');
    }
    return false;
}

/**
 * Ativa modo cooldown
 */
function activateCooldown() {
    isInCooldown = true;
    cooldownUntil = Date.now() + CONFIG.COOLDOWN_ON_ERROR;
    console.log(`⚠️ [RATE LIMIT] Modo cooldown ativado por ${CONFIG.COOLDOWN_ON_ERROR/1000}s`);
}

/**
 * Reseta contador a cada minuto
 */
function resetCounterIfNeeded() {
    const now = Date.now();
    if (now - lastResetTime >= 60000) {
        operationCount = 0;
        lastResetTime = now;
        console.log('🔄 [RATE LIMIT] Contador resetado');
    }
}

/**
 * Verifica se pode executar operação
 */
async function canExecuteOperation() {
    // Se está em cooldown, bloqueia
    if (isInCooldownMode()) {
        const remainingTime = Math.ceil((cooldownUntil - Date.now()) / 1000);
        console.log(`⏸️ [RATE LIMIT] Em cooldown. Aguarde ${remainingTime}s`);
        return false;
    }

    resetCounterIfNeeded();

    // Verifica limite de operações por minuto
    if (operationCount >= CONFIG.MAX_OPERATIONS_PER_MINUTE) {
        console.log('⚠️ [RATE LIMIT] Limite de operações por minuto atingido');
        return false;
    }

    // Verifica delay mínimo entre operações
    const now = Date.now();
    const timeSinceLastOp = now - lastOperationTime;
    
    if (timeSinceLastOp < CONFIG.MIN_DELAY_BETWEEN_OPS) {
        const waitTime = CONFIG.MIN_DELAY_BETWEEN_OPS - timeSinceLastOp;
        console.log(`⏳ [RATE LIMIT] Aguardando ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    return true;
}

/**
 * Registra uma operação
 */
function registerOperation() {
    operationCount++;
    lastOperationTime = Date.now();
}

/**
 * Executa uma operação com controle de rate limit
 * 
 * @param {Function} operation - Função assíncrona a ser executada
 * @param {string} operationName - Nome da operação para logs
 * @returns {Promise<any>} Resultado da operação ou null se bloqueado
 */
async function executeWithRateLimit(operation, operationName = 'Operação') {
    try {
        // Verifica se pode executar
        const canExecute = await canExecuteOperation();
        
        if (!canExecute) {
            console.log(`❌ [RATE LIMIT] ${operationName} bloqueada`);
            return null;
        }

        // Registra a operação
        registerOperation();

        // Executa a operação
        const result = await operation();
        
        return result;

    } catch (error) {
        // Se for erro de rate limit, ativa cooldown
        if (error.message?.includes('rate-overlimit') || error.data === 429) {
            console.error(`🚨 [RATE LIMIT] Rate limit detectado em: ${operationName}`);
            activateCooldown();
        }
        
        throw error;
    }
}

/**
 * Obtém estatísticas do rate limit
 */
function getStats() {
    return {
        operationsThisMinute: operationCount,
        maxOperationsPerMinute: CONFIG.MAX_OPERATIONS_PER_MINUTE,
        isInCooldown: isInCooldown,
        cooldownRemaining: isInCooldown ? Math.ceil((cooldownUntil - Date.now()) / 1000) : 0,
        lastOperation: lastOperationTime > 0 ? new Date(lastOperationTime).toLocaleTimeString('pt-BR') : 'Nenhuma'
    };
}

/**
 * Comando para verificar status do rate limit
 */
function getStatusMessage() {
    const stats = getStats();
    const percentage = Math.round((stats.operationsThisMinute / stats.maxOperationsPerMinute) * 100);
    
    let status = '📊 *Status do Rate Limit*\n\n';
    status += `📈 Operações: ${stats.operationsThisMinute}/${stats.maxOperationsPerMinute} (${percentage}%)\n`;
    status += `⏱️ Última operação: ${stats.lastOperation}\n`;
    
    if (stats.isInCooldown) {
        status += `\n⚠️ *MODO COOLDOWN ATIVO*\n`;
        status += `⏳ Tempo restante: ${stats.cooldownRemaining}s\n`;
    } else {
        status += `\n✅ Sistema operando normalmente`;
    }
    
    return status;
}

/**
 * Força reset do sistema (emergência)
 */
function forceReset() {
    operationCount = 0;
    lastResetTime = Date.now();
    isInCooldown = false;
    cooldownUntil = 0;
    console.log('🔄 [RATE LIMIT] Sistema resetado manualmente');
}

module.exports = {
    executeWithRateLimit,
    getStats,
    getStatusMessage,
    forceReset,
    activateCooldown
};