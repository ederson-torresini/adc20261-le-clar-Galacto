export default class Win extends Phaser.Scene {
  constructor() {
    super("win");
  }

  preload() {
    this.load.image("win_bg", "assets/win_bg.png");
  }

  create() {
    const { width, height } = this.scale;

    this.bg = this.add.image(width / 2, height / 2, "win_bg");
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    this.add
      .text(width / 2, height * 0.4, "Venceu!", {
        fontSize: "40px", // Diminuído de 64px para 40px
        fill: "#7e7e7e",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 8,
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5);

    // Instrução removida conforme solicitado anteriormente

    this.input.on("pointerdown", () => this.scene.start("menu"));
  }
}
