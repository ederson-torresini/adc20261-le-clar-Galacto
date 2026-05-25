export default class Leaderboard extends Phaser.Scene {
  constructor() {
    super("leaderboard");
    this.domElements = [];
    this.resizeHandler = null;
  }

  init() {
    this.leaderboard = [];
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x050717, 0.95).setOrigin(0);

    this.add
      .text(width / 2, height * 0.1, "PLACAR", {
        fontSize: "52px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const info = this.add
      .text(
        width / 2,
        height * 0.18,
        "Melhor pontuação e tempo dos últimos 13 horas",
        {
          fontSize: "20px",
          fill: "#c0c0ff",
          fontFamily: "MinhaFontePersonalizada",
        },
      )
      .setOrigin(0.5);

    this.entriesText = this.add
      .text(width / 2, height * 0.27, "Carregando...", {
        fontSize: "22px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada",
        align: "center",
      })
      .setOrigin(0.5, 0);

    const backBtn = this.add
      .text(width / 2, height * 0.92, "VOLTAR", {
        fontSize: "28px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada",
        backgroundColor: "#6f5cf0",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backBtn.on("pointerdown", () => {
      this.scene.stop("leaderboard");
      this.scene.start("menu");
    });

    this.leaderboardHandler = (leaderboard) => {
      this.leaderboard = Array.isArray(leaderboard) ? leaderboard : [];
      this.updateLeaderboardText();
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    };

    this.connectHandler = () => {
      requestLeaderboard();
    };

    const requestLeaderboard = () => {
      this.game.socket.on("leaderboard-data", this.leaderboardHandler);
      this.game.socket.emit("request-leaderboard");
      this.timeoutId = window.setTimeout(() => {
        this.entriesText.setText(
          "Falha ao carregar o placar. Tente novamente mais tarde.",
        );
      }, 2500);
    };

    if (this.game.socket.connected) {
      requestLeaderboard();
    } else {
      this.game.socket.once("connect", this.connectHandler);
    }
  }

  shutdown() {
    if (this.leaderboardHandler) {
      this.game.socket.off("leaderboard-data", this.leaderboardHandler);
      this.leaderboardHandler = null;
    }
    if (this.connectHandler) {
      this.game.socket.off("connect", this.connectHandler);
      this.connectHandler = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  updateLeaderboardText() {
    if (!this.leaderboard.length) {
      this.entriesText.setText("Nenhum resultado registrado ainda.");
      return;
    }

    const formatted = this.leaderboard
      .slice(0, 10)
      .map((entry, index) => {
        return `${index + 1}. ${entry.name} — ${entry.points} pts — ${entry.time}s`;
      })
      .join("\n\n");

    this.entriesText.setText(formatted);
  }
}
