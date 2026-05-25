export default class Win extends Phaser.Scene {
  constructor() {
    super("win");
  }

  create() {
    const { width, height } = this.scale;
    this.bg = this.add.image(width / 2, height / 2, "phbg");
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    this.add
      .text(width / 2, height * 0.4, "Venceu!", {
        fontSize: "40px",
        fill: "#9f88d8",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada", // Borda removida aqui
      })
      .setOrigin(0.5);

    this.input.on("pointerdown", () => {
      if (!this.game.isSpectator) {
        try {
          localStorage.setItem("galacto_hasWon", "1");
        } catch (e) {
          // ignore
        }
        this.game.socket.emit("change-scene", this.game.room, "start");
        this.scene.start("start");
      }
    });
  }
}
