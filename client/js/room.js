class room extends Phaser.Scene {
  constructor() {
    super("room");
    this.qrcodeContainer = document.getElementById("qr-code");
  }

  create() {
    if (this.game.room) {
      this.scene.stop("room");
      this.scene.start("player");
    } else {
      this.add.image(400, 225, "room-background");
      this.game.room = (Math.random() * 10000).toString().split(".")[0];
      this.add.text(50, 50, this.game.room, {
        fontFamily: "MinhaFontePersonalizada",
        fontSize: "32px",
        fill: "#7e7e7e",
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

      this.qrcodeContainer.remove();

      this.scene.stop("room");
      
      this.scene.start("scene0");
    });
  }
}

export default room;
