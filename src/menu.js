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

 • ${prefix}anti-pv (1/0)
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
 • ${prefix}anti-flood (1/0)
 • ${prefix}anti-image (1/0)
 • ${prefix}anti-link (1/0)
 • ${prefix}anti-product (1/0)
 • ${prefix}anti-sticker (1/0)
 • ${prefix}anti-video (1/0)
 • ${prefix}auto-responder (1/0)
 • ${prefix}auto-sticker (1/0)
 • ${prefix}ban
 • ${prefix}banghost 
 • ${prefix}boasvindas-add
 • ${prefix}delete
 • ${prefix}delete-auto-responder
 • ${prefix}enquete 
 • ${prefix}exit (1/0)
 • ${prefix}fechar
 • ${prefix}get-sticker
 • ${prefix}limpar
 • ${prefix}link-grupo
 • ${prefix}list-auto-responder
 • ${prefix}lista-negra-add
 • ${prefix}lista-negra-remover
 • ${prefix}mute
 • ${prefix}notas
 • ${prefix}only-admin (1/0)
 • ${prefix}promover
 • ${prefix}rebaixar
 • ${prefix}regras
 • ${prefix}revelar
 • ${prefix}roleta-russa 
 • ${prefix}set-name
 • ${prefix}unmute
 • ${prefix}welcome (1/0)
 • ${prefix}welcome2 (1/0)
 • ${prefix}welcome3 (1/0)
 • ${prefix}zerar-rank
 

╰━━─「⭐」─━━

╭━━⪩ MEMBROS ⪨━━

 • ${prefix}afk
 • ${prefix}adms
 • ${prefix}attp
 • ${prefix}beck
 • ${prefix}brat
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
 • ${prefix}qc
 • ${prefix}qc2
 • ${prefix}rank-ativo
 • ${prefix}rank-inativo
 • ${prefix}raw-message
 • ${prefix}refresh
 • ${prefix}rename
 • ${prefix}sticker
 • ${prefix}to-image
 • ${prefix}ttp
 • ${prefix}yt-search

╰━━─「🚀」─━━

╭━━⪩ DOWNLOADS ⪨━━

 • ${prefix}facebook
 • ${prefix}instagram
 • ${prefix}play-audio
 • ${prefix}play-video
 • ${prefix}spot-dl
 • ${prefix}spotify 
 • ${prefix}tik-tok
 • ${prefix}twitter 
 • ${prefix}yt-mp3
 • ${prefix}yt-mp4

╰━━─「🎶」─━━`;
};