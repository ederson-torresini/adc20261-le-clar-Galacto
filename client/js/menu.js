// Define e exporta a cena do Menu Principal, estendendo a classe Scene do Phaser
export default class Menu extends Phaser.Scene {
  constructor() {
    // Define o identificador único dessa cena como "menu"
    super("menu");
  }

  // O método preload() é executado antes da cena abrir. Usado para carregar assets (imagens, sons, etc.) na memória.
  preload() {
    // Define a pasta base onde o jogo vai procurar os arquivos
    this.load.setPath("assets/");
    // Carrega a imagem de fundo e dá a ela a chave "menu_bg"
    this.load.image("menu_bg", "phbg.png");
  }

  // O método create() monta os elementos visuais na tela
  create() {
    // Pega as dimensões atuais da tela do jogo
    const { width, height } = this.scale;

    //MÚSICA
    if (!this.sound.get("menu")) {
      const musica = this.sound.add("menu", {
        loop: true,
        volume: 0.5,
      });
      musica.play();
    } else if (!this.sound.get("menu").isPlaying) {
      this.sound.get("menu").play();
    }

    // --- BLOCO: FUNDO (BACKGROUND) ---
    // Adiciona a imagem de fundo bem no centro da tela
    this.bg = this.add.image(width / 2, height / 2, "menu_bg");
    // Calcula a escala necessária para a imagem cobrir toda a tela, sem achatar (efeito "cover")
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    // --- BLOCO: TÍTULO DO JOGO ---
    // Cria o texto do título "GALACTO" na parte superior da tela
    this.titleText = this.add
      .text(width / 2, height * 0.15, "GALACTO", {
        fontSize: "64px",
        fill: "#67ddbd",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5); // Centraliza a âncora do texto

    // --- BLOCO: CONFIGURAÇÕES DOS BOTÕES ---
    // Define a cor padrão dos botões
    const btnColor = 0x67ddbd; // provided color

    // Calcula a largura do botão (no máximo 420px ou 60% da tela) e define altura, posição inicial e espaço entre eles
    const btnWidth = Math.min(420, width * 0.6);
    const btnHeight = 64;
    const startY = height * 0.4;
    const gap = 20;

    // --- FUNÇÃO AUXILIAR: CRIADOR DE BOTÕES ---
    // Cria uma função reutilizável para desenhar os botões na tela mais facilmente
    const createButton = (x, y, label, onClick) => {
      // Cria a forma geométrica (retângulo) do botão, com borda branca e interatividade
      const rect = this.add
        .rectangle(x, y, btnWidth, btnHeight, btnColor)
        .setStrokeStyle(2, 0xffffff)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true }); // Muda o mouse para a "mãozinha" de clique

      // Cria o texto que vai dentro do botão
      const txt = this.add
        .text(x, y, label, {
          fontSize: "24px",
          fill: "#ffffff",
          fontFamily: "MinhaFontePersonalizada",
        })
        .setOrigin(0.5);

      // Associa a ação de clique (pointerdown) no botão à função (onClick) passada como parâmetro
      rect.on("pointerdown", () => {
        // TOCA O EFEITO SONORO DO BOTÃO
        this.sound.play("button");

        if (onClick) onClick();
      });

      // Retorna os elementos criados caso precise alterá-los depois
      return { rect, txt };
    };

    // --- BLOCO: BOTÃO MODO HISTÓRIA ---
    // Cria o primeiro botão. Ao clicar, define o jogo como "não infinito" e vai para a sala de espera (room)
    createButton(width / 2, startY, "Modo historia", () => {
      this.game.isInfiniteMode = false;
      this.scene.stop("menu");
      this.scene.start("room");
    });

    // --- BLOCO: DESBLOQUEIO DO MODO INFINITO ---
    let hasWon = false;
    try {
      // Tenta ler no armazenamento do navegador (localStorage) se o jogador já venceu o modo história alguma vez
      hasWon = !!localStorage.getItem("galacto_hasWon");
    } catch (e) {
      // Previne erros caso o jogador esteja em modo anônimo ou com cookies/storage desativados
      hasWon = false;
    }

    // Se o jogador já venceu, renderiza o botão do "Modo Infinito" logo abaixo do primeiro
    if (hasWon) {
      createButton(width / 2, startY + btnHeight + gap, "Modo Infinito", () => {
        this.game.isInfiniteMode = true; // Ativa a flag de modo infinito
        this.scene.stop("menu");
        this.scene.start("room");
      });
    }

    // --- BLOCO: BOTÃO DO PLACAR ---
    // Calcula dinamicamente onde o botão de placar vai ficar
    // Se o Modo Infinito estiver aparecendo, o placar desce mais um espaço. Se não, fica logo abaixo do História.
    const placarY = startY + (hasWon ? 2 * (btnHeight + gap) : btnHeight + gap);

    // Cria o botão de Placar
    createButton(width / 2, placarY, "Placar", () => {
      this.scene.stop("menu");
      this.scene.start("leaderboard"); // Direciona para a tela de melhores pontuações
    });
  }
}
