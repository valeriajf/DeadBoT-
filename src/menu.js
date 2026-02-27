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

  return `╭━━⪩ 🎯  DEADBOT ACORDOU ⪨━━${readMore()}

 • 🤖 ${BOT_NAME}
 • 📅 Data: ${date.toLocaleDateString("pt-br")}
 • 🕒 Hora: ${date.toLocaleTimeString("pt-br")}
 • ⚡ Prefixo: ${prefix}
 • ⚙️ Versão: ${packageInfo.version}
 • 👑 Dona do BoT: VaLéria

╰━━─「🪐」─━━

╭━━⪩ DONO ⪨━━

 • ${prefix}anti-pv (1/0)
 • ${prefix}exec
 • ${prefix}get-id
 • ${prefix}off
 • ${prefix}on
 • ${prefix}resetar-agendamento-global
 • ${prefix}restart
 • ${prefix}set-menu-image
 • ${prefix}set-prefix
 • ${prefix}ver-agendamento-global
 • ${prefix}zerar-rank grupo
 • ${prefix}zerar-rank global 

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
 • ${prefix}blacklist-remover 
 • ${prefix}boasvindas-add
 • ${prefix}citar 
 • ${prefix}delete
 • ${prefix}delete-auto-responder
 • ${prefix}duelo-reset
 • ${prefix}enquete 
 • ${prefix}exit (1/0)
 • ${prefix}exit2 (1/0)
 • ${prefix}fechar
 • ${prefix}fig-tag 
 • ${prefix}get-hash
 • ${prefix}get-sticker
 • ${prefix}grupo-abrir (agendado)
 • ${prefix}grupo-fechar (agendado)
 • ${prefix}limpar
 • ${prefix}link-grupo
 • ${prefix}list-auto-responder
 • ${prefix}lista-negra-add
 • ${prefix}lista-negra-remover
 • ${prefix}mensagem-diaria (1/0)
 • ${prefix}mute
 • ${prefix}niver (1/0)
 • ${prefix}only-admin (1/0)
 • ${prefix}pack list
 • ${prefix}promover
 • ${prefix}rebaixar
 • ${prefix}regras
 • ${prefix}revelar
 • ${prefix}roleta-russa 
 • ${prefix}set-exit2 
 • ${prefix}set-nome-grupo
 • ${prefix}totag
 • ${prefix}unmute
 • ${prefix}x9 (1/0)
 • ${prefix}welcome (1/0)
 • ${prefix}welcome2 (1/0) Foto Usuário 
 • ${prefix}welcome3 (1/0) Foto Grupo 
 • ${prefix}welcome4 (1/0) Sem Foto 
 • ${prefix}welcome5 (1/0) Com Gif 
 • ${prefix}welcome6 (1/0) Com Vídeo 
 • ${prefix}welcome7 (1/0) Com Áudio 
 • ${prefix}welcome8 (1/0) Com IMG 

╰━━─「⭐」─━━

╭━━⪩ MEMBROS ⪨━━

 • ${prefix}afk
 • ${prefix}adms
 • ${prefix}attp
 • ${prefix}beck
 • ${prefix}brat
 • ${prefix}cep
 • ${prefix}criar-rank (aleatório)
 • ${prefix}denuncia
 • ${prefix}duelo
 • ${prefix}exemplos-de-mensagens
 • ${prefix}fake-chat
 • ${prefix}gerar-link
 • ${prefix}get-lid
 • ${prefix}google-search
 • ${prefix}lyrics
 • ${prefix}meu-lid
 • ${prefix}motivar
 • ${prefix}niver-delete
 • ${prefix}niver-listar
 • ${prefix}niver-meu
 • ${prefix}niver-reg
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
 • ${prefix}sorteio
 • ${prefix}sticker
 • ${prefix}to-gif
 • ${prefix}to-image
 • ${prefix}to-mp3
 • ${prefix}top
 • ${prefix}ttp
 • ${prefix}yt-search

╰━━─「🚀」─━━

╭━━⪩ BRINCADEIRAS ⪨━━

 • ${prefix}abracar
 • ${prefix}beijar
 • ${prefix}dado
 • ${prefix}dancar
 • ${prefix}driblar
 • ${prefix}duelar
 • ${prefix}gartic
 • ${prefix}jantar
 • ${prefix}lutar
 • ${prefix}palmas
 • ${prefix}quiz
 • ${prefix}socar
 • ${prefix}tapa

╰━━─「🎡」─━━

╭━━⪩ DOWNLOADS ⪨━━

 • ${prefix}facebook
 • ${prefix}instagram
 • ${prefix}pinterest 
 • ${prefix}play-audio
 • ${prefix}play-video
 • ${prefix}spotify
 • ${prefix}tik-tok
 • ${prefix}threads
 • ${prefix}twitter 
 • ${prefix}yt-mp3
 • ${prefix}yt-mp4

╰━━─「🎶」─━━`;

};