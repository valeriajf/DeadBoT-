const { PREFIX } = require(`${BASE_DIR}/config`);
const fs = require('fs');
const path = require('path');

// Todos os JSONs de welcome apontando para src/database
const WELCOME_DBS = {
  welcome2: path.join(__dirname, '..', '..', 'database', 'welcome2.json'),
  welcome3: path.join(__dirname, '..', '..', 'database', 'welcome3.json'),
  welcome4: path.join(__dirname, '..', '..', 'database', 'welcome4.json'),
  welcome5: path.join(__dirname, '..', '..', 'database', 'welcome5.json'),
  welcome6: path.join(__dirname, '..', '..', 'database', 'welcome6.json'),
  welcome7: path.join(__dirname, '..', '..', 'database', 'welcome7.json'),
  welcome8: path.join(__dirname, '..', '..', 'database', 'welcome8.json'),
};

// welcome-groups.json agora também dentro de src/database
const WELCOME_GROUPS_PATH = path.join(
  __dirname,
  '..',
  '..',
  'database',
  'welcome-groups.json'
);

function loadJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return {};
  } catch {
    return {};
  }
}

const WELCOME_INFO = {
  welcome1: '📷 Foto do membro (padrão)',
  welcome2: '🖼️  Foto do membro (API)',
  welcome3: '🏘️  Foto do grupo',
  welcome4: '💬 Só texto',
  welcome5: '🎞️  GIF animado',
  welcome6: '🎬 Vídeo',
  welcome7: '🎞️  GIF + Áudio',
  welcome8: '📸 Foto definida pelo ADM',
};

module.exports = {
  name: "welcome-check",
  description: "Verifica qual sistema de boas-vindas está ativo no grupo.",
  commands: ["welcome-check", "bv-check", "check-bv"],
  usage: `${PREFIX}welcome-check`,

  handle: async ({ sendReply, remoteJid, getGroupName }) => {
    const groupName = await getGroupName();
    const actives = [];
    const configured = [];
    const inactive = [];

    // ===== welcome1 (welcome-groups.json)
    const wgData = loadJson(WELCOME_GROUPS_PATH);

    let w1Active = false;

    if (Array.isArray(wgData)) {
      w1Active = wgData.includes(remoteJid);
    } else {
      w1Active =
        wgData[remoteJid]?.active === true ||
        wgData[remoteJid] === true;
    }

    if (w1Active) {
      actives.push(`✅ *welcome1* — ${WELCOME_INFO.welcome1}`);
    } else {
      inactive.push(`❌ *welcome1* — ${WELCOME_INFO.welcome1}`);
    }

    // ===== welcome2 ao welcome8
    for (const [name, dbPath] of Object.entries(WELCOME_DBS)) {
      const data = loadJson(dbPath);
      const groupData = data[remoteJid];

      if (!groupData) {
        inactive.push(`❌ *${name}* — ${WELCOME_INFO[name]}`);
        continue;
      }

      const isActive = groupData.active === true;

      const extras = [];
      if (groupData.photoPath) extras.push('foto');
      if (groupData.videoPath) extras.push('vídeo');
      if (groupData.gifPath) extras.push('GIF');
      if (groupData.audioPath) extras.push('áudio');
      if (groupData.customMessage) extras.push('legenda personalizada');

      const extraStr = extras.length
        ? ` _(${extras.join(', ')})_`
        : '';

      if (isActive) {
        actives.push(
          `✅ *${name}* — ${WELCOME_INFO[name]}${extraStr}`
        );
      } else {
        configured.push(
          `⚙️ *${name}* — configurado mas desativado${extraStr}`
        );
      }
    }

    // ===== montar mensagem
    let msg = `🔍 *WELCOME CHECK*\n`;
    msg += `📌 Grupo: *${groupName}*\n`;
    msg += `─────────────────\n\n`;

    if (actives.length > 0) {
      msg += `*ATIVOS (${actives.length}):*\n`;
      msg += actives.join('\n') + '\n\n';
    } else {
      msg += `*Nenhum welcome ativo neste grupo.*\n\n`;
    }

    if (configured.length > 0) {
      msg += `*CONFIGURADOS MAS DESATIVADOS:*\n`;
      msg += configured.join('\n') + '\n\n';
    }

    if (inactive.length > 0) {
      msg += `*SEM CONFIGURAÇÃO:*\n`;
      msg += inactive.join('\n') + '\n';
    }

    msg += `\n─────────────────`;
    msg += `\n💡 Use *${PREFIX}welcome-reset* para limpar tudo.`;

    await sendReply(msg);
  },
};