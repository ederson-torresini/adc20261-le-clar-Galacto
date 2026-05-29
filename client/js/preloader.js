class preloader extends Phaser.Scene {
  constructor() {
    super("preloader");
  }

  init() {
    // TRANCA A TELA EM MODO PAISAGEM
    if (this.scale.lockOrientation) {
      this.scale.lockOrientation("landscape");
    }

    const { width, height } = this.scale;

    // Fundo centralizado e redimensionado para cobrir a tela (como no seu original, mas dinâmico)
    this.add
      .image(width / 2, height / 2, "menu_bg")
      .setDisplaySize(width, height);
  }

  preload() {
    const { width, height } = this.scale;

    const barWidth = 468;
    const barHeight = 32;

    // Borda da barra na cor 0x67ddbd
    this.add
      .rectangle(width / 2, height / 2 + 50, barWidth, barHeight)
      .setStrokeStyle(1, 0x67ddbd);

    // Preenchimento da barra na cor 0x67ddbd
    const bar = this.add.rectangle(
      width / 2 - (barWidth / 2 - 4),
      height / 2 + 50,
      4,
      barHeight - 4,
      0x67ddbd,
    );

    this.load.on("progress", (progress) => {
      bar.width = 4 + (barWidth - 8) * progress;
    });

    // --- CARREGAMENTO DOS ASSETS ---
    this.load.setPath("assets/");
    this.load.image("phbg", "phbg.png");
    this.load.image("menu_bg", "menu_bg.png");
    this.load.image("logo", "pixel-art.png");
    this.load.spritesheet("player", "player.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image("way_f", "way_f.png");
    this.load.image("way_l", "way_l.png");
    this.load.image("way_r", "way_r.png");
    this.load.image("spaceship_new", "spaceship_new.png");
    this.load.audio("trick", "trick.mp3");
    this.load.audio("button", "button.mp3");
    this.load.audio("swoosh", "swoosh.mp3");
    this.load.audio("soundtrack", "soundtrack.mp3");
    this.load.audio("menu", "menu.mp3");
    this.load.audio("win", "win.mp3");
    this.load.audio("gameover", "gameover.mp3");
    this.load.image("aster_1", "aster_1.png");
    this.load.image("aster_2", "aster_2.png");
    this.load.image("aster_3", "aster_3.png");
    this.load.image("room-background", "room-background.png");
  }

  create() {
    const { width, height } = this.scale;

    if (this.game.room) {
      // JOGADOR 2+ (Entrou via QR Code)
      this.game.isSpectator = true;

      this.add
        .text(
          width / 2,
          height / 2,
          "Aguardando o primeiro jogador iniciar...",
          {
            fontSize: "28px",
            fill: "#67ddbd",
            fontFamily: "MinhaFontePersonalizada",
          },
        )
        .setOrigin(0.5);

      this.game.socket.on("start-game", () => {
        this.scene.start("scene0");
      });
    } else {
      // Se for o Host, vai direto para o menu
      this.scene.stop("preloader");
      this.scene.start("menu");
    }
  }
}

export default preloader;
