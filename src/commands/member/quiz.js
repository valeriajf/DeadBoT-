const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

// Armazena quizzes ativos por chat
const activeQuizzes = new Map();

// Banco de 115 perguntas de conhecimentos gerais
const questions = [
  {
    pergunta: "Normalmente, quantos litros de sangue uma pessoa adulta tem?",
    opcoes: ["A) 2 a 4 litros", "B) 4 a 6 litros", "C) 10 litros", "D) 7 litros"],
    resposta: "B",
    explicacao: "Um adulto entre 50 e 80 kg tem entre 4 e 6 litros de sangue (7% a 8% do peso corporal). Numa doação são retirados 450 ml.",
  },
  {
    pergunta: 'De quem é a famosa frase "Penso, logo existo"?',
    opcoes: ["A) Platão", "B) Galileu Galilei", "C) Sócrates", "D) Descartes"],
    resposta: "D",
    explicacao: "A frase é do filósofo René Descartes (1596-1650), originalmente em francês: Je pense, donc je suis.",
  },
  {
    pergunta: "O chuveiro elétrico foi inventado em qual país?",
    opcoes: ["A) França", "B) Inglaterra", "C) Brasil", "D) Austrália"],
    resposta: "C",
    explicacao: "Francisco Canhos desenvolveu o primeiro chuveiro elétrico seguro em Jaú-SP, na década de 40.",
  },
  {
    pergunta: "Quais são o menor e o maior país do mundo?",
    opcoes: ["A) Nauru e China", "B) Mônaco e Canadá", "C) Vaticano e Rússia", "D) Malta e EUA"],
    resposta: "C",
    explicacao: "O Vaticano tem apenas 0,44 km². A Rússia, nos continentes Europa e Ásia, tem 17 milhões de km².",
  },
  {
    pergunta: "Qual presidente do Brasil ficou conhecido como Jango?",
    opcoes: ["A) Jânio Quadros", "B) Getúlio Vargas", "C) João Figueiredo", "D) João Goulart"],
    resposta: "D",
    explicacao: "João Belchior Marques Goulart (1919-1976) foi o 24º presidente do Brasil, governando de 1961 a 1964.",
  },
  {
    pergunta: "Qual grupo contém apenas palavras escritas corretamente?",
    opcoes: [
      "A) Asterístico, beneficiente, meteorologia",
      "B) Asterisco, beneficente, metereologia",
      "C) Asterisco, beneficente, meteorologia, entretido",
      "D) Asterisco, beneficiente, metereologia",
    ],
    resposta: "C",
    explicacao: "As formas corretas são: asterisco, beneficente, meteorologia e entretido. As demais apresentam barbarismos.",
  },
  {
    pergunta: "Qual é o livro mais vendido no mundo depois da Bíblia?",
    opcoes: ["A) O Senhor dos Anéis", "B) O Pequeno Príncipe", "C) Um Conto de Duas Cidades", "D) Dom Quixote"],
    resposta: "D",
    explicacao: "Dom Quixote, de Miguel de Cervantes, é um clássico da literatura espanhola escrito em 1605 e 1615.",
  },
  {
    pergunta: "Quantas casas decimais tem o número Pi?",
    opcoes: ["A) Duas", "B) Vinte", "C) Infinitas", "D) Milhares"],
    resposta: "C",
    explicacao: "O número Pi é irracional e possui infinitas casas decimais. Já foram calculadas mais de 62 trilhões delas.",
  },
  {
    pergunta: "Quantos elementos químicos a tabela periódica possui atualmente?",
    opcoes: ["A) 92", "B) 109", "C) 113", "D) 118"],
    resposta: "D",
    explicacao: "Os últimos elementos foram adicionados em 2016: Nihônio (113), Moscóvio (115), Tenessino (117) e Oganessônio (118).",
  },
  {
    pergunta: "Quais países têm a maior e a menor expectativa de vida do mundo?",
    opcoes: ["A) Austrália e Afeganistão", "B) Japão e Serra Leoa", "C) Itália e Chade", "D) EUA e Angola"],
    resposta: "B",
    explicacao: "No Japão a expectativa de vida é em média 84 anos. Em Serra Leoa é de 53 anos.",
  },
  {
    pergunta: 'O que a palavra inglesa "legend" significa em português?',
    opcoes: ["A) Legenda", "B) Conto", "C) Legendário", "D) Lenda"],
    resposta: "D",
    explicacao: '"Legend" é um falso cognato. Apesar da grafia parecida com "legenda", seu significado é lenda.',
  },
  {
    pergunta: "Qual é o número mínimo de jogadores por time em uma partida de futebol?",
    opcoes: ["A) 5", "B) 8", "C) 9", "D) 7"],
    resposta: "D",
    explicacao: "Uma partida de futebol pode continuar com no mínimo 7 jogadores (incluindo o goleiro) em cada equipe.",
  },
  {
    pergunta: "Quais são os principais autores do Barroco no Brasil?",
    opcoes: [
      "A) Gregório de Matos, Bento Teixeira e Manuel Botelho de Oliveira",
      "B) Miguel de Cervantes, Gregório de Matos e Dante Alighieri",
      "C) Castro Alves, Bento Teixeira e Manuel Botelho de Oliveira",
      "D) Álvares de Azevedo, Gregório de Matos e Bento Teixeira",
    ],
    resposta: "A",
    explicacao: "Gregório de Matos (Boca do Inferno), Bento Teixeira (autor de Prosopopeia) e Manuel Botelho de Oliveira são os principais nomes do Barroco brasileiro.",
  },
  {
    pergunta: "Quais as duas datas comemorativas de novembro no Brasil?",
    opcoes: [
      "A) Independência do Brasil e Dia da Bandeira",
      "B) Proclamação da República e Dia Nacional da Consciência Negra",
      "C) Dia do Médico e Dia de São Lucas",
      "D) Dia de Finados e Dia Nacional do Livro",
    ],
    resposta: "B",
    explicacao: "Proclamação da República: 15 de novembro. Consciência Negra: 20 de novembro (morte de Zumbi dos Palmares em 1695).",
  },
  {
    pergunta: 'Quem pintou a famosa obra "Guernica"?',
    opcoes: ["A) Salvador Dalí", "B) Tarsila do Amaral", "C) Diego Rivera", "D) Pablo Picasso"],
    resposta: "D",
    explicacao: "Pablo Picasso pintou Guernica em 1937, retratando o bombardeio à cidade espanhola durante a Guerra Civil Espanhola.",
  },
  {
    pergunta: "Quanto tempo a luz do Sol demora para chegar à Terra?",
    opcoes: ["A) 12 minutos", "B) 1 dia", "C) 12 horas", "D) 8 minutos"],
    resposta: "D",
    explicacao: "A luz percorre os 150 milhões de km entre o Sol e a Terra em aproximadamente 8 minutos e 20 segundos.",
  },
  {
    pergunta: 'O que significa "Fabiano cogió su saco antes de salir" em português?',
    opcoes: [
      "A) Fabiano coseu seu paletó antes de sair",
      "B) Fabiano fechou o saco antes de sair",
      "C) Fabiano pegou seu paletó antes de sair",
      "D) Fabiano cortou o saco antes de cair",
    ],
    resposta: "C",
    explicacao: '"Saco" em espanhol é um falso cognato e significa paletó em português.',
  },
  {
    pergunta: "Qual a nacionalidade de Che Guevara?",
    opcoes: ["A) Cubana", "B) Boliviana", "C) Peruana", "D) Argentina"],
    resposta: "D",
    explicacao: "Ernesto Guevara de La Serna nasceu em Rosário, Argentina, em 14 de junho de 1928.",
  },
  {
    pergunta: "Quais predadores são reconhecidos por caçar em grupo, se camuflar e ter sentidos apurados, respectivamente?",
    opcoes: [
      "A) Tubarão branco, crocodilo e sucuri",
      "B) Tigre, gavião e orca",
      "C) Hiena, urso branco e lobo cinzento",
      "D) Leão, tubarão branco e urso cinzento",
    ],
    resposta: "C",
    explicacao: "A hiena caça em grupo, o urso polar se camufla no gelo e o lobo cinzento tem excelentes audição e visão noturna.",
  },
  {
    pergunta: "Qual a altura da rede de vôlei no jogo masculino e feminino adulto?",
    opcoes: ["A) 2,5 m e 2,0 m", "B) 2,45 m e 2,15 m", "C) 1,8 m e 1,5 m", "D) 2,43 m e 2,24 m"],
    resposta: "D",
    explicacao: "A rede tem 2,43 m para o masculino e 2,24 m para o feminino nos jogos adultos.",
  },
  {
    pergunta: "Em que ordem surgiram os modelos atômicos?",
    opcoes: [
      "A) Thomson, Dalton, Rutherford, Bohr",
      "B) Dalton, Thomson, Rutherford-Bohr, Rutherford",
      "C) Rutherford, Bohr, Thomson, Dalton",
      "D) Dalton, Thomson, Rutherford, Rutherford-Bohr",
    ],
    resposta: "D",
    explicacao: "Dalton (1803) → Thomson (1898) → Rutherford (1911) → Rutherford-Bohr (1913).",
  },
  {
    pergunta: "Qual personagem folclórico é agradado pelos caçadores com fumo de corda?",
    opcoes: ["A) Saci", "B) Boitatá", "C) Lobisomem", "D) Caipora"],
    resposta: "D",
    explicacao: "A Caipora é a protetora da floresta. Os caçadores deixam fumo junto a um tronco de árvore para agradá-la.",
  },
  {
    pergunta: "Em que período da pré-história o fogo foi descoberto?",
    opcoes: ["A) Neolítico", "B) Idade dos Metais", "C) Pedra Polida", "D) Paleolítico"],
    resposta: "D",
    explicacao: "Foi no Paleolítico que os homens aprenderam a obter fogo pelo atrito de pedaços de madeira e pedra.",
  },
  {
    pergunta: "Qual alternativa contém apenas classes de palavras?",
    opcoes: [
      "A) Vogais, semivogais e consoantes",
      "B) Artigo, verbo transitivo e verbo intransitivo",
      "C) Fonologia, Morfologia e Sintaxe",
      "D) Substantivo, verbo e preposição",
    ],
    resposta: "D",
    explicacao: "Existem 10 classes de palavras: substantivo, verbo, preposição, adjetivo, pronome, artigo, numeral, conjunção, interjeição e advérbio.",
  },
  {
    pergunta: "Qual é a montanha mais alta do Brasil?",
    opcoes: ["A) Pico da Bandeira", "B) Monte Roraima", "C) Pico Paraná", "D) Pico da Neblina"],
    resposta: "D",
    explicacao: "O Pico da Neblina, com 2.995 metros, localiza-se no Amazonas, na fronteira com Venezuela e Colômbia.",
  },
  {
    pergunta: "Qual é a velocidade da luz no vácuo?",
    opcoes: [
      "A) 150.000.000 m/s",
      "B) 300.000.000 m/s",
      "C) 199.792.458 m/s",
      "D) 299.792.458 m/s",
    ],
    resposta: "D",
    explicacao: "A velocidade da luz no vácuo é de exatamente 299.792.458 metros por segundo.",
  },
  {
    pergunta: "Em qual local da Ásia o português é língua oficial?",
    opcoes: ["A) Índia", "B) Filipinas", "C) Tailândia", "D) Macau"],
    resposta: "D",
    explicacao: "Macau tem duas línguas oficiais: mandarim e português. Foi território português até 1999.",
  },
  {
    pergunta: '"It is six twenty" em inglês corresponde a que horas?',
    opcoes: ["A) 12:06", "B) 6:02", "C) 6:20", "D) 2:20"],
    resposta: "C",
    explicacao: 'Em inglês, "past" indica minutos após a hora. "Six twenty" = seis horas e vinte minutos = 6:20.',
  },
  {
    pergunta: 'Quem é o autor do livro "O Príncipe"?',
    opcoes: ["A) Rousseau", "B) Thomas Hobbes", "C) Montesquieu", "D) Maquiavel"],
    resposta: "D",
    explicacao: "O Príncipe é a obra mais célebre de Nicolau Maquiavel (1469-1527), publicada postumamente em 1532.",
  },
  {
    pergunta: 'Como se conjuga "caber" na 1ª pessoa do singular do presente do indicativo?',
    opcoes: ["A) Eu cabo", "B) Eu cabe", "C) Que eu caiba", "D) Eu caibo"],
    resposta: "D",
    explicacao: '"Caber" é verbo irregular. A forma correta na 1ª pessoa do presente do indicativo é "eu caibo".',
  },
  {
    pergunta: "Quais destas construções famosas ficam nos Estados Unidos?",
    opcoes: [
      "A) Estátua da Liberdade, Golden Gate e Empire State Building",
      "B) Estátua da Liberdade, Big Ben e The High Line",
      "C) Angkor Wat, Taj Mahal e Skywalk no Grand Canyon",
      "D) Lincoln Memorial, Sydney Opera House e Burj Khalifa",
    ],
    resposta: "A",
    explicacao: "A Estátua da Liberdade e o Empire State ficam em Nova York. A Golden Gate Bridge fica em São Francisco, na Califórnia.",
  },
  {
    pergunta: "Quais destas doenças são sexualmente transmissíveis?",
    opcoes: [
      "A) Aids, tricomoníase e ebola",
      "B) Chikungunya, aids e herpes",
      "C) Gonorreia, clamídia e sífilis",
      "D) Botulismo, cistite e gonorreia",
    ],
    resposta: "C",
    explicacao: "Gonorreia, clamídia e sífilis são infecções sexualmente transmissíveis (ISTs) causadas por bactérias.",
  },
  {
    pergunta: "Qual destes países é transcontinental (pertence a mais de um continente)?",
    opcoes: ["A) Marrocos", "B) Filipinas", "C) Groenlândia", "D) Rússia"],
    resposta: "D",
    explicacao: "A Rússia é transcontinental, pertencendo tanto à Europa quanto à Ásia, sendo o maior país do mundo.",
  },
  {
    pergunta: 'Em qual das orações a palavra "mal/mau" foi empregada incorretamente?',
    opcoes: [
      "A) Mais uma vez, portou-se mal.",
      "B) É um homem mal.",
      "C) Esse é o mal de todos.",
      "D) É um mau vendedor.",
    ],
    resposta: "B",
    explicacao: '"Mal" é antônimo de bem; "mau" é antônimo de bom. O correto seria "É um homem mau."',
  },
  {
    pergunta: "Qual foi o recurso usado inicialmente pelo homem para explicar a origem das coisas?",
    opcoes: ["A) A Filosofia", "B) A Matemática", "C) A Astronomia", "D) A Mitologia"],
    resposta: "D",
    explicacao: "A mitologia foi usada por diversas civilizações antigas para explicar fenômenos e a origem das coisas.",
  },
  {
    pergunta: "Qual alternativa menciona apenas símbolos nacionais do Brasil?",
    opcoes: [
      "A) Bandeira nacional, brasão, hino nacional e hino da independência",
      "B) Bandeira nacional, armas nacionais, hino nacional e selo nacional",
      "C) Bandeira insígnia da presidência, brasão e hinos",
      "D) Bandeira nacional, cores nacionais, hino nacional e hino da independência",
    ],
    resposta: "B",
    explicacao: "Os Símbolos Nacionais são: bandeira nacional, armas nacionais, selo nacional e hino nacional (Lei nº 5.700/1971).",
  },
  {
    pergunta: "Quais são os planetas do sistema solar?",
    opcoes: [
      "A) Terra, Vênus, Saturno, Urano, Júpiter, Marte, Netuno, Mercúrio",
      "B) Júpiter, Marte, Mercúrio, Netuno, Plutão, Saturno, Terra, Urano, Vênus",
      "C) Vênus, Saturno, Urano, Júpiter, Marte, Netuno, Mercúrio",
      "D) Terra, Vênus, Saturno, Júpiter, Marte, Netuno, Mercúrio",
    ],
    resposta: "A",
    explicacao: "O Sistema Solar possui 8 planetas: Mercúrio, Vênus, Terra, Marte, Júpiter, Saturno, Urano e Netuno. Plutão foi reclassificado.",
  },
  {
    pergunta: "Qual era o nome de Aleijadinho?",
    opcoes: [
      "A) Alexandrino Francisco Lisboa",
      "B) Manuel Francisco Lisboa",
      "C) Francisco Antônio Lisboa",
      "D) Antônio Francisco Lisboa",
    ],
    resposta: "D",
    explicacao: "Aleijadinho (1730-1814), apelido de Antônio Francisco Lisboa, foi um dos maiores representantes do barroco brasileiro.",
  },
  {
    pergunta: "Júpiter e Plutão são os correlatos romanos de quais deuses gregos?",
    opcoes: ["A) Ares e Hermes", "B) Cronos e Apolo", "C) Dionísio e Deméter", "D) Zeus e Hades"],
    resposta: "D",
    explicacao: "Júpiter corresponde a Zeus (pai dos deuses, deus dos céus e do raio). Plutão corresponde a Hades (deus do submundo).",
  },
  {
    pergunta: "Qual é o maior animal terrestre?",
    opcoes: ["A) Baleia Azul", "B) Dinossauro", "C) Elefante africano", "D) Girafa"],
    resposta: "C",
    explicacao: "O elefante africano é o maior animal terrestre, medindo até 4 m de altura e pesando até 8 toneladas.",
  },
  {
    pergunta: 'Qual o tema do famoso discurso "Eu Tenho um Sonho" de Martin Luther King?',
    opcoes: [
      "A) Igualdade das raças",
      "B) Justiça para os menos favorecidos",
      "C) Intolerância religiosa",
      "D) Luta contra o Apartheid",
    ],
    resposta: "A",
    explicacao: "Em 1963, na Marcha sobre Washington com 250 mil pessoas, Martin Luther King proferiu o célebre discurso sobre igualdade racial.",
  },
  {
    pergunta: 'Que líder mundial ficou conhecida como "Dama de Ferro"?',
    opcoes: ["A) Dilma Rousseff", "B) Angela Merkel", "C) Hillary Clinton", "D) Margaret Thatcher"],
    resposta: "D",
    explicacao: "Margaret Thatcher (1925-2013) foi a primeira-ministra britânica entre 1979 e 1990, a primeira mulher a ocupar este posto.",
  },
  {
    pergunta: "O que são o Acordo de Paris e a Tríplice Aliança, respectivamente?",
    opcoes: [
      "A) Acordo ortográfico e acordo financeiro internacional",
      "B) Acordo sobre imigração europeia e acordo econômico entre Inglaterra, Rússia e França",
      "C) Acordo sobre aquecimento global e acordo financeiro das três maiores potências",
      "D) Acordo sobre aquecimento global e acordo entre Alemanha, Áustria-Hungria e Itália",
    ],
    resposta: "D",
    explicacao: "O Acordo de Paris (2015) trata do aquecimento global. A Tríplice Aliança (1882) foi um acordo militar entre Alemanha, Áustria-Hungria e Itália.",
  },
  {
    pergunta: "Quais os nomes dos três Reis Magos?",
    opcoes: [
      "A) Gaspar, Nicolau e Natanael",
      "B) Gabriel, Benjamim e Melchior",
      "C) Belchior, Gaspar e Baltazar",
      "D) Melchior, Noé e Galileu",
    ],
    resposta: "C",
    explicacao: "Os três Reis Magos são Belchior (levou ouro), Gaspar (incenso) e Baltazar (mirra).",
  },
  {
    pergunta: "Quais os principais heterônimos de Fernando Pessoa?",
    opcoes: [
      "A) Alberto Caeiro, Ricardo Reis e Álvaro de Campos",
      "B) Ariano Suassuna, Raul Bopp e Quincas Borba",
      "C) Bento Teixeira, Ricardo Reis e Haroldo de Campos",
      "D) Alberto Caeiro, Ricardo Leite e Augusto de Campos",
    ],
    resposta: "A",
    explicacao: "Os três principais heterônimos de Fernando Pessoa são Alberto Caeiro, Ricardo Reis e Álvaro de Campos.",
  },
  {
    pergunta: "Qual a religião monoteísta com maior número de adeptos no mundo?",
    opcoes: ["A) Judaísmo", "B) Zoroastrismo", "C) Islamismo", "D) Cristianismo"],
    resposta: "D",
    explicacao: "O Cristianismo, baseado na fé em Jesus Cristo, é a religião com maior número de fiéis, com aproximadamente 2 bilhões de seguidores.",
  },
  {
    pergunta: "Qual desses filmes foi baseado em obra de Shakespeare?",
    opcoes: [
      "A) Muito Barulho por Nada (2012)",
      "B) Capitães de Areia (2011)",
      "C) A Dama das Camélias (1936)",
      "D) Excalibur (1981)",
    ],
    resposta: "A",
    explicacao: "Muito Barulho por Nada (2012), dirigido por Joss Whedon, é baseado na peça homônima de William Shakespeare.",
  },
  {
    pergunta: "Quem foi o primeiro homem a pisar na Lua e em que ano?",
    opcoes: [
      "A) Yuri Gagarin, em 1961",
      "B) Buzz Aldrin, em 1969",
      "C) Charles Conrad, em 1969",
      "D) Neil Armstrong, em 1969",
    ],
    resposta: "D",
    explicacao: "Neil Armstrong (1930-2012) foi o primeiro homem a pisar na Lua em 1969, na missão Apollo 11.",
  },
  {
    pergunta: "Qual cientista descobriu a pasteurização e a vacina contra a raiva?",
    opcoes: ["A) Marie Curie", "B) Blaise Pascal", "C) Louis Pasteur", "D) Antoine Lavoisier"],
    resposta: "C",
    explicacao: "Louis Pasteur (1822-1895) descobriu a pasteurização em 1862 e a vacina antirrábica em 1885.",
  },
  {
    pergunta: "As pessoas de qual tipo sanguíneo são consideradas doadoras universais?",
    opcoes: ["A) Tipo A", "B) Tipo B", "C) Tipo AB", "D) Tipo O"],
    resposta: "D",
    explicacao: "O sangue tipo O doa para todos os outros tipos (A, B, AB e O), por isso é considerado o doador universal.",
  },
  {
    pergunta: "Quais são os cromossomos que determinam o sexo masculino?",
    opcoes: ["A) Os V", "B) Os X", "C) Os Y", "D) Os W"],
    resposta: "C",
    explicacao: 'Os cromossomos sexuais são dois: "X" é o cromossomo feminino e "Y" é o cromossomo masculino.',
  },
  {
    pergunta: "Em que estado australiano fica situada a cidade de Sydney?",
    opcoes: ["A) Victoria", "B) Nova Gales do Sul", "C) Tasmânia", "D) Queensland"],
    resposta: "B",
    explicacao: "Sydney é a capital do estado australiano de Nova Gales do Sul, sendo a cidade mais populosa da Austrália.",
  },
  {
    pergunta: "Que organização juvenil foi fundada por Baden-Powell?",
    opcoes: [
      "A) A juventude socialista",
      "B) O escotismo",
      "C) O clube dos aventureiros",
      "D) A Organização mundial da juventude",
    ],
    resposta: "B",
    explicacao: "O escotismo foi criado em 1907 por Robert Stephenson Smyth Baden-Powell, voltado para educação e desenvolvimento de jovens.",
  },
  {
    pergunta: "Quem amamentou os gêmeos Rômulo e Remo na mitologia romana?",
    opcoes: ["A) Uma cabra", "B) Uma vaca", "C) Uma ovelha", "D) Uma loba"],
    resposta: "D",
    explicacao: "Na mitologia romana, Rômulo e Remo foram lançados a um rio, mas encontrados por uma loba que os amamentou.",
  },
  {
    pergunta: "No exterior de que famoso edifício francês foi construída uma enorme pirâmide de vidro em 1989?",
    opcoes: ["A) Torre Eiffel", "B) Petit Palais", "C) Grand Palais", "D) Museu do Louvre"],
    resposta: "D",
    explicacao: "A pirâmide de vidro do Museu do Louvre foi construída entre 1985 e 1989, projetada pelo arquiteto Ieoh Ming Pei.",
  },
  {
    pergunta: "Como se chamam os vasos que transportam sangue do coração para a periferia do corpo?",
    opcoes: ["A) Veias", "B) Átrios", "C) Ventrículos", "D) Artérias"],
    resposta: "D",
    explicacao: "As artérias transportam o sangue arterial (com oxigênio e nutrientes) do coração para o corpo.",
  },
  {
    pergunta: "Com quais dois países faz fronteira o Equador?",
    opcoes: [
      "A) Brasil e Colômbia",
      "B) Colômbia e Venezuela",
      "C) Colômbia e Peru",
      "D) Peru e Brasil",
    ],
    resposta: "C",
    explicacao: "O Equador, localizado na costa oeste da América do Sul, faz fronteira com a Colômbia e o Peru.",
  },
  {
    pergunta: "Que animal gruguleja?",
    opcoes: ["A) O pavão", "B) A garça", "C) O papagaio", "D) O peru"],
    resposta: "D",
    explicacao: "Grugulejar é o som emitido pelo peru.",
  },
  {
    pergunta: "Qual é o maior arquipélago da Terra?",
    opcoes: ["A) Filipinas", "B) Indonésia", "C) Bahamas", "D) Maldivas"],
    resposta: "B",
    explicacao: "A Indonésia é o maior arquipélago do mundo, reunindo 17.508 ilhas entre a Ásia e a Oceania.",
  },
  {
    pergunta: "Que substância é absorvida pelas plantas e expirada por todos os seres vivos?",
    opcoes: ["A) Oxigênio", "B) Nitrogênio", "C) Nitrato de sódio", "D) Dióxido de carbono"],
    resposta: "D",
    explicacao: "As plantas absorvem dióxido de carbono (CO2) na fotossíntese. Os animais inspiram oxigênio e expiram CO2.",
  },
  {
    pergunta: "Em que oceano fica Madagascar?",
    opcoes: ["A) Oceano Índico", "B) Oceano Antártico", "C) Oceano Atlântico", "D) Oceano Pacífico"],
    resposta: "A",
    explicacao: "Madagascar é um país insular banhado pelo Oceano Índico, localizado no sudeste da África.",
  },
  {
    pergunta: "Que artista é conhecido como um dos expoentes máximos do Ready-Made?",
    opcoes: ["A) Pablo Picasso", "B) Salvador Dalí", "C) Marcel Duchamp", "D) Van Gogh"],
    resposta: "C",
    explicacao: 'Marcel Duchamp (1887-1968) criou os ready-mades. Seu mais famoso foi "A Fonte" (1917), um urinol apresentado como obra de arte.',
  },
  {
    pergunta: "Qual metal tem o símbolo químico Au?",
    opcoes: ["A) Cobre", "B) Prata", "C) Mercúrio", "D) Ouro"],
    resposta: "D",
    explicacao: "O ouro é um metal de transição representado pelo símbolo Au na tabela periódica.",
  },
  {
    pergunta: "Em que século o continente europeu foi devastado pela Peste Bubônica?",
    opcoes: ["A) Século X", "B) Século XI", "C) Século XII", "D) Século XIV"],
    resposta: "D",
    explicacao: "A Peste Negra atingiu a Europa no século XIV (1347-1353), matando cerca de 1/3 da população europeia, 25 milhões de pessoas.",
  },
  {
    pergunta: "Quem viveu, segundo a Bíblia, 969 anos?",
    opcoes: ["A) Jesus Cristo", "B) Noé", "C) Matusalém", "D) Benjamim"],
    resposta: "C",
    explicacao: "Segundo o Livro dos Gênesis (5:27), Matusalém, filho de Enoque, viveu 969 anos, sendo o mais velho da Bíblia.",
  },
  {
    pergunta: "Em que cidade ocorreu a Eco-92?",
    opcoes: ["A) Buenos Aires", "B) Rio de Janeiro", "C) Montevidéu", "D) Caracas"],
    resposta: "B",
    explicacao: "A Eco-92 foi organizada pela ONU e realizada entre 3 e 14 de junho de 1992, no Rio de Janeiro.",
  },
  {
    pergunta: "Quem pintou o teto da Capela Sistina?",
    opcoes: ["A) Michelangelo", "B) Leonardo da Vinci", "C) Rafael", "D) Sandro Botticelli"],
    resposta: "A",
    explicacao: "Michelangelo (1475-1564) pintou o teto da Capela Sistina, no Vaticano, entre os anos de 1508 e 1512.",
  },
  {
    pergunta: "Quantos graus são necessários para que dois ângulos sejam complementares?",
    opcoes: ["A) 45", "B) 60", "C) 90", "D) 180"],
    resposta: "C",
    explicacao: "Os ângulos complementares são ângulos que juntos somam 90°.",
  },
  {
    pergunta: "Quem foi o criador da tragédia grega?",
    opcoes: ["A) Homero", "B) Eurípedes", "C) Plutarco", "D) Ésquilo"],
    resposta: "D",
    explicacao: "Ésquilo foi um dramaturgo da Grécia antiga conhecido como o pai da tragédia. Obras: Os Persas, Sete contra Tebas e A Oresteia.",
  },
  {
    pergunta: "Jim Morrison era vocalista de que grupo?",
    opcoes: ["A) The Police", "B) The Doors", "C) Pink Floyd", "D) Nirvana"],
    resposta: "B",
    explicacao: "The Doors foi uma banda de rock formada em 1965 em Los Angeles, com Jim Morrison (1943-1971) como vocalista.",
  },
  {
    pergunta: "Qual obra arquitetônica brasileira é uma das Sete Maravilhas do Mundo Moderno?",
    opcoes: ["A) Elevador Lacerda", "B) Cristo Redentor", "C) Estação da Luz", "D) Palácio da Alvorada"],
    resposta: "B",
    explicacao: "Dentre 200 monumentos inscritos por vários países, o Cristo Redentor foi escolhido como uma das Sete Maravilhas do Mundo Moderno.",
  },
  {
    pergunta: "Em que ano e quem foi eleito o primeiro presidente do Brasil?",
    opcoes: [
      "A) 1891, Deodoro da Fonseca",
      "B) 1890, Floriano Peixoto",
      "C) 1889, Hermes da Fonseca",
      "D) 1930, Getúlio Vargas",
    ],
    resposta: "A",
    explicacao: "Após a promulgação da Constituição de 1891, Deodoro da Fonseca foi eleito pelo Congresso Nacional como o primeiro presidente.",
  },
  {
    pergunta: "As obras Abaporu, Operários e Antropofagia foram pintadas por qual artista brasileiro?",
    opcoes: ["A) Di Cavalcanti", "B) Anita Malfatti", "C) Candido Portinari", "D) Tarsila do Amaral"],
    resposta: "D",
    explicacao: "Tarsila do Amaral (1886-1973) foi uma das maiores artistas do Modernismo brasileiro. O Abaporu foi pintado em 1928.",
  },
  {
    pergunta: "Em que país nasceu Clarice Lispector?",
    opcoes: ["A) Portugal", "B) Rússia", "C) Brasil", "D) Ucrânia"],
    resposta: "D",
    explicacao: "Clarice Lispector (1920-1977) nasceu na Ucrânia, mas chegou ao Brasil ainda bebê, durante fuga da Revolução Russa de 1917.",
  },
  {
    pergunta: 'Complete o provérbio: "A cavalo dado…"',
    opcoes: ["A) sai caro", "B) tem medo de água fria", "C) não se olha o rabo", "D) não se olha os dentes"],
    resposta: "D",
    explicacao: '"A cavalo dado não se olha os dentes" ensina que não se deve criticar algo que se recebeu de presente.',
  },
  {
    pergunta: "Quais dos órgãos abaixo pertencem ao sistema respiratório?",
    opcoes: [
      "A) Laringe e traqueia",
      "B) Pulmões e faringe",
      "C) Esôfago e brônquios",
      "D) Tireoide e hipófise",
    ],
    resposta: "A",
    explicacao: "A laringe é o principal órgão da fala. A traqueia conduz o ar entre a laringe e os brônquios, levando-o aos pulmões.",
  },
  {
    pergunta: "O que é filantropo?",
    opcoes: [
      "A) Pessoa que tem excesso de confiança",
      "B) Pessoa egoísta",
      "C) Pessoa que pratica a caridade",
      "D) Canto gregoriano",
    ],
    resposta: "C",
    explicacao: "Filantropo é a pessoa que pratica a caridade. Bill Gates, co-fundador da Microsoft, é um dos filantropos mais conhecidos do mundo.",
  },
  {
    pergunta: "Em que ano e onde aconteceu o maior acidente aéreo da história do Brasil?",
    opcoes: [
      "A) 2007, em São Paulo",
      "B) 2006, no Mato Grosso",
      "C) 1982, no Ceará",
      "D) 1996, em São Paulo",
    ],
    resposta: "A",
    explicacao: "Em 17 de julho de 2007, um Airbus A-320 da TAM explodiu em Congonhas (SP), causando a morte de 199 pessoas.",
  },
  {
    pergunta: "Duas das afirmativas sobre intolerância religiosa estão erradas. Quais?",
    opcoes: [
      "A) 1 - Intolerância é crime de ódio / 2 - Intolerância não é crime no Brasil",
      "B) 2 - Intolerância não é crime no Brasil / 3 - Pena de 1 a 3 anos",
      "C) 4 - Vandalismo a templos / 5 - Liberdade de expressão garante criticar religiões",
      "D) 2 - Intolerância não é crime no Brasil / 5 - Liberdade de expressão garante criticar religiões",
    ],
    resposta: "D",
    explicacao: "A intolerância religiosa É crime no Brasil (Lei nº 9.459/1997). A liberdade de expressão NÃO garante o direito de praticar preconceito religioso.",
  },
  {
    pergunta: "Qual das alternativas contém apenas vacinas contra a covid-19?",
    opcoes: [
      "A) VIP/VOP e AstraZeneca",
      "B) CoronaVac e AstraZeneca",
      "C) HPV e BioNTech",
      "D) Pentavalente (DTPa) e Sputnik V",
    ],
    resposta: "B",
    explicacao: "CoronaVac (parceria com Instituto Butantan) e AstraZeneca (parceria com Fiocruz) foram aprovadas pela Anvisa contra a covid-19.",
  },
  {
    pergunta: "Qual o motivo da condenação de Lula em 2018?",
    opcoes: [
      "A) Recebimento de apartamento de luxo no Guarujá (SP) como propina na Lava Jato",
      "B) Corrupção e lavagem de dinheiro na Lava Jato",
      "C) Tráfico de influência internacional",
      "D) Obstrução da justiça na Lava Jato",
    ],
    resposta: "A",
    explicacao: "Em abril de 2018, Lula foi preso e condenado por corrupção passiva e lavagem de dinheiro envolvendo um triplex no Guarujá. O processo foi anulado em 2019.",
  },
  {
    pergunta: "Quais acontecimentos fizeram 20 e 30 anos em 2021?",
    opcoes: [
      "A) Primavera árabe e Atentados de 11 de setembro",
      "B) Fim da Guerra no Golfo e Coroação de Dom Pedro II",
      "C) Fim da Guerra no Golfo e Fim da Guerra Fria",
      "D) Atentado de 11 de setembro e Fim da Guerra do Golfo",
    ],
    resposta: "D",
    explicacao: "O 11 de setembro ocorreu em 2001 (20 anos). A Guerra do Golfo terminou em 28 de fevereiro de 1991 (30 anos).",
  },
  {
    pergunta: "Em janeiro de 2021, que evento ocorria no Capitólio quando ele foi invadido?",
    opcoes: [
      "A) Posse de Joe Biden como presidente dos EUA",
      "B) Ratificação da vitória de Joe Biden",
      "C) O Segundo Congresso Continental da Filadélfia",
      "D) Sessão especial de homenagem a Martin Luther King Jr.",
    ],
    resposta: "B",
    explicacao: "Em 6 de janeiro de 2021, durante a ratificação da vitória de Biden no Congresso, manifestantes invadiram o Capitólio, causando 5 mortos.",
  },
  {
    pergunta: "Qual medida polêmica do presidente Trump em 2017 causou grande repercussão?",
    opcoes: [
      "A) Construção de um muro na fronteira com o Canadá",
      "B) Cessação de acordo de comércio com Israel",
      "C) Saída do Acordo de Paris",
      "D) Saída da OTAN",
    ],
    resposta: "C",
    explicacao: "O governo Trump formalizou a saída dos EUA do Acordo Climático de Paris em novembro de 2019.",
  },
  {
    pergunta: "O que é o Pix?",
    opcoes: [
      "A) Meio de pagamento instantâneo criado pelo Banco Central do Brasil",
      "B) Plano de investimento de baixo risco do Banco do Brasil",
      "C) Conjunto de formas de pagamento realizados por subadquirentes",
      "D) Produtos de investimento financeiro do Banco Central",
    ],
    resposta: "A",
    explicacao: "O Pix é o meio de pagamento instantâneo criado pelo Banco Central do Brasil, em funcionamento desde novembro de 2020.",
  },
  {
    pergunta: "Que país realizou testes nucleares e, em 2017, ameaçou principalmente os EUA?",
    opcoes: ["A) Síria", "B) Israel", "C) China", "D) Coreia do Norte"],
    resposta: "D",
    explicacao: "A Coreia do Norte lançou mísseis de longo alcance em 2017, elevando as tensões com os EUA. Trump e Kim Jong-un se reuniram em 2018 e 2019.",
  },
  {
    pergunta: "O que é o Brexit?",
    opcoes: [
      "A) Saída do Reino Unido da Zona Euro",
      "B) Saída do Reino Unido da União Europeia",
      "C) Saída da Inglaterra do Reino Unido",
      "D) Fim da monarquia no Reino Unido",
    ],
    resposta: "B",
    explicacao: 'Brexit vem de "Britain" + "Exit". O Reino Unido deixou definitivamente a União Europeia em 31 de janeiro de 2020.',
  },
  {
    pergunta: "Sobre a personagem Mafalda, do cartunista Quino, é correto afirmar:",
    opcoes: [
      "A) Foi criada para uma campanha de alfabetização argentina",
      "B) As tirinhas foram traduzidas apenas para português e inglês",
      "C) Sua criação foi inspirada na filha de Quino",
      "D) Foi criada para fazer publicidade de eletrodomésticos",
    ],
    resposta: "D",
    explicacao: "Quino criou Mafalda para divulgar eletrodomésticos da marca Mansfield. O nome da personagem deveria começar com M, como a marca.",
  },
  {
    pergunta: "O que é o Acordo de Paris?",
    opcoes: [
      "A) Acordo que trata da restrição de imigrantes em Paris",
      "B) Acordo sobre proteção da França contra atentados terroristas",
      "C) Acordo sobre Desenvolvimento Sustentável",
      "D) Acordo internacional sobre o aquecimento global",
    ],
    resposta: "D",
    explicacao: "O Acordo de Paris, adotado na COP 21 em 2015 e aprovado por 195 países, visa minimizar os impactos do aquecimento global.",
  },
  {
    pergunta: "O discurso de Jair Bolsonaro na ONU em setembro de 2021 abordou quais temas?",
    opcoes: [
      "A) Direitos humanos e desenvolvimento social",
      "B) Proteção ambiental e atentados terroristas",
      "C) Proteção ambiental e missões de paz",
      "D) Pandemia e proteção ambiental",
    ],
    resposta: "D",
    explicacao: "O discurso de Bolsonaro na Assembleia Geral da ONU em 2021 abordou a pandemia e a proteção ambiental, sendo alvo de críticas.",
  },
  {
    pergunta: "Durante quantos anos Fidel Castro esteve à frente de Cuba?",
    opcoes: ["A) 39 anos", "B) 32 anos", "C) 40 anos", "D) 49 anos"],
    resposta: "D",
    explicacao: "Fidel Castro (1926-2016) foi líder revolucionário cubano e ditador do país durante 49 anos.",
  },
  {
    pergunta: "Qual é a função da ONU?",
    opcoes: [
      "A) Zelar pela cultura em todas as nações",
      "B) Unir as nações para manter a paz e a segurança mundial",
      "C) Financiar países em desenvolvimento",
      "D) Regular o sistema financeiro internacional",
    ],
    resposta: "B",
    explicacao: "A ONU (criada em 1945) tem como objetivo manter a paz e a segurança, proteger direitos humanos, distribuir ajuda humanitária e promover o desenvolvimento sustentável.",
  },
  {
    pergunta: "Eva Braun era esposa de qual personagem histórico conhecido pela crueldade?",
    opcoes: ["A) Vladimir Lenin", "B) Benito Mussolini", "C) Josef Stalin", "D) Adolf Hitler"],
    resposta: "D",
    explicacao: "Eva Braun (1912-1945) acompanhou Hitler durante anos. Eles se casaram em 29 de abril de 1945 e no dia seguinte se suicidaram.",
  },
  {
    pergunta: "Em que governo brasileiro foi sancionada a lei de cotas para o ensino superior?",
    opcoes: [
      "A) Governo de Dilma Rousseff",
      "B) Governo de José Sarney",
      "C) Governo de Fernando Henrique",
      "D) Governo de Luís Inácio Lula da Silva",
    ],
    resposta: "A",
    explicacao: "A Lei nº 12.711, de 29 de agosto de 2012, sobre cotas nas universidades federais, foi sancionada no governo de Dilma Rousseff.",
  },
  {
    pergunta: "Os acidentes de Chernobyl e Césio-137 aconteceram em quais países?",
    opcoes: [
      "A) Rússia e Espanha",
      "B) Ucrânia e Brasil",
      "C) EUA e Ucrânia",
      "D) Japão e Brasil",
    ],
    resposta: "B",
    explicacao: "Chernobyl explodiu em 26 de abril de 1986, na Ucrânia. O acidente com Césio-137 ocorreu em Goiânia, Brasil, em 13 de setembro de 1987.",
  },
  {
    pergunta: "Como morreu Saddam Hussein?",
    opcoes: ["A) Vítima de câncer", "B) Suicídio", "C) Ataque cardíaco", "D) Enforcado"],
    resposta: "D",
    explicacao: "Saddam Hussein (1937-2006), presidente do Iraque entre 1979 e 2003, foi capturado pelos EUA, julgado e condenado à morte por enforcamento.",
  },
  {
    pergunta: "Países Baixos, Mianmar e Irã eram chamados anteriormente de:",
    opcoes: [
      "A) Holanda, Ceilão e Pérsia",
      "B) Birmânia, Pérsia e Holanda",
      "C) Holanda, Birmânia e Pérsia",
      "D) Suazilândia, Birmânia e Pérsia",
    ],
    resposta: "C",
    explicacao: "Países Baixos = Holanda (mudança oficial em jan/2020). Mianmar = Birmânia (1989). Irã = Pérsia (até 1934).",
  },
  {
    pergunta: "Qual das alternativas contém apenas invenções criadas no Brasil?",
    opcoes: [
      "A) Urna eletrônica, soro antiofídico e chuveiro elétrico",
      "B) Lâmpada elétrica, chuveiro elétrico e internet",
      "C) Telefone, internet e urna eletrônica",
      "D) Urna eletrônica, soro antiofídico e paraquedas",
    ],
    resposta: "A",
    explicacao: "A urna eletrônica (Carlos Prudêncio), o soro antiofídico (Vital Brazil, 1903) e o chuveiro elétrico (Francisco Canho) são invenções brasileiras.",
  },
  {
    pergunta: "Que data comemorativa brasileira foi instituída para o dia 31 de outubro como alternativa ao Halloween?",
    opcoes: [
      "A) Dia das bruxas",
      "B) Dia do folclore",
      "C) Dia da poupança",
      "D) Dia do Saci",
    ],
    resposta: "D",
    explicacao: "O Dia do Saci, em 31 de outubro, celebra uma das figuras mais conhecidas do folclore brasileiro, como alternativa cultural ao Halloween.",
  },
  {
    pergunta: "Em que país se localizava Auschwitz, o maior campo de concentração nazista?",
    opcoes: ["A) Alemanha", "B) Polônia", "C) Áustria", "D) Hungria"],
    resposta: "B",
    explicacao: "Auschwitz foi instalado na Polônia, a 60 km da capital, em 1940. Funcionou até janeiro de 1945.",
  },
  {
    pergunta: "Quanto tempo durou a erupção do vulcão nas Ilhas Canárias em 2021?",
    opcoes: [
      "A) Cerca de três meses e destruiu residências e plantações",
      "B) Cerca de três semanas e aproximadamente 50 tremores de terra",
      "C) Cerca de seis meses e a morte de mais de 10 mil pessoas",
      "D) Cerca de 19 dias e destruição de metade dos municípios da ilha",
    ],
    resposta: "A",
    explicacao: "O vulcão Cumbre Vieja, na ilha de La Palma (Canárias), entrou em erupção em 19 de setembro de 2021, com fim declarado em 25 de dezembro. Destruiu cerca de 3 mil casas e plantações de banana.",
  },
  {
    pergunta: "O que aconteceu em outubro de 2017 em Goiânia e chocou o Brasil?",
    opcoes: [
      "A) Chacina da Candelária",
      "B) Incêndio em uma creche",
      "C) Um adolescente atirou contra colegas em sala de aula, dois dos quais morreram",
      "D) Crime conhecido como Massacre de Realengo",
    ],
    resposta: "C",
    explicacao: "Um adolescente de 14 anos atirou em colegas numa escola particular de Goiânia. Dois jovens de 13 anos morreram.",
  },
  {
    pergunta: "Qual a principal consequência para o Brasil da crise na Venezuela?",
    opcoes: [
      "A) Sobrecarregamento no sistema público de saúde em Roraima",
      "B) Fortalecimento do Mercosul",
      "C) Aumento de mão-de-obra qualificada",
      "D) Crescimento de investimentos estrangeiros",
    ],
    resposta: "A",
    explicacao: "Com o fluxo de venezuelanos para Roraima, estado que faz fronteira com a Venezuela, a rede pública de saúde ficou sobrecarregada.",
  },
  {
    pergunta: "Em 2018 foi o centenário da morte de qual importante poeta brasileiro?",
    opcoes: ["A) Monteiro Lobato", "B) Machado de Assis", "C) Aluísio de Azevedo", "D) Olavo Bilac"],
    resposta: "D",
    explicacao: "Olavo Bilac (1865-1918) é considerado o maior representante do Parnasianismo e escreveu a letra do Hino à Bandeira.",
  },
  {
    pergunta: 'Quem é o autor do famoso discurso "Eu tenho um sonho"?',
    opcoes: ["A) Nelson Mandela", "B) Martin Luther King", "C) Zumbi dos Palmares", "D) Barack Obama"],
    resposta: "B",
    explicacao: 'O célebre discurso "I Have a Dream" foi feito por Martin Luther King em 1963, numa manifestação civil com 250 mil pessoas.',
  },
  {
    pergunta: "Que acontecimento importante para a humanidade ocorreu em 20 de julho de 1969?",
    opcoes: [
      "A) Chegada do homem à Lua",
      "B) Fim do Apartheid",
      "C) Lançamento das bombas em Hiroshima e Nagasaki",
      "D) Envio do primeiro e-mail da história",
    ],
    resposta: "A",
    explicacao: 'Após 4 dias de viagem a bordo da Apollo 11, Neil Armstrong pisou na Lua em 20 de julho de 1969, dizendo: "Um pequeno passo para um homem; um salto gigantesco para a humanidade".',
  },
  {
    pergunta: "Quais são as maiores pandemias da história?",
    opcoes: [
      "A) Gripe espanhola e câncer",
      "B) Varíola e hipertensão",
      "C) Peste negra e covid-19",
      "D) Cólera e colesterol",
    ],
    resposta: "C",
    explicacao: "Câncer, hipertensão, colesterol e asma não são pandemias pois não são doenças contagiosas. Apenas a Peste Negra e a covid-19 são pandemias.",
  },
  {
    pergunta: "Por que as Olimpíadas de 1916, 1940 e 1944 foram canceladas?",
    opcoes: [
      "A) Atrasos nas obras dos estádios",
      "B) Roubo da tocha olímpica",
      "C) Primeira Guerra Mundial e coronavírus",
      "D) Primeira e Segunda Guerras Mundiais",
    ],
    resposta: "D",
    explicacao: "A Primeira Guerra Mundial cancelou as Olimpíadas de Berlim 1916. A Segunda Guerra Mundial cancelou as de Tóquio 1940 e Londres 1944.",
  },
  {
    pergunta: "Quem foi Abraham Weintraub?",
    opcoes: [
      "A) Ministro da Educação do Brasil entre 2019 e 2020",
      "B) Compositor de origem judaica",
      "C) Ex-agente secreto israelense",
      "D) Sociólogo e ativista brasileiro",
    ],
    resposta: "A",
    explicacao: "Abraham Weintraub foi nomeado Ministro da Educação pelo presidente Jair Bolsonaro em abril de 2019 e exonerado em junho de 2020.",
  },
  {
    pergunta: "Em quais países foi detectado o primeiro caso de covid-19 e realizada a primeira vacinação, respectivamente?",
    opcoes: [
      "A) EUA e Brasil",
      "B) China e Inglaterra",
      "C) Índia e Inglaterra",
      "D) China e EUA",
    ],
    resposta: "B",
    explicacao: "O primeiro caso de covid-19 foi detectado na China em novembro de 2019. A primeira vacinação aconteceu na Inglaterra em dezembro de 2020.",
  },
  {
    pergunta: "Qual grande escritora brasileira, ucraniana de nascimento, completaria 100 anos em 2020?",
    opcoes: [
      "A) Lygia Fagundes Telles",
      "B) Clarice Lispector",
      "C) Cecília Meireles",
      "D) Rachel de Queiroz",
    ],
    resposta: "B",
    explicacao: "Clarice Lispector nasceu na Ucrânia em 10 de dezembro de 1920. Com estilo inconfundível, é um marco da literatura brasileira.",
  },
  {
    pergunta: "Que acontecimento histórico comemorou 30 anos em 9 de novembro de 2019?",
    opcoes: [
      "A) Queda da Bastilha",
      "B) Grande depressão",
      "C) Transferência de Macau à China",
      "D) Queda do muro de Berlim",
    ],
    resposta: "D",
    explicacao: "O muro de Berlim, erguido em 1961 como símbolo da Guerra Fria, caiu em 9 de novembro de 1989.",
  },
  {
    pergunta: "Quem é a primeira santa nascida no Brasil, canonizada em 2019?",
    opcoes: [
      "A) Santa Dulce dos Pobres",
      "B) Nossa Senhora Aparecida",
      "C) Madre Teresa de Calcutá",
      "D) Rainha Santa Isabel",
    ],
    resposta: "A",
    explicacao: "Irmã Dulce, conhecida como Anjo Bom da Bahia, foi canonizada em 13 de outubro de 2019, tornando-se Santa Dulce dos Pobres.",
  },
  {
    pergunta: "Em qual das alternativas os dois filmes têm como tema a Segunda Guerra Mundial?",
    opcoes: [
      "A) Sonho de uma Noite de Verão e Macbeth: Ambição e Guerra",
      "B) A Batalha de Passchendaele e Cavalo de Guerra",
      "C) O Império do Sol e A vida é bela",
      "D) Estrelas além do tempo e Pantera Negra",
    ],
    resposta: "C",
    explicacao: "O Império do Sol (1987, Spielberg) retrata a invasão japonesa à China. A Vida é Bela (1997, Benigni) mostra um judeu e seu filho num campo de concentração nazista.",
  },
  {
    pergunta: 'A música "Construção", que fala sobre a rotina de um pedreiro, é de qual artista?',
    opcoes: [
      "A) Caetano Veloso",
      "B) Luiz Gonzaga",
      "C) Ary Barroso",
      "D) Chico Buarque",
    ],
    resposta: "D",
    explicacao: '"Construção", de Chico Buarque, foi gravada em 1971 e é uma das músicas mais marcantes da MPB, com letra rica em detalhes sobre a vida de um pedreiro.',
  },
];

