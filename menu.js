export default class Menu extends Phaser.Scene {
  constructor() {
    super("menu");
  }

  preload() {
    this.load.image("menu_bg", "assets/menu_bg.png");
  }

  create() {
    const { width, height } = this.scale;

    this.bg = this.add.image(width / 2, height / 2, "menu_bg");
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    this.titleText = this.add
      .text(width / 2, height * 0.15, "GALACTO", {
        fontSize: "80px",
        fill: "#ffffff",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada", // Fonte alterada
      })
      .setOrigin(0.5);

    this.instructionText = this.add
      .text(width / 2, height * 0.8, "Toque para Iniciar", {
        fontSize: "32px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada", // Fonte alterada
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.instructionText,
      alpha: 0,
      duration: 800,
      ease: "Power2",
      yoyo: true,
      repeat: -1,
    });

    this.input.on("pointerdown", () => {
      this.startTransition();
    });
  }

  startTransition() {
    const { height } = this.scale;

    this.tweens.add({
      targets: this.titleText,
      y: -height * 0.5,
      alpha: 0,
      duration: 1000,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.scene.start("scene0");
      },
    });

    this.instructionText.setVisible(false);
  }
}
