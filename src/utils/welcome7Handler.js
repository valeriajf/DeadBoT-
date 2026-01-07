const fs = require("fs");
const {
  isActiveWelcome7Group,
  getWelcome7Gif,
  getWelcome7Audio,
  getWelcome7Caption,
} = require("./database");

async function handleWelcome7NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  pushname,
  sendGifFromFile,
  sendAudioFromFile,
  sendTextWithMention,
}) {
  try {
    if (!isActiveWelcome7Group(groupId)) return;

    const gifPath = getWelcome7Gif(groupId);
    const audioPath = getWelcome7Audio(groupId);
    const captionTemplate = getWelcome7Caption(groupId);

    if (!gifPath || !fs.existsSync(gifPath)) {
      console.log(`[WELCOME7] GIF não configurado para ${groupId}`);
      return;
    }

    if (!audioPath || !fs.existsSync(audioPath)) {
      console.log(`[WELCOME7] Áudio não configurado para ${groupId}`);
      return;
    }

    let caption = captionTemplate || "Bem-vindo(a), {membro}!";
    
    caption = caption
      .replace(/{membro}/gi, `@${newMemberNumber}`)
      .replace(/{grupo}/gi, groupName)
      .replace(/@member/gi, `@${newMemberNumber}`)
      .replace(/@group/gi, groupName)
      .replace(/\[membro\]/gi, `@${newMemberNumber}`)
      .replace(/\[grupo\]/gi, groupName)
      .replace(/{{membro}}/gi, `@${newMemberNumber}`)
      .replace(/{{grupo}}/gi, groupName);

    // 1. Enviar GIF sem legenda
    await sendGifFromFile(gifPath, null, null);

    // 2. Aguardar 500ms
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Enviar áudio
    await sendAudioFromFile(audioPath);

    // 4. Aguardar 500ms
    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. Enviar legenda como mensagem de texto com menção
    await sendTextWithMention({
      caption: caption,
      mentions: [newMemberId],
    });
  } catch (error) {
    console.error(`[WELCOME7] Erro: ${error.message}`);
    
    try {
      await sendTextWithMention({
        caption: `Bem-vindo(a), @${newMemberNumber}! 👋`,
        mentions: [newMemberId],
      });
    } catch {}
  }
}

module.exports = { handleWelcome7NewMember };