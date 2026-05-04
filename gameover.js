export default class Gameover extends Phaser.Scene {
  constructor() {
    super("gameover");
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

    this.add
      .text(width / 2, height * 0.4, "GAME OVER", {
        fontSize: "60px",
        fill: "#ff0000",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada", // Fonte alterada
      })
      .setOrigin(0.5);

    const restartText = this.add
      .text(width / 2, height * 0.6, "Toque para Tentar Novamente", {
        fontSize: "24px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada", // Fonte alterada
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: restartText,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.input.on("pointerdown", () => {
      this.scene.start("scene0");
    });
  }
}
