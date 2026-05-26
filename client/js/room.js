class room extends Phaser.Scene {
  constructor() {
    super("room");
    this.qrcodeContainer = document.getElementById("qr-code");
  }

  create() {
    const { width, height } = this.scale;

    if (this.game.room) {
      this.scene.stop("room");
      this.scene.start("player");
    } else {
      this.add.image(width / 2, height / 2, "room-background");

      this.game.room = (Math.random() * 10000).toString().split(".")[0];

      // Define que quem está nesta tela é o JOGADOR PRINCIPAL
      this.game.isSpectator = false;

      this.add.text(50, 50, this.game.room, {
        fontFamily: "MinhaFontePersonalizada",
        fontSize: "32px",
        fill: "#483048",
      });

      // Botão menor, posicionado na lateral direita da tela
      const startBtn = this.add
        .text(width - 20, height / 2, "COMECAR ►", {
          fontFamily: "MinhaFontePersonalizada",
          fontSize: "18px",
          fill: "#ffffff",
          backgroundColor: "#080a29",
          padding: { x: 15, y: 10 },
        })
        .setOrigin(1, 0.5)
        .setInteractive(); // O Origin 1, 0.5 ancora o botão na direita e no centro

      startBtn.on("pointerdown", () => {
        if (this.qrcodeContainer) this.qrcodeContainer.remove();
        this.game.socket.emit("start-game", this.game.room);
        this.scene.stop("room");
        this.scene.start("scene0");
      });

      new QRCode(this.qrcodeContainer, {
        text: location.href + "?room=" + this.game.room,
        width: 450,
        height: 450,
        colorDark: "#000000",
        colorLight: "#ffffff",
      });
    }

    console.log("Joining room:", this.game.room);
    this.game.socket.emit("join-room", this.game.room);

    this.game.socket.on("player-selected", (player) => {
      console.log(
        "Player selected in room:",
        this.game.room,
        "player:",
        player,
      );

      if (player === "android") this.game.localPlayer = "character";
      else this.game.localPlayer = "android";

      if (this.qrcodeContainer) this.qrcodeContainer.remove();

      this.scene.stop("room");

      this.scene.start("scene0");
    });
  }
}

export default room;
