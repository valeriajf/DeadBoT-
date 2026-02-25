/**
 * src/services/mensagemDiariaScheduler.js
 *
 * Serviço de agendamento de mensagem diária automática.
 *
 * Como funciona:
 *   - Roda um intervalo a cada minuto verificando se são 08:00h
 *   - Ao atingir 08:00h, percorre todos os grupos com sistema ativo
 *   - Para cada grupo, gera e envia a mensagem do dia
 *   - Controla para não repetir a mensagem no mesmo dia
 *
 * @author DeadBoT
 */

const path = require("node:path");
const fs = require("node:fs");

// ============================================================
// 📅 FERIADOS NACIONAIS BRASIL 2026
// ============================================================
const FERIADOS_2026 = {
  "01-01": "🎉 Ano-Novo — Confraternização Universal",
  "16-02": "🎭 Segunda-feira de Carnaval",
  "17-02": "🎭 Carnaval",
  "18-02": "⛪ Quarta-feira de Cinzas (Ponto Facultativo até 14h)",
  "03-04": "✝️ Sexta-feira Santa",
  "05-04": "🐣 Páscoa",
  "21-04": "⚔️ Tiradentes",
  "01-05": "👷 Dia do Trabalho",
  "04-06": "🌹 Corpus Christi",
  "07-09": "🇧🇷 Independência do Brasil",
  "12-10": "🙏 Nossa Senhora Aparecida",
  "02-11": "🕯️ Finados",
  "15-11": "🏛️ Proclamação da República",
  "20-11": "✊ Dia da Consciência Negra",
  "24-12": "🎄 Véspera de Natal (Ponto Facultativo após 13h)",
  "25-12": "🎄 Natal",
  "31-12": "🎆 Véspera de Ano-Novo (Ponto Facultativo após 13h)",
};

// ============================================================
// 🌙 FASES DA LUA 2026
// ============================================================
const FASES_LUA = [
  { data: "2026-01-03", fase: "🌑 Nova" },
  { data: "2026-01-10", fase: "🌓 Crescente" },
  { data: "2026-01-18", fase: "🌕 Cheia" },
  { data: "2026-01-26", fase: "🌗 Minguante" },
  { data: "2026-02-01", fase: "🌑 Nova" },
  { data: "2026-02-09", fase: "🌓 Crescente" },
  { data: "2026-02-17", fase: "🌕 Cheia" },
  { data: "2026-02-24", fase: "🌗 Minguante" },
  { data: "2026-03-03", fase: "🌑 Nova" },
  { data: "2026-03-11", fase: "🌓 Crescente" },
  { data: "2026-03-18", fase: "🌕 Cheia" },
  { data: "2026-03-25", fase: "🌗 Minguante" },
  { data: "2026-04-01", fase: "🌑 Nova" },
  { data: "2026-04-10", fase: "🌓 Crescente" },
  { data: "2026-04-17", fase: "🌕 Cheia" },
  { data: "2026-04-23", fase: "🌗 Minguante" },
  { data: "2026-05-01", fase: "🌑 Nova" },
  { data: "2026-05-09", fase: "🌓 Crescente" },
  { data: "2026-05-16", fase: "🌕 Cheia" },
  { data: "2026-05-23", fase: "🌗 Minguante" },
  { data: "2026-05-31", fase: "🌑 Nova" },
  { data: "2026-06-08", fase: "🌓 Crescente" },
  { data: "2026-06-14", fase: "🌕 Cheia" },
  { data: "2026-06-21", fase: "🌗 Minguante" },
  { data: "2026-06-29", fase: "🌑 Nova" },
  { data: "2026-07-07", fase: "🌓 Crescente" },
  { data: "2026-07-14", fase: "🌕 Cheia" },
  { data: "2026-07-21", fase: "🌗 Minguante" },
  { data: "2026-07-29", fase: "🌑 Nova" },
  { data: "2026-08-05", fase: "🌓 Crescente" },
  { data: "2026-08-12", fase: "🌕 Cheia" },
  { data: "2026-08-19", fase: "🌗 Minguante" },
  { data: "2026-08-28", fase: "🌑 Nova" },
  { data: "2026-09-04", fase: "🌓 Crescente" },
  { data: "2026-09-11", fase: "🌕 Cheia" },
  { data: "2026-09-18", fase: "🌗 Minguante" },
  { data: "2026-09-26", fase: "🌑 Nova" },
  { data: "2026-10-03", fase: "🌓 Crescente" },
  { data: "2026-10-10", fase: "🌕 Cheia" },
  { data: "2026-10-17", fase: "🌗 Minguante" },
  { data: "2026-10-26", fase: "🌑 Nova" },
  { data: "2026-11-02", fase: "🌓 Crescente" },
  { data: "2026-11-09", fase: "🌕 Cheia" },
  { data: "2026-11-15", fase: "🌗 Minguante" },
  { data: "2026-11-24", fase: "🌑 Nova" },
  { data: "2026-12-01", fase: "🌓 Crescente" },
  { data: "2026-12-09", fase: "🌕 Cheia" },
  { data: "2026-12-15", fase: "🌗 Minguante" },
  { data: "2026-12-24", fase: "🌑 Nova" },
];

function getFaseLua(dataStr) {
  const hoje = new Date(dataStr);
  let faseAtual = "🌑 Nova";
  let menorDiff = Infinity;
  for (const entry of FASES_LUA) {
    const d = new Date(entry.data);
    const diff = hoje - d;
    if (diff >= 0 && diff < menorDiff) {
      menorDiff = diff;
      faseAtual = entry.fase;
    }
  }
  return faseAtual;
}

