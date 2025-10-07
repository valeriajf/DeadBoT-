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

 • ${prefix}exec
 • ${prefix}get-id
 • ${prefix}off
 • ${prefix}on
 • ${prefix}saldo
 • ${prefix}set-menu-image
 • ${prefix}set-prefix
 • ${prefix}zerar-rank

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
 • ${prefix}anti-product (1/0)
 • ${prefix}anti-sticker (1/0)
 • ${prefix}anti-video (1/0)
 • ${prefix}auto-responder (1/0)
 • ${prefix}auto-sticker (1/0)
 • ${prefix}ban
 • ${prefix}delete
 • ${prefix}delete-auto-responder
 • ${prefix}exit (1/0)
 • ${prefix}fechar
 • ${prefix}fig-tag
 • ${prefix}get-sticker
 • ${prefix}hidetag
 • ${prefix}limpar
 • ${prefix}link-grupo
 • ${prefix}list-auto-responder
 • ${prefix}mute
 • ${prefix}niver 
 • ${prefix}only-admin (1/0)
 • ${prefix}promover
 • ${prefix}rebaixar
 • ${prefix}regras
 • ${prefix}revelar
 • ${prefix}roleta-russa 
 • ${prefix}set-name
 • ${prefix}totag (com img)
 • ${prefix}unmute
 • ${prefix}welcome (1/0)
 • ${prefix}welcome2 (1/0)
 

╰━━─「⭐」─━━

╭━━⪩ MEMBROS ⪨━━

 • ${prefix}afk
 • ${prefix}adms
 • ${prefix}attp
 • ${prefix}beck
 • ${prefix}cep
 • ${prefix}exemplos-de-mensagens
 • ${prefix}fake-chat
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
 • ${prefix}calvo
 • ${prefix}casal
 • ${prefix}corno
 • ${prefix}dado
 • ${prefix}gado
 • ${prefix}gay
 • ${prefix}golpe
 • ${prefix}jantar
 • ${prefix}lutar
 • ${prefix}matar
 • ${prefix}socar
 • ${prefix}superlike
 • ${prefix}tapa
 • ${prefix}tinder

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
