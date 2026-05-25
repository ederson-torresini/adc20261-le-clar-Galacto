export default class Menu extends Phaser.Scene {
  constructor() {
    super("menu");
  }

  preload() {
    this.load.setPath("assets/");
    this.load.image("phbg", "phbg.png");
  }

  create() {
    const { width, height } = this.scale;

    this.bg = this.add.image(width / 2, height / 2, "phbg");
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    this.titleText = this.add
      .text(width / 2, height * 0.15, "GALACTO", {
        fontSize: "64px",
        fill: "#9f88d8",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5);

    const btnColor = 0x9f89d9; // provided color

    const btnWidth = Math.min(420, width * 0.6);
    const btnHeight = 64;
    const startY = height * 0.4;
    const gap = 20;

    const createButton = (x, y, label, onClick) => {
      const rect = this.add
        .rectangle(x, y, btnWidth, btnHeight, btnColor)
        .setStrokeStyle(2, 0xffffff)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const txt = this.add
        .text(x, y, label, {
          fontSize: "24px",
          fill: "#ffffff",
          fontFamily: "MinhaFontePersonalizada",
        })
        .setOrigin(0.5);

      rect.on("pointerdown", () => {
        if (onClick) onClick();
      });

      return { rect, txt };
    };

    // Modo história (starts the game via room setup)
    createButton(width / 2, startY, "Modo história", () => {
      this.game.isInfiniteMode = false;
      this.scene.stop("menu");
      this.scene.start("room");
    });

    // Modo Infinito (only shown after at least one win)
    let hasWon = false;
    try {
      hasWon = !!localStorage.getItem("galacto_hasWon");
    } catch (e) {
      hasWon = false;
    }

    if (hasWon) {
      createButton(width / 2, startY + btnHeight + gap, "Modo Infinito", () => {
        this.game.isInfiniteMode = true;
        this.scene.stop("menu");
        this.scene.start("room");
      });
    }

    // Placar (does nothing for now)
    const placarY = startY + (hasWon ? 2 * (btnHeight + gap) : btnHeight + gap);
    createButton(width / 2, placarY, "Placar", () => {
      this.scene.stop("menu");
      this.scene.start("leaderboard");
    });
  }
}