// ============================================================
// 📖 365 MENSAGENS DE SABEDORIA
// ============================================================
const MENSAGENS_365 = [
  "Não critique! Procure antes colaborar com todos. A crítica fere, mas o exemplo transforma. 🌱",
  "Você jamais está abandonado. Mesmo nas trevas, a pequena chama da fé ilumina o caminho. 🕯️",
  "Colheremos o que houvermos semeado. Plante sementes de otimismo e amor hoje. 🌻",
  "Não se deixe perturbar pela calúnia. Viva de tal forma que o caluniador nunca tenha razão. 💪",
  "A solução dos seus problemas está dentro de você. Ouça a voz da sua consciência. 🧘",
  "Não deixe para amanhã o que pode começar agora. O recomeço é sempre possível! 🔄",
  "Mesmo sozinho, continue a caminhada. A fé acesa em seu coração ilumina as trevas ao redor. 🌟",
  "Cada um é responsável por seus atos. Siga à frente, mesmo que o mundo esteja contra você. 🦁",
  "Mantenha-se unido à Força Infinita que está dentro de você. Você vencerá! ⚡",
  "Você está melhorando a cada dia, sob todos os pontos de vista. Acredite nisso! 🌈",
  "Repouse a mente. Um cérebro descansado pensa com mais acerto e alegria. 😴",
  "Sempre existe uma saída para qualquer problema. Ligue-se ao Pensamento Universal de Amor. 🌊",
  "Pense positivamente! Seus pensamentos são ondas que atraem realidades semelhantes. 🧲",
  "Mantenha uma atitude vitoriosa. Cabeça erguida, confiante e risonho para o mundo! 👑",
  "A ansiedade desequilibra o corpo. Faça afirmações positivas e mantenha-se calmo e sereno. 🌿",
  "Você jamais está abandonado! O Pai não abandona nenhum de seus filhos. ❤️",
  "Prefira ouvir uma crítica honesta a um elogio vazio. A verdade nos faz crescer. 🪞",
  "Seja o mesmo dentro e fora do lar. A manifestação externa reflete o estado íntimo da alma. 🏡",
  "Seja atencioso e compreensivo. O mundo está repleto de enfermos, e você tem saúde moral. 🤝",
  "Aja discretamente, com firmeza. O ouro brilha no cofre sem precisar competir com o vidro. ✨",
  "Seja sóbrio e natural. A simplicidade repousa o espírito e o corpo. 🍃",
  "Cumprimente seus amigos com alegria! Uma saudação calorosa pode conquistar um coração. 😊",
  "Trate a todos com afabilidade. Cada pessoa ao seu lado é seu irmão de jornada. 🫂",
  "Reanime quem está desanimado com palavras de esperança e bom ânimo. 🌅",
  "Desperte! Renove cada manhã seu armazenamento de alegria de viver. 🌞",
  "Seja como o sol: ilumina o pântano sem se afastar enlameado. Leve sua virtude a todos. ☀️",
  "Eleve seu coração em prece com palavras espontâneas, como conversa com um amigo querido. 🙏",
  "O amor ao próximo é a melhor forma de amar a Deus. Sirva com dedicação. 💚",
  "Veja em cada criança o futuro da humanidade. Colabore com exemplos dignificantes. 👶",
  "Respeite todas as religiões. Respeite para ser respeitado. ☮️",
  "Viva acordado no bem, e os sonhos serão belos e bons. 💤",
  "Coopere com sua pátria. O bem da coletividade se distribui a todos os cidadãos. 🌍",
  "Ajude à Natureza! As árvores cooperam com a vida. Você também pode cooperar. 🌳",
  "Não maltrate os animais. São irmãos menores que precisam de carinho e cuidado. 🐾",
  "Distribua o que não está usando. A alma fica mais leve quando partilhamos. 🎁",
  "Vigie suas palavras. Tudo o que dizemos cria a atmosfera mental em que vivemos. 👄",
  "Deus está dentro de você em todas as circunstâncias — nos momentos felizes e nos difíceis. 🌟",
  "Desenvolva a parte humana do seu ser. Use sua inteligência para conhecer-se cada vez mais. 🧠",
  "Erga-se para trabalhar! As tarefas são muitas e poucos têm consciência delas. 💼",
  "Uma boa palavra, um sorriso, um pensamento construtor podem mudar um dia inteiro. 😄",
  "A Terra é uma escola sagrada. Veja em todos a boa vontade que os anima. 📚",
  "Seja calmo. Pense bastante antes de falar. Sua serenidade é um presente para o mundo. 🧘",
  "Perdoe e siga em frente! Quanta gente espera de você apoio, compreensão e carinho. 🕊️",
  "Não discuta jamais com sua companheira(o) na frente dos filhos. O lar é sagrado. 🏠",
  "O Amor e a alegria são os elementos básicos para conquistar e conservar amizades. 💞",
  "Fixe seu olhar no lado belo da vida! Seja como a abelha que busca a flor no meio do pântano. 🌸",
  "Jamais use palavras que façam alguém desanimar. Dê alegria, o melhor remédio do céu. 🌈",
  "Ouça com a mesma atenção que gosta de receber. A razão, às vezes, está do outro lado. 👂",
  "Aprenda a respirar conscientemente. A respiração é a fonte da vida e da saúde. 💨",
  "Não perca sua serenidade! Tenha pena de quem age mal — são pessoas enfermas. 💙",
  "Seja grato. Saiba quebrar o orgulho e receber com gratidão a ajuda que lhe derem. 🙌",
  "Cada um recebe de acordo com o que dá. Espalhe afeto e verá amor ao seu redor. 🌺",
  "Seja otimista! Confie em Deus dentro de você, que tem a solução de todos os problemas. 🌤️",
  "Não pare jamais de trabalhar para o bem! A alma inativa morre de tédio e cansaço. 🔥",
  "Não dê importância à idade do corpo: a alma não tem idade. Mantenha-se jovem por dentro! 🎉",
  "Toda a natureza é uma harmonia divina. Viva de acordo com suas leis. 🌿",
  "Seja fiel no cumprimento dos seus deveres. Cada tarefa é um passo no seu progresso. 🎯",
  "Levante sua cabeça! Você é filho de Deus. Caminhe seguro e siga em frente. 🦅",
  "O que verdadeiramente importa é o que você realmente é, não o que os outros pensam. 💎",
  "Controle seus nervos ao lidar com pessoas difíceis. Nesses momentos a virtude brilha mais. 🌟",
  "Mantenha o carinho pelas pessoas que você ama, independente do julgamento alheio. ❤️",
  "O casamento é construído diariamente, com amor, compreensão e atenção mútua. 💑",
  "Tenha fé no poder renovador da vida dentro de você. Deus age sempre em seu benefício. 🌱",
  "Caminhe resolutamente no sentido do seu progresso. Nenhuma voz malévola alcançará você. 🚀",
  "Renove sua saúde por meio de afirmações positivas. Seu organismo responde ao que você pensa. 💪",
  "O mundo está cheio da Luz Divina! Olhe tudo com olhos de bondade e alegria. 🌞",
  "Chegue ao trabalho com o coração feliz e ele se tornará um estimulante de alegria. 😊",
  "Deus nos guia sempre. Medite em silêncio para ouvir Sua voz que jamais abandona. 🙏",
  "Só atingirá o cimo da montanha quem estiver decidido a enfrentar o esforço da caminhada. ⛰️",
  "Compreender o ponto de vista dos outros é uma das formas mais belas de amar. 🤝",
  "A vida é eterna, infindável. Procure aumentar seus conhecimentos e aperfeiçoar-se. ♾️",
  "Coloque Deus em todos os seus pensamentos e as dores se esvairão como as trevas à aurora. 🌅",
  "O momento presente é o criador do seu amanhã. Preste atenção ao que você está fazendo agora. ⏳",
  "Tudo tem sua hora própria. Saiba distinguir o momento de dar e o de receber. ⏰",
  "A dor é o adubo que faz crescer a produção evolutiva. As lágrimas fertilizam o coração. 🌧️",
  "Deus está em tudo. Mesmo o que parece mal pode ser a causa de um benefício futuro. 🌈",
  "Tenha bom ânimo! Divida um problema complexo em partes e vença cada uma delas. 💡",
  "Confie na Força Inesgotável dentro de você. Sorria diante das dificuldades. 😊",
  "Quem possui o coração cheio de Amor nada teme. Procure amar a todos. ❤️",
  "Faça as pazes com seus adversários. Aproveite a proximidade para fazer-lhes bem. ☮️",
  "A verdadeira pobreza é a falta de compreensão, não de dinheiro. Seja rico em bondade. 💚",
  "Não perca de vista sua filiação divina. Ame a Deus através do amor às criaturas. 🌟",
  "Sua Luz deve brilhar de dentro para fora. Ilumine a todos com palavras de otimismo. ✨",
  "Domine suas reações emotivas. Seja dono de si mesmo. A serenidade é um tesouro. 🧘",
  "Descubra seu caminho na vida. Você é o único responsável pelo seu destino. 🗺️",
  "Ajude o mundo para que o mundo possa ajudá-lo. Estenda seus braços no cultivo do Bem. 🌍",
  "Procure não ler coisas tristes. Alimente a mente com o que é bom, puro e verdadeiro. 📖",
  "A beleza transitória passa. Firme-se no Espírito Imortal, que dura para sempre. 💎",
  "Seja exemplo aos seus alunos, filhos ou liderados. O exemplo vale mais que mil palavras. 🏅",
  "Saiba viver os belos momentos da sua vida. Colha em todos os canteiros as flores da alegria! 🌸",
  "Não se deixe arrastar pela vaidade. Só Deus é indispensável. A humildade nos liberta. 🪷",
  "Enfrente a luta até o fim. Todos os seus esperam de você a coragem de persistir. 🦁",
  "Quando encontrar trevas, não esbraveje: acenda uma luz. Seja farol para o próximo. 🕯️",
  "Não deseje o que pertence a outrem. Tudo que é seu chegará na hora oportuna. 🍃",
  "O mundo não é mau. Os homens ainda não conseguiram ser bons, mas a luz nasce até da lama. 🌺",
  "Não espere perfeição nos outros. Erga quem cai, exaltando as qualidades que todos têm. 🤲",
  "A morte não existe! O que se dá é apenas uma transformação. A vida é eterna. 🌟",
  "Caminhe alegre pela vida! Faça o bem sem pensar na recompensa. 😄",
  "Seja forte e corajoso. A mesma força que está dentro de você dirige os universos infinitos. 💪",
  "Aprenda a começar e a recomeçar! Se errou, erga-se. As cicatrizes se transformam em luzes. 🌟",
  "Use benevolência e gentileza em todos os atos. Domine sua irritabilidade. 🌸",
  "Plante sementes de bondade sem se preocupar com os resultados. A natureza cuida do resto. 🌱",
  "Marche de cabeça erguida, confiante. As cicatrizes marcarão a sua vitória. 🏆",
  "O sofrimento nos liberta quando aprendemos a conformar-nos com ele com sabedoria. 🌧️",
  "Você que é jovem: construa a felicidade em bases sólidas. Estude, ouça, seja puro. 🎓",
  "Não perca sua calma! Um raio de cólera pode destruir longas sementeiras de amor. 🌊",
  "Fale sempre de saúde e vitória. A palavra é responsável pelo estado da sua saúde física. 🗣️",
  "Seja paciente com seu filho. Cada criança é uma linda flor do céu para cultivar na terra. 🌷",
  "Não julgue o próximo. Se estivesse no lugar dele, talvez fizesse pior. 🪞",
  "Não seja arrogante ao ensinar. O aprendizado dura a vida toda. Aprenda também. 📚",
  "A felicidade não pode estar em nada que esteja fora de você. Busque-a dentro. 💛",
  "Mente sã, corpo são. A mente sadia gera o corpo sadio — não o contrário. 🧠",
  "Para subir na vida, dois degraus: AMAR e SERVIR. Jamais desanime nessa escalada. 🪜",
  "Tenha coragem em todas as circunstâncias. Deus está dentro de você, pronto a dar vigor. ⚡",
  "O minuto presente é o mais importante de sua vida. Aproveite ao máximo o agora. ⏱️",
  "Não humilhe ninguém. Os erros que os outros cometem hoje, você pode cometê-los amanhã. 🤝",
  "Procure compreender o próximo. Não fira a sensibilidade alheia — você sabe como dói. 💙",
  "Ajude a todos como desejaria ser ajudado. Seu colega é seu irmão de jornada. 🫂",
  "Você é um herói! O trabalho diário, as lutas constantes formam um verdadeiro campeão. 🦸",
  "Somos o reflexo do que pensamos. Plante otimismo para colher alegria amanhã. 🌈",
  "Não duvide do poder da bondade. Um coração com Deus é maioria contra qualquer adversidade. 💪",
  "Quando o que parecia um mal resulta em bem, confie no Pai. Ele sabe o que faz. 🌟",
  "Viva com simplicidade. A simplicidade olha a natureza sem óculos e encontra a solução. 🍃",
  "Mantenha seu equilíbrio. Siga a conduta ditada por sua consciência e caminhe para frente. 🧘",
  "As palavras criam nossos mundos individuais. Escolha palavras amáveis e animadoras. 🗣️",
  "Coopere com tudo e com todos. O homem não pode viver isolado — somos complementares. 🌍",
  "Não sinta medo. O medo irradia forças negativas; a coragem paralisa a crítica alheia. 🦁",
  "Cultive paciência, tolerância, perdão e Amor. Emoções negativas prejudicam a saúde. 🌿",
  "Faça o bem de todas as formas para preparar um futuro melhor. Você é dono do amanhã. 🌅",
  "O Amor é doação, não exigência. Quem realmente ama, dá tudo e nada pede. 💞",
  "Não repita apressadamente o que ouve. Informe-se da verdade. O silêncio é de ouro. 🤫",
  "Quem é corajoso não foge da batalha da vida. Seja herói em toda a extensão do termo. 🗡️",
  "Você, que é pai ou mãe, dê aos filhos o exemplo do trabalho, da honestidade e da dignidade. 👨‍👧",
  "Um exemplo vale mais que muitos discursos. Convença com suas ações, não com palavras. 🏅",
  "Seja alegre e otimista: Deus está dentro de você, perto, não distante nas nuvens. 😊",
  "O mundo é um ambiente de trabalho, um curso de aprendizado intensivo. Aproveite! 💼",
  "Faça questão de ser alegre. Nada na terra pode destruir a felicidade do homem otimista. 🌞",
  "Todas as dores terminam. O Tempo, com suas mãos cheias de bálsamo, traz o alívio. ⏳",
  "Seja humilde. A vaidade nos faz perder o sentido das proporções e nos leva ao ridículo. 🌿",
  "Se ama a Deus, ame a seu semelhante. Deus está dentro de todas as criaturas. ❤️",
  "Não perca seu equilíbrio interno. Todas as tempestades passam quando há serenidade. 🌊",
  "Não seja extremista. Caminhe firme e seguro, sem pressa, mas sem parar jamais. 🚶",
  "Esqueça-se um pouco de si mesmo e pense nos outros. Esse é o maior segredo da felicidade. 🤲",
  "Todos somos iguais perante o Pai. O interior importa: generosos ou avarentos, bons ou maus. 🌍",
  "Agradeça a Deus pelo ar que respira, pela água, pelo sol, pela noite de repouso. 🙏",
  "Não tenha medo! Nossa vida é eterna. A Força Divina é proteção permanente. ✨",
  "Saiba viver eternamente aprendendo. Quando paramos de aprender, começamos a morrer. 📚",
  "Não confunda cultura com sabedoria. A sabedoria nasce de dentro e se adquire na meditação. 🧘",
  "Desperte para suas responsabilidades. Em suas mãos está uma parte do futuro da humanidade. 🌍",
  "Não tem inimigos externos. Inimigos são os pensamentos errôneos que atraem o mal. 🧠",
  "Seja alegre, dê a mão a cada criatura que se aproxima. A verdadeira felicidade é permanente. 😊",
  "Procure anular a parte inferior e desenvolver a superior do seu ser. Seja totalmente humano. 🌟",
  "O heroísmo é ser bom com quem é mau, calmo diante de irritantes, generoso com egoístas. 🦸",
  "Fale apenas sobre coisas belas e boas. O bem atrai paz, alegria e bem-estar. ✨",
  "Seja sempre verdadeiro. A mentira envenena a consciência e afasta os amigos leais. 🌿",
  "Conte histórias bonitas de fundo moral aos mais novos. Seu exemplo é a maior lição. 📖",
  "Ame a todos indistintamente — o sábio, o ignorante, o rico, o pobre. Ajude a todos. 💚",
  "Cerque sua vida com o doce sentimento do Amor. Só o amor vence as barreiras da separação. ❤️",
  "Desperte para as verdades superiores. Espalhe alegria e otimismo, bondade e amor. 🌟",
  "A morte não existe. Se perdeu alguém querido, saiba: ele apenas mudou de estado. 🌠",
  "Você é a única pessoa capaz de curar-se. Emita pensamentos positivos de saúde. 💪",
  "A riqueza não depende do dinheiro acumulado, mas da bondade que você distribui. 💎",
  "Mantenha seu bom humor em todas as circunstâncias. A alegria é um medicamento divino. 😄",
  "A felicidade de sua vida não pode vir de fora. Faça-a nascer dentro do seu coração. 💛",
  "Ajude sempre com desprendimento. Quem ajuda o próximo está, na realidade, ajudando a si mesmo. 🤲",
  "Faça aos outros o que gosta que façam a você. Cada um recebe de acordo com o que dá. 🌺",
  "Se você é estudante, aproveite o tempo ao máximo. Forme bases sólidas para a vitória na vida. 🎓",
  "Raciocine imparcialmente. Não se conforme com a escravidão mental. Nascemos para ser livres. 🦅",
  "Nossa mente capta vibrações. Fixe-a numa faixa elevada de Bondade e Amor. 📡",
  "Trabalhe muito, mas mantenha uma hora para leitura, meditação e higiene mental. ⚖️",
  "Não pretenda que todos pensem como você. Busque a Verdade, mas respeite os outros. 🕊️",
  "Se sente que está só, procure quem precise de sua ajuda. Jamais se sentirá abandonado. 🤝",
  "Mantenha-se calmo. Sente-se, fique imóvel alguns minutos. O problema se resolverá. 🧘",
  "Sirva a Deus indiretamente, servindo a seus semelhantes, aos animais, às plantas. 🌱",
  "Entregue ao Pai Todo-Compreensivo aqueles a quem você ama. Ame-os você também. 🙏",
  "Expulse as lembranças tristes. Dirija a mente às recordações alegres e aos fatos agradáveis. 🌈",
  "Aproveite os momentos de alegria para agradecer a bondade Divina. Espalhe otimismo. 🎉",
  "Viva sua vida interior com mais intensidade. Deus está permanentemente dentro de você. 🌟",
  "Não permaneça preso ao passado. Faça como o sol: erga-se a cada novo dia sem lembrar a noite. ☀️",
  "Trabalhe confiante. Você receberá aquilo que merecer. Na hora exata, sem atraso. ⏰",
  "Um corpo saudável reflete atitudes corretas da mente. Alimente-se de pensamentos sadios. 🧠",
  "Trabalho é sinônimo de nobreza. Não existem trabalhos humildes, só bem ou mal realizados. 🏅",
  "Controle o tom de sua voz. Somos amados ou odiados de acordo com como nos dirigimos aos outros. 🗣️",
  "A cada novo dia, agradeça o repouso recebido e execute suas tarefas com alegria. ☀️",
  "Espalhe por todos a alegria que vive dentro de você. Seja uma tocha de luz sempre acesa. 🕯️",
  "Faça afirmações positivas ao despertar. Basta sua presença para que a alegria entre nos corações. 😊",
  "Perdoe e esqueça. Uma única pessoa lucrará com o seu perdão: você mesmo. 🕊️",
  "O amor ao próximo é o segredo da nossa felicidade. Relevar e esquecer é sabedoria. 💚",
  "Cultive a Verdade em todos os momentos. Ela o levará triunfalmente ao progresso. ✨",
  "Nunca se irrite. A paciência é bálsamo que suaviza feridas próprias e alheias. 🌿",
  "Faça da leitura um hábito tão indispensável quanto a respiração. O livro é seu melhor amigo. 📚",
  "Saiba dominar-se. Vitorioso não é quem vence os outros, mas quem se vence a si mesmo. 🏆",
  "Desculpe o amigo mal-humorado. Você não sabe seus problemas íntimos. Seja compreensivo. 💙",
  "Ajude os enfermos. Amanhã talvez deseje que alguém o visite na sua enfermidade. 🏥",
  "Não se queixe contra a vida. Cada exame tem sua razão de ser, e dos males surge um bem. 🌱",
  "Manifeste gratidão à sua família e amigos, não só em palavras, mas no seu exemplo diário. 🙏",
  "Domine sua agitação. Quanto mais trabalho, maior deve ser a calma. A pressa é inimiga da perfeição. 🧘",
  "Contribua com algo seu para tornar mais belo este mundo. Um gesto simples pode reanimar alguém. 🌸",
  "Quem alimenta o ódio atira fogo ao próprio coração. Saiba relevar e esquecer para ser feliz. ❤️",
  "Não existem pessoas realmente más. Há enfermos e ignorantes da lei. Ensine pelo exemplo. 🌟",
  "Não seja impaciente. Deixe que o tempo amadureça os frutos naturalmente. Saiba esperar. ⏳",
  "Espalhe otimismo e bondade ao redor. Não perca as oportunidades de fazer o bem. 🌺",
  "Seja perseverante nas boas obras. A perseverança é para a vida o que o estudo é para o pianista. 🎹",
  "A vida é um canto eterno de beleza! Distribua amor e compreensão igualmente a todos. 🎶",
  "Não ponha limites à sua vida. A vida é bela, apesar das dores e dos contratempos. 🌟",
  "Se está desempregado, não desespere. Enfrente as dificuldades com coragem. Você vai vencer! 💪",
  "Pense sempre certo para ter saúde perfeita. O corpo é o reflexo do que você pensa. 🧠",
  "Não se deixe derrotar. A pior derrota é de quem desanima. Siga à frente corajosamente. 🦁",
  "Não se queixe da vida. Cada exame tem sua razão. Prove que está preparado. 🌧️",
  "Seja forte nos embates. O sofrimento realiza o aprimoramento da nossa força interna. 💎",
  "Seja alegre, espalhando esmolas de conforto, palavras de carinho, sorrisos de felicidade. 😊",
  "O Amor é uma doação perene de luz e felicidade, sem buscar retribuições. Ame assim! ❤️",
  "Mantenha a amizade dos seus amigos. Saiba retribuir com gratidão os benefícios recebidos. 🤝",
  "Não diga que não pode ajudar. Distribua os bens que Deus lhe concedeu em gestos de bondade. 🎁",
  "Não deixe que a calúnia perturbe sua vida. Caminhe para a frente imperturbavelmente! 🚶",
  "A terra espera pelo seu auxílio. O que você dá em retribuição pelo ar, água e alimento? 🌍",
  "Tenha fé em si mesmo. Ter fé em si mesmo é ter fé em Deus que está dentro de você. 💫",
  "Se está enfermo, não desespere. A enfermidade purifica o espírito. Jamais desanime! 🌱",
  "Todas as vezes que olhar para uma criança, agradeça a Deus que jamais abandona seus filhos. 👶",
  "Você está sofrendo? Busque alegria e viva com a sensação otimista de quem sabe lutar. 🌅",
  "Quando a dúvida o assaltar, gaste seu tempo em trabalhos construtivos auxiliando os outros. 💪",
  "Procure dar o mais que puder: uma boa palavra, um sorriso, um pensamento generoso. 😊",
  "A morte não existe! Procure ser AGORA aquilo que deseja continuar a ser. 🌟",
  "Mantenha aceso seu ideal de felicidade. Acumule riquezas de bondade, não de metal. 💛",
  "Procure ser humilde. Humildade é saber exatamente o que somos sem precisar impor aos outros. 🌿",
  "Tenha firmeza e paciência. Tudo o que é seu virá às suas mãos no momento oportuno. ⏰",
  "Procure amar a tudo e a todos. Distribua compreensão e paz, e a felicidade morará em você. 💞",
  "Tenha compreensão pelos erros do próximo. Ninguém vira santo da noite para o dia. 🤲",
  "Mantenha-se calmo e sereno. Ouça a orientação ditada por Deus no mais profundo de você. 🧘",
  "Evite acusar e criticar. Deixe o julgamento para Aquele que vê os corações. 🙏",
  "A vida é alegria quando espalhamos otimismo e amor. Integre-se na Energia Cósmica. 🌈",
  "Seja o que você deseja ser. Você é filho de Deus e tem direito à sua liberdade. 🦅",
  "Procure viver mais sua vida interior. A Centelha Divina é seu eu real. 🌟",
  "Não permaneça preso a recordações tristes. O que passou, passou! Construa vida nova. 🌅",
  "Seja forte! Tenha bom ânimo! A Força Divina jamais o abandona. ⚡",
  "Não esbanje forças com atividades de pouca importância. Canalize sua energia para o bem. 🎯",
  "Se alguém não o compreende, perdoe e siga em frente! Lições preciosas estão em todos os caminhos. 🕊️",
  "A educação no lar é a base da felicidade dos filhos. Seja o modelo que eles merecem. 🏡",
  "Acenda sua luz interior. O homem iluminado não encontra trevas em seu caminho. 💡",
  "Onde quer que encontre uma criança, derrame sobre ela todo o seu carinho. 🌷",
  "Jamais desanime! Não há noite eterna que não suceda a luz de um dia radiante. ☀️",
  "Cultive a verdade em relação aos outros e a si mesmo. Só ela nos leva à perfeição. 🌟",
  "Faça alguma coisa em favor do próximo todos os dias. O coração ficará cheio de alegria. ❤️",
  "Deus está dentro de você! Mas também dentro de todas as criaturas que você encontra. ✨",
  "Tenha dinamismo! Os pés que não caminham criam raízes. A vida é luta e movimento. 🚀",
  "Cultive a alegria em dose máxima. A alegria provém de dentro, da consciência tranquila. 😊",
  "Mantenha seu ideal. Acumule riquezas de boas obras, que o acompanharão além-túmulo. 💛",
  "Procure ser humilde em todas as circunstâncias. Quem é humilde não sabe que o é. 🌿",
  "Seja o que você deseja ser. Busque dentro de si mesmo a luz divina e suba sempre. 🌟",
  "A vida é bela! Mergulhe sua alma na natureza: sol, lua, estrelas, flores. Contemple! 🌸",
  "O pensamento plasma a vida de amanhã. Somos donos do nosso amanhã. Plante bem hoje. 🌱",
  "Procure não ler coisas desagradáveis. A mente se alimenta do que você oferece a ela. 📖",
  "Seja tolerante com o próximo que erra. Não há pessoas más, há enfermos e ignorantes. 🤲",
  "Aprenda a dirigir palavras de louvor ao que é belo e bom. A gratidão traz alegria à vida. 🌟",
  "Faça tudo com amor! Só o amor constrói obras eternas. O próprio Deus é amor. ❤️",
  "Mantenha sempre a coragem para o bem. A constância na ação vale mais que palavras. 💪",
  "Seja na terra a pequenina chama que ilumina as trevas de milhares de criaturas. 🕯️",
  "Evite o álcool e os excessos. Construa na mente sua imagem livre de vícios. 🌿",
  "Dentro de você, por mais imperfeito que seja, nascerá uma alma imortal e bela. Tenha fé! 🌸",
  "Nenhum mal pode lhe acontecer além do que você mesmo pratica. Aja com bondade. 💚",
  "Acenda sua luz interior dedicando minutos à meditação. Ouça a voz da sua consciência. 🧘",
  "Em cada criança, existe um dia novo que surge para a felicidade do mundo. Cuide delas. 👶",
  "Jamais desanime! Dos sofrimentos passados conservamos apenas uma lembrança apagada. 🌈",
  "Enquanto dispuser de tempo, dirija seus passos pela senda do bem. Faça algo por alguém. ❤️",
  "Não se queixe de abandono. Procure quem precise de você e jamais se sentirá só. 🤝",
  "A cooperação é sublime; a interferência é desagradável. Ajude sem impor seu ponto de vista. 🌿",
  "Não fique remoendo o passado. Faça as pazes com seus adversários e viva feliz. 🕊️",
  "Levante todos os que estiverem caídos ao seu redor. Você não sabe onde seus pés tropeçarão. 🤲",
  "Quando der uma esmola, não anuncie. O Pai, que vê no segredo, o recompensará muito mais. 🙏",
  "Não se queixe do mundo. Procure ter apenas pensamentos bons — eles não serão maculados. 🌟",
  "Não creia que encontrará perfeição nos outros. Erga quem cai, exaltando suas qualidades. 💚",
  "Se está enfermo, procure unir-se mentalmente à Energia Cósmica. Busque o revigoramento. 💫",
  "Derrame raios de sol de alegria ao redor. Seja um raio de luz para quem está perto de você. ☀️",
  "O Céu está dentro de você! Aprenda a viver no paraíso criado pela sua própria alegria. 🌟",
  "Não se prenda às opiniões da multidão. Viva de acordo com as luzes que chegam do Alto. 🦅",
  "Estude sua própria personalidade. Conheça-se para viver uma vida consciente e feliz. 🪞",
  "Não diga que foi 'vontade de Deus' o mal que aconteceu. Deus quer apenas o nosso bem. 🌈",
  "Não procure coletar tesouros só nesta terra. Colecione boas obras que o acompanharão sempre. 💛",
  "Procure interessar-se pelas crianças. Cuide delas com amor e terá preparado um futuro feliz. 👶",
  "Não desanime no primeiro degrau. Se a tristeza bater, contemple o céu: as nuvens passarão. ☀️",
  "Só a árvore que produz frutos é apedrejada. A calúnia, muitas vezes, é uma honra. 🌳",
  "O homem é o que pensa. Afirme que é feliz e a felicidade baterá à sua porta. 💪",
  "Cuide bem do seu corpo com alimentação sadia e do espírito com bons livros. 📚",
  "A cooperação é uma das coisas mais sublimes da vida. Ajude sem interferir. 🤝",
  "Não fique remoendo as coisas do passado. Levante-se e siga à frente o mais rápido que puder. 🚀",
  "Seja alegre e otimista. Olhe para frente e caminhe confiante praticando o bem. 😊",
  "Nossa mente é um rádio que transmite e recebe. Fixe-a em vibrações de Bondade e Amor. 📡",
  "Procure viver com equilíbrio. Reserve tempo para leitura, meditação e higiene mental. ⚖️",
  "Não pretenda que todos pensem como você. A Verdade Absoluta é Deus, o Infinito. 🌌",
  "Se percebe que está só, procure quem precise de sua ajuda. Derrame seu coração nos que sofrem. 💚",
  "Mantenha-se calmo e sereno em qualquer circunstância. Respire fundo e o problema se resolverá. 🧘",
  "Sirva a Deus servindo a seus semelhantes, aos animais, às plantas. Tudo é manifestação divina. 🌿",
  "Não fique triste! Peça que o Pai ajude quem lhe foi ingrato. Entregue ao Pai quem você ama. 🙏",
  "Expulse de seu espírito as lembranças tristes. Acenda a Luz para as trevas desaparecerem. ✨",
  "Seja grato pela bondade Divina. Aproveite os momentos de alegria para agradecer tudo. 🌟",
  "Viva sua vida interior com intensidade. Descubra Deus dentro de você e encontrará felicidade. 💛",
  "Logo que o sol despontar, saúde-o com louvor e inicie seu trabalho com firme desejo de ajudar. 🌅",
  "Seus pés no chão, sua cabeça no céu. Ajude a estrada, leve consolo aos aflitos. 🤲",
  "Procure corrigir com calma os que erram. A vida é um intercâmbio de boa vontade mútua. 🌸",
  "Perdoe e esqueça as mágoas. Quando o caluniador abrir os olhos, você estará longe demais. 🕊️",
  "O amor ao próximo é o segredo da felicidade. A serenidade é o segredo das vidas longas. ❤️",
  "Cultive a Verdade. Ouça a voz silenciosa da consciência. Obedeça aos seus conselhos! 🌟",
  "Nunca se irrite! A paciência é um bálsamo sempre pronto a suavizar as feridas de todos. 🌿",
  "Faça da leitura um hábito diário. O livro conversa com você somente quando você quer. 📖",
  "Saiba dominar-se e vencer-se. A vitória sobre si mesmo é a mais difícil e a mais nobre. 🏆",
  "Desculpe o amigo mal-humorado. Não sabe o que lhe aconteceu. Continue a querer-lhe bem. 💙",
  "Ajude os enfermos. Os doentes famintos de solidariedade e amor precisam de você. 🏥",
  "Não se queixe da vida. Cada exame tem sua razão de ser. Prove que está preparado. 💪",
  "Manifeste gratidão continuada em seu exemplo, não apenas em palavras. 🙏",
  "Domine sua agitação! Só as criaturas calmas são totalmente eficientes. Tudo sai bem feito. 🧘",
  "Contribua com algo de seu para tornar mais belo este mundo. Um aperto de mão confiante salva. 🤝",
  "Quem alimenta o ódio atira fogo ao próprio coração. Para ser feliz: releve e esqueça. ❤️",
  "Procure ensinar aos outros pelo seu próprio exemplo. A maldade é situação transitória. 🌟",
  "Não seja impaciente. Os frutos amadurecidos à força não são tão saborosos. Saiba esperar. 🍇",
  "Espalhe otimismo e bondade. Não perca as oportunidades diárias de fazer o bem. 🌺",
  "Seja perseverante. Para o pianista é o estudo; para você, é a persistência na ação diária. 🎵",
  "A vida é um canto eterno de beleza! Distribua amor e compreensão igualmente a todos. 🎶",
  "Não ponha limites à sua vida. Aspire o perfume das flores, contemple as estrelas. Viva! 🌸",
  "Se está desempregado, enfrente as dificuldades. O grande Ford começou como mecânico. 🔧",
  "O pensamento tem poder curador. Pense sempre certo para ter saúde perfeita. 🧠",
  "Não se deixe derrotar. A vitória sorri somente àqueles que não param no meio da estrada. 🏆",
  "Deus está em toda parte. Se sofre, é porque a dor lhe trará benefícios futuros. 🌱",
  "Mantenha sua mente limpa. O corpo é o reflexo da mente, que é reflexo da alma. 🌟",
  "Seja nobre em sua expressão. Demonstre nobreza primeiro para que os outros o imitem. 👑",
  "Mantenha uma unidade de plano na vida. O fio que une as pérolas dá sentido ao colar. 💎",
  "Não seja cruel. Seja misericordioso com quem erra, pois você também pode errar amanhã. 🤲",
  "Leia mais! A boa leitura alimenta o cérebro e controla as emoções. Leia mais e mais! 📚",
  "Procure pensar. Você tem o dom de raciocinar. Seja você mesmo, descubra seu caminho. 🧠",
  "Não se exalte, não se irrite, não discuta. A mansidão e a serenidade conquistam corações. 🕊️",
  "Não se envergonhe de ser humilde. Humildade é posição de espírito, não de corpo ou voz. 🌿",
  "Seja tolerante com o próximo que erra. Desculpe e ensine pelo seu exemplo. 🤝",
  "Aprenda a dirigir palavras de louvor ao que é belo. A gratidão espontânea aumenta amigos. 💛",
  "Faça tudo com amor! Só o amor penetra profundamente o coração da humanidade. ❤️",
  "Mantenha a coragem para o bem. A constância na ação de cada dia é o verdadeiro heroísmo. 🦸",
  "Seja na terra a chama que ilumina as trevas. Sirva e ame para distribuir benefícios a todos. 🕯️",
  "A vida é alegria quando espalhamos otimismo e amor. Viva integrado na Energia Cósmica. 🌈",
  "Seja o que você deseja ser. Busque a luz divina dentro de si e suba sempre, sem parar. 🌟",
  "Viva mais sua vida interior. Deus está permanentemente dentro de você, apesar das imperfeições. 💫",
  "Não permaneça preso ao passado. Faça como o sol que se ergue cada dia sem lembrar a noite. ☀️",
  "Trabalhe confiante. Você receberá o que merecer, na hora exata, sem atraso nem antecipação. ⏰",
  "Um corpo saudável reflete atitudes corretas da mente. Mantenha o otimismo e o amor. 💚",
  "Trabalho é nobreza. Dê valor ao seu trabalho fazendo-o com todo o amor e carinho. 🏅",
  "Controle o tom de sua voz. Somos amados ou odiados de acordo com como nos dirigimos aos outros. 🗣️",
  "A cada novo dia, agradeça o repouso e execute suas tarefas com alegria e boa vontade. 🌅",
  "Espalhe por todos a alegria que vive dentro de você. Que sua alegria seja contagiante! 😊",
  "Faça afirmações positivas ao despertar. Sorria de coração para todos os que encontrar. 🌟",
  "Não acumule desejos de vingança. Perdoe e esqueça — o único que lucra com o perdão é você. 💛",
  "O amor ao próximo é o segredo da nossa felicidade. Relevar e esquecer é sabedoria de vida. 🕊️",
  "Cultive sempre a Verdade. A consciência tranquila é o maior tesouro que você pode ter. 💎",
  "Nunca se irrite com o trânsito, o vizinho, as filas. A paciência protege sua saúde. 😊",
  "Faça da leitura um hábito sagrado. O espírito também precisa se alimentar todos os dias. 📚",
  "Vença-se a si mesmo. Quem se domina é o verdadeiro herói — mais que qualquer general. 🏆",
  "Desculpe quem está mal-humorado. Você não sabe o que ele carrega. Seja compreensivo. 💙",
  "Procure sempre ajudar os enfermos e solitários. Um sorriso pode ser o remédio que faltava. 🏥",
  "Não se queixe da vida. Tudo o que nos acontece tem sua razão de ser. Dos males surge o bem. 🌱",
  "Manifeste gratidão em seu exemplo diário. Essa é a gratidão que verdadeiramente transforma. 🙏",
  "Domine sua agitação. A calma é o segredo de quem realiza tudo com perfeição. 🧘",
  "Contribua para tornar mais belo este mundo. O menor gesto pode reanimar quem está por fraquejar. 🌸",
  "Para ser feliz: saiba relevar e esquecer. O ódio queima quem o alimenta, não quem o recebe. ❤️",
  "Ensine pelo exemplo. A maldade é transitória; o amor é eterno. Plante amor. 🌱",
  "Saiba esperar. Os frutos mais doces são os que amadurecem no tempo certo. 🍇",
  "Espalhe otimismo e bondade. Não perca nenhuma oportunidade de fazer o bem hoje. 🌺",
  "Seja perseverante até o último dia. A vitória chega a quem não para no meio da estrada. 💪",
  "A vida é um canto eterno de beleza! O mundo é belo. Você é parte dessa beleza. 🎶",
  "🎊 Fim de um ano inteiro de sabedoria e amor! Que o próximo seja ainda mais luminoso. Obrigado por cada dia juntos! ✨",
];

