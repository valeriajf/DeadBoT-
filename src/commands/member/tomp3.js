const fs = require("node:fs");
const path = require("node:path");
const { getAudioDurationInSeconds } = require("get-audio-duration");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const { tmpdir } = require("node:os");

module.exports = {
  name: "tomp3",
  description: "Converte um vídeo enviado ou respondido em áudio MP3.",
  commands: ["tomp3"],
  usage: "#tomp3 (responda a um vídeo)",

  handle: async (ctx) => {
    const { socket, webMessage, sendReply, sendAudioFromFile } = ctx;

    try {
      await sendReply("🎧 Convertendo vídeo para MP3...");

      // 🔍 Verifica se a mensagem tem um vídeo direto
      let videoMessage =
        webMessage?.message?.videoMessage ||
        webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage
          ?.videoMessage;

      // ❌ Nenhum vídeo detectado
      if (!videoMessage) {
        await sendReply(
          "❌ Nenhum vídeo detectado. Envie ou responda a um vídeo e use #tomp3 novamente."
        );
        return;
      }

      // 🔽 Faz o download do vídeo temporário
      const buffer = await socket.downloadMediaMessage(
        { message: { videoMessage } },
        "buffer"
      );

      if (!buffer) {
        await sendReply("❌ Falha ao baixar o vídeo.");
        return;
      }

      const tempVideoPath = path.join(tmpdir(), `temp_${Date.now()}.mp4`);
      const tempAudioPath = path.join(tmpdir(), `audio_${Date.now()}.mp3`);
      fs.writeFileSync(tempVideoPath, buffer);

      // 🎵 Converte vídeo → MP3 usando ffmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .output(tempAudioPath)
          .audioCodec("libmp3lame")
          .on("end", resolve)
          .on("error", reject)
          .run();
      });

      // 🕒 Pega a duração do áudio só pra logar (opcional)
      try {
        const duration = await getAudioDurationInSeconds(tempAudioPath);
        console.log(`[TOMP3] Áudio gerado com duração de ${duration.toFixed(1)}s`);
      } catch {}

      // 📤 Envia o áudio de volta no chat
      await sendAudioFromFile(tempAudioPath, true, true);

      await sendReply("✅ Conversão concluída com sucesso!");

      // 🧹 Remove arquivos temporários
      fs.unlinkSync(tempVideoPath);
      fs.unlinkSync(tempAudioPath);
    } catch (err) {
      console.error("[TOMP3 ERROR]", err);
      await sendReply("❌ Ocorreu um erro durante a conversão: " + err.message);
    }
  },
};