// Embaralha as perguntas e retorna N delas
function getRandomQuestions(total = 5) {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, total);
}

module.exports = {
  name: "quiz",
  description: "Quiz de conhecimentos gerais!",
  commands: ["quiz"],
  usage: `${PREFIX}quiz iniciar | ${PREFIX}quiz <A, B, C ou D>`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    args,
    fullArgs,
    sendErrorReply,
    sendText,
    sendReply,
    sendWaitReact,
    sendSuccessReact,
    remoteJid,
    userJid,
  }) => {
    const subCommand = args[0]?.toLowerCase();

    // ───────────── INICIAR ─────────────
    if (subCommand === "iniciar") {
      const currentQuiz = activeQuizzes.get(remoteJid);

      if (currentQuiz) {
        return await sendErrorReply(
          `Já existe um quiz ativo neste chat!\n\n` +
            `Responda com ${PREFIX}quiz <A, B, C ou D>\n` +
            `Para cancelar: ${PREFIX}quiz cancelar`
        );
      }

      await sendWaitReact();

      const quizQuestions = getRandomQuestions(5);

      const quiz = {
        chatId: remoteJid,
        questions: quizQuestions,
        currentIndex: 0,
        score: 0,
        startedBy: userJid,
        startTime: Date.now(),
        timer: null,
      };

      const sendNextQuestion = async () => {
        const q = quiz.questions[quiz.currentIndex];
        const num = quiz.currentIndex + 1;
        const total = quiz.questions.length;

        if (quiz.timer) clearTimeout(quiz.timer);

        quiz.timer = setTimeout(async () => {
          const active = activeQuizzes.get(remoteJid);
          if (active && active.startTime === quiz.startTime) {
            const respostaCorreta = q.opcoes.find((o) => o.startsWith(q.resposta));
            await sendText(
              `⏰ *TEMPO ESGOTADO!*\n\n` +
                `A resposta correta era: *${respostaCorreta}*\n\n` +
                `💡 ${q.explicacao}\n\n` +
                `⏭️ Próxima pergunta em 3 segundos...`
            );

            quiz.currentIndex++;

            if (quiz.currentIndex >= quiz.questions.length) {
              await finishQuiz();
            } else {
              setTimeout(sendNextQuestion, 3000);
            }
          }
        }, 60000);

        await sendText(
          `🧠 *QUIZ - CONHECIMENTOS GERAIS*\n` +
            `📊 Pergunta ${num}/${total} — ` +
            `${"▓".repeat(num)}${"░".repeat(total - num)}\n\n` +
            `❓ *${q.pergunta}*\n\n` +
            `${q.opcoes.join("\n")}\n\n` +
            `⏱️ *60 segundos para responder!*\n` +
            `📝 Use: ${PREFIX}quiz A, B, C ou D`
        );
      };

      const finishQuiz = async () => {
        if (quiz.timer) clearTimeout(quiz.timer);
        activeQuizzes.delete(remoteJid);

        const total = quiz.questions.length;
        const score = quiz.score;
        const timeElapsed = Math.round((Date.now() - quiz.startTime) / 1000);
        const minutes = Math.floor(timeElapsed / 60);
        const seconds = timeElapsed % 60;
        const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        let medal = "🥉";
        if (score === total) medal = "🏆";
        else if (score >= total * 0.7) medal = "🥇";
        else if (score >= total * 0.4) medal = "🥈";

        await sendReply(
          `${medal} *FIM DO QUIZ!*\n\n` +
            `👤 *Jogador:* @${userJid.split("@")[0]}\n` +
            `✅ *Acertos:* ${score}/${total}\n` +
            `⏱️ *Tempo total:* ${timeDisplay}\n\n` +
            `🎮 Use ${PREFIX}quiz iniciar para jogar novamente!`,
          [userJid]
        );
      };

      quiz.sendNextQuestion = sendNextQuestion;
      quiz.finishQuiz = finishQuiz;

      activeQuizzes.set(remoteJid, quiz);

      await sendSuccessReact();
      await sendNextQuestion();

    // ───────────── CANCELAR ─────────────
    } else if (subCommand === "cancelar") {
      const currentQuiz = activeQuizzes.get(remoteJid);

      if (!currentQuiz) {
        return await sendErrorReply(
          `Nenhum quiz ativo!\n\nUse ${PREFIX}quiz iniciar para começar.`
        );
      }

      if (currentQuiz.timer) clearTimeout(currentQuiz.timer);
      activeQuizzes.delete(remoteJid);

      await sendText(`❌ *Quiz cancelado!*\n\nUse ${PREFIX}quiz iniciar para começar um novo.`);

    // ───────────── RESPONDER ─────────────
    } else if (fullArgs && fullArgs.trim()) {
      const currentQuiz = activeQuizzes.get(remoteJid);

      if (!currentQuiz) {
        return await sendErrorReply(
          `Nenhum quiz ativo!\n\nUse ${PREFIX}quiz iniciar para começar.`
        );
      }

      const userAnswer = fullArgs.trim().toUpperCase().replace(/[^A-D]/g, "");

      if (!["A", "B", "C", "D"].includes(userAnswer)) {
        return await sendErrorReply(
          `Resposta inválida! Use apenas *A*, *B*, *C* ou *D*.\n` +
            `Exemplo: ${PREFIX}quiz B`
        );
      }

      const q = currentQuiz.questions[currentQuiz.currentIndex];
      const isCorrect = userAnswer === q.resposta;

      if (isCorrect) {
        currentQuiz.score++;
        await sendText(
          `✅ *CORRETO!* Muito bem!\n\n` +
            `💡 ${q.explicacao}\n\n` +
            `⭐ Pontuação: *${currentQuiz.score}/${currentQuiz.questions.length}*`
        );
      } else {
        const respostaCorreta = q.opcoes.find((o) => o.startsWith(q.resposta));
        await sendText(
          `❌ *ERRADO!*\n\n` +
            `A resposta correta era: *${respostaCorreta}*\n\n` +
            `💡 ${q.explicacao}`
        );
      }

      currentQuiz.currentIndex++;

      if (currentQuiz.currentIndex >= currentQuiz.questions.length) {
        await currentQuiz.finishQuiz();
      } else {
        setTimeout(currentQuiz.sendNextQuestion, 2000);
      }

    // ───────────── INVÁLIDO ─────────────
    } else {
      throw new InvalidParameterError(
        `*Como jogar Quiz:*\n\n` +
          `• ${PREFIX}quiz iniciar - Inicia um novo quiz\n` +
          `• ${PREFIX}quiz <A/B/C/D> - Responde a pergunta atual\n` +
          `• ${PREFIX}quiz cancelar - Cancela o quiz em andamento\n\n` +
          `Exemplo: ${PREFIX}quiz A`
      );
    }
  },
};
