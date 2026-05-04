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
        fill: "#7e7e7e", // Cor alterada
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5);

    // Instrução removida conforme solicitado

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
  }
}