// ============================================================
// 🎯 AÇÕES CRIATIVAS
// ============================================================
const ACOES_CRIATIVAS = [
  "ir pra BC no finalzinho do ano 🏖️",
  "comer uma pizza gigante juntos 🍕",
  "assistir um filme de terror à meia-noite 🎬",
  "fazer uma viagem surpresa no fds 🚗",
  "cozinhar um jantar especial pra galera 👨‍🍳",
  "cantar karaokê até não poder mais 🎤",
  "fazer uma maratona de séries no domingo 📺",
  "ir num parque de diversões 🎡",
  "organizar um churrasco pra turma toda 🥩",
  "aprender a dançar forró juntos 💃",
  "fazer um piquenique no parque 🧺",
  "ir numa cachoeira de surpresa 🌊",
  "assistir o nascer do sol na praia 🌅",
  "fazer uma noite de jogos de tabuleiro 🎲",
  "experimentar um restaurante japonês diferente 🍣",
  "ir num show de música ao vivo 🎸",
  "fazer um bolo absurdo pra comemorar nada 🎂",
  "jogar sinuca e comer petisco depois 🎱",
  "dar uma volta de barco no fim de semana ⛵",
  "organizar uma gincana no grupo 🏆",
  "ir numa feira de artesanato juntos 🎨",
  "fazer uma caminhada na trilha da serra 🥾",
  "assistir um jogo de futebol no estádio ⚽",
  "fazer um piquenique à luz de velas 🌙",
  "fazer um retiro espiritual de um dia 🧘",
];

