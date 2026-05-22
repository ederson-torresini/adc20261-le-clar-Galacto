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
        fill: "#7e7e7e",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5);

    this.input.on("pointerdown", () => {
      if (!this.game.isSpectator) {
        this.game.socket.emit("change-scene", this.game.room, "scene0");
        this.scene.start("scene0");
      }
    });
  }
}
