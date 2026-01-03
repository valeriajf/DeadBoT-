const fs = require("fs");
const {
  isActiveWelcome6Group,
  getWelcome6Video,
  getWelcome6Caption,
} = require("./database");

async function handleWelcome6NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  pushname,
  sendVideoFromFile,
  sendTextWithMention,
}) {
  try {
    if (!isActiveWelcome6Group(groupId)) return;

    const videoPath = getWelcome6Video(groupId);
    const captionTemplate = getWelcome6Caption(groupId);

    if (!videoPath || !fs.existsSync(videoPath)) return;

    let caption = captionTemplate || "Bem-vindo(a), @member!";
    
    caption = caption
      .replace(/{membro}/gi, `@${newMemberNumber}`)
      .replace(/{grupo}/gi, groupName)
      .replace(/@member/gi, `@${newMemberNumber}`)
      .replace(/@group/gi, groupName)
      .replace(/\[membro\]/gi, `@${newMemberNumber}`)
      .replace(/\[grupo\]/gi, groupName)
      .replace(/{{membro}}/gi, `@${newMemberNumber}`)
      .replace(/{{grupo}}/gi, groupName);

    await sendVideoFromFile(videoPath, caption, [newMemberId]);
  } catch (error) {
    console.error(`[WELCOME6] Erro: ${error.message}`);
    
    try {
      await sendTextWithMention({
        caption: `Bem-vindo(a), @${newMemberNumber}! 👋`,
        mentions: [newMemberId],
      });
    } catch {}
  }
}

module.exports = { handleWelcome6NewMember };