// ============================================================
// ⚙️ AUXILIARES
// ============================================================
function getDiaSemana(dia) {
  return ["🌞 Domingo","🌙 Segunda-feira","🔥 Terça-feira","💧 Quarta-feira","🌿 Quinta-feira","⭐ Sexta-feira","🪐 Sábado"][dia];
}

function getDiaDoAno(data) {
  const inicio = new Date(data.getFullYear(), 0, 0);
  return Math.floor((data - inicio) / (1000 * 60 * 60 * 24));
}

function getDiasFimAno(data) {
  const fimAno = new Date(data.getFullYear(), 11, 31);
  return Math.floor((fimAno - data) / (1000 * 60 * 60 * 24));
}

// ============================================================
// 💌 ENVIA MENSAGEM PARA UM GRUPO
// ============================================================
async function enviarMensagemParaGrupo(socket, groupJid) {
  try {
    // Require feito aqui dentro para garantir que BASE_DIR já existe
    const DB_PATH = path.join(BASE_DIR, "../database/mensagemDiaria.json");

    const now = new Date();
    const dia = String(now.getDate()).padStart(2, "0");
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;
    const chaveData = `${dia}-${mes}`;

    const diaSemana = getDiaSemana(now.getDay());
    const diasFimAno = getDiasFimAno(now);
    const faseLua = getFaseLua(now.toISOString().split("T")[0]);
    const feriado = FERIADOS_2026[chaveData];
    const indice = ((getDiaDoAno(now) - 1) % 365 + 365) % 365;
    const sabedoria = MENSAGENS_365[indice];

    let mentions = [];
    let acaoText = "";
    try {
      const metadata = await socket.groupMetadata(groupJid);
      const ids = metadata.participants.map((p) => p.id);
      if (ids.length >= 2) {
        const sorteados = [...ids].sort(() => Math.random() - 0.5).slice(0, 2);
        const acao = ACOES_CRIATIVAS[Math.floor(Math.random() * ACOES_CRIATIVAS.length)];
        mentions = sorteados;
        acaoText = `\n\n🎯 *${diasFimAno} dias até* @${sorteados[0].split("@")[0]} e @${sorteados[1].split("@")[0]} *${acao}*`;
      }
    } catch (_) {}

    let msg = `💌 *Mensagem Diária*\n\n`;
    msg += `📆 *Hoje é dia*: ${dataFormatada}\n`;
    msg += `${diaSemana}\n`;
    msg += `🌚 *Lua*: ${faseLua}\n`;
    msg += `⏳ *Faltam* ${diasFimAno} *dias para o Fim do Ano*`;
    msg += acaoText;
    msg += `\n\n✨ *Sabedoria do Dia*:\n_${sabedoria}_`;
    msg += `\n\n💚 _By DeadBoT_`;

    if (feriado) {
      msg = `🚨 *Hoje é feriado!*\n🎉 *${feriado}*\n\n` + msg;
    }

    await socket.sendMessage(groupJid, { text: msg, mentions });
    console.log(`[MensagemDiaria] ✅ Enviado para ${groupJid}`);
  } catch (err) {
    console.error(`[MensagemDiaria] ❌ Erro em ${groupJid}:`, err.message);
  }
}

