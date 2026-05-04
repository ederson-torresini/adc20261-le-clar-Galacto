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
      .text(width / 2, height * 0.4, "MISSÃO CUMPRIDA!", {
        fontSize: "40px",
        fill: "#7e7e7e",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada", // Borda removida aqui
      })
      .setOrigin(0.5);

    this.input.on("pointerdown", () => this.scene.start("menu"));
  }
}
