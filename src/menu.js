/**
 * Menu do bot
 *
 * @author Dev Gui
 */
const { BOT_NAME } = require("./config");
const packageInfo = require("../package.json");
const { readMore } = require("./utils");
const { getPrefix } = require("./utils/database");

exports.menuMessage = (groupJid) => {
  const date = new Date();

  const prefix = getPrefix(groupJid);

  return `╭━━⪩ BEM VINDO! ⪨━━${readMore()}

 • ${BOT_NAME}
 • Data: ${date.toLocaleDateString("pt-br")}
 • Hora: ${date.toLocaleTimeString("pt-br")}
 • Prefixo: ${prefix}
 • Versão: ${packageInfo.version}

╰━━─「🪐」─━━

╭━━⪩ DONO ⪨━━

 • ${prefix}aviso-geral
 • ${prefix}exec
 • ${prefix}get-id
 • ${prefix}off
 • ${prefix}on
 • ${prefix}set-menu-image
 • ${prefix}set-prefix

╰━━─「🌌」─━━

╭━━⪩ ADMINS ⪨━━

 • ${prefix}abrir
 • ${prefix}add-auto-responder
 • ${prefix}adv
 • ${prefix}adv-reset
 • ${prefix}agendar-mensagem
 • ${prefix}anti-audio (1/0)
 • ${prefix}anti-document (1/0)
 • ${prefix}anti-event (1/0)
 • ${prefix}anti-fake (1/0)
 • ${prefix}anti-flood (1/0)
 • ${prefix}anti-image (1/0)
 • ${prefix}anti-link (1/0)
 • ${prefix}anti-midia (1/0)
 • ${prefix}anti-product (1/0)
 • ${prefix}anti-sticker (1/0)
 • ${prefix}anti-video (1/0)
 • ${prefix}auto-responder (1/0)
 • ${prefix}ban
 • ${prefix}banghost 
 • ${prefix}delete
 • ${prefix}delete-auto-responder
 • ${prefix}exit (1/0)
 • ${prefix}fechar
 • ${prefix}fig-ban-add 
 • ${prefix}fig-ban-delete 
 • ${prefix}fig-tag
 • ${prefix}get-sticker
 • ${prefix}hidetag
 • ${prefix}limpar
 • ${prefix}link-grupo
 • ${prefix}list-auto-responder
 • ${prefix}listanegra-add
 • ${prefix}listanegra-remover 
 • ${prefix}mute
 • ${prefix}muteall 
 • ${prefix}only-admin (1/0)
 • ${prefix}promover
 • ${prefix}rebaixar
 • ${prefix}regras
 • ${prefix}revelar
 • ${prefix}roleta-russa 
 • ${prefix}set-name
 • ${prefix}unmute
 • ${prefix}unmuteall 
 • ${prefix}welcome (1/0)
 • ${prefix}zerar-rank

╰━━─「⭐」─━━

╭━━⪩ MEMBROS ⪨━━

 • ${prefix}afk
 • ${prefix}attp
 • ${prefix}cep
 • ${prefix}exemplos-de-mensagens
 • ${prefix}fake-chat
 • ${prefix}fumar
 • ${prefix}gerar-link
 • ${prefix}get-lid
 • ${prefix}google-search
 • ${prefix}motivar
 • ${prefix}parabens
 • ${prefix}perfil
 • ${prefix}ping
 • ${prefix}rank-ativo
 • ${prefix}rank-inativo
 • ${prefix}raw-message
 • ${prefix}rename
 • ${prefix}sticker
 • ${prefix}to-image
 • ${prefix}ttp
 • ${prefix}yt-search

╰━━─「🚀」─━━

╭━━⪩ DOWNLOADS ⪨━━

 • ${prefix}play-audio
 • ${prefix}play-video
 • ${prefix}tik-tok
 • ${prefix}yt-mp3
 • ${prefix}yt-mp4

╰━━─「🎶」─━━

╭━━⪩ BRINCADEIRAS ⪨━━

 • ${prefix}abracar
 • ${prefix}beijar
 • ${prefix}dado
 • ${prefix}jantar
 • ${prefix}lutar
 • ${prefix}matar
 • ${prefix}socar

╰━━─「🎡」─━━

╭━━⪩ IA ⪨━━

 • ${prefix}gemini
 • ${prefix}ia-sticker
 • ${prefix}pixart
 • ${prefix}stable-diffusion-turbo

╰━━─「🚀」─━━

╭━━⪩ CANVAS ⪨━━

 • ${prefix}blur
 • ${prefix}bolsonaro
 • ${prefix}cadeia
 • ${prefix}contraste
 • ${prefix}espelhar
 • ${prefix}gray
 • ${prefix}inverter
 • ${prefix}pixel
 • ${prefix}rip

╰━━─「❇」─━━`;
};