// ============================================================
// ⏰ SCHEDULER — idêntico ao padrão do niverScheduler
// ============================================================

/**
 * Inicia o agendador de mensagem diária.
 * Verifica se são 08:00h a cada minuto e envia para todos os grupos ativos.
 * @param {import('@whiskeysockets/baileys').WASocket} socket
 */
function startMensagemDiariaScheduler(socket) {
  console.log("[MensagemDiaria] 💌 Agendador de mensagem diária iniciado!");

  let alreadySentToday = false;
  let lastDay = new Date().getDate();

  setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const day = now.getDate();

    // Resetar controle ao virar o dia
    if (day !== lastDay) {
      alreadySentToday = false;
      lastDay = day;
    }

    // Dispara exatamente às 08:00 e só uma vez por dia
    if (hour === 8 && minute === 0 && !alreadySentToday) {
      alreadySentToday = true;
      console.log("[MensagemDiaria] ⏰ São 08:00! Enviando mensagem diária...");

      try {
        const DB_PATH = path.join(BASE_DIR, "../database/mensagemDiaria.json");
        if (!require("node:fs").existsSync(DB_PATH)) return;

        const db = JSON.parse(require("node:fs").readFileSync(DB_PATH, "utf-8"));
        const gruposAtivos = Object.entries(db)
          .filter(([, ativo]) => ativo)
          .map(([jid]) => jid);

        if (gruposAtivos.length === 0) {
          console.log("[MensagemDiaria] Nenhum grupo ativo.");
          return;
        }

        console.log(`[MensagemDiaria] 📋 Enviando para ${gruposAtivos.length} grupo(s)...`);

        for (const groupJid of gruposAtivos) {
          await enviarMensagemParaGrupo(socket, groupJid);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (err) {
        console.error("[MensagemDiaria] ❌ Erro geral:", err.message);
      }
    }
  }, 60 * 1000); // Checa a cada 1 minuto
}

module.exports = {
  startMensagemDiariaScheduler,
};
