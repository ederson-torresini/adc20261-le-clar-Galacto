export default class Gameover extends Phaser.Scene {
  constructor() {
    super("gameover");
  }

  // Game Over screen showing retry and menu options.
  create() {
    const { width, height } = this.scale;

    // --- BLOCO: MÚSICA ---
    if (!this.sound.get("gameover")) {
      const musica = this.sound.add("gameover", {
        loop: true,
        volume: 0.5,
      });
      musica.play();
    } else if (!this.sound.get("gameover").isPlaying) {
      this.sound.get("gameover").play();
    }

    // --- BLOCO: FUNDO ---
    this.bg = this.add.image(width / 2, height / 2, "phbg");
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);
    // Retângulo semi-transparente para escurecer o fundo
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);

    // --- BLOCO: TÍTULO ---
    this.add
      .text(width / 2, height * 0.3, "GAME OVER", {
        fontSize: "60px",
        fill: "#9f88d8",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5);

    // --- BLOCO: CONFIGURAÇÃO DOS BOTÕES ---
    const btnWidth = Math.min(420, width * 0.6);
    const btnHeight = 64;
    const btnColor = 0x9f89d9;
    const gap = 20;

    const createButton = (x, y, label, onClick) => {
      const rect = this.add
        .rectangle(x, y, btnWidth, btnHeight, btnColor)
        .setStrokeStyle(2, 0xffffff)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const txt = this.add
        .text(x, y, label, {
          fontSize: "24px",
          fill: "#ffffff",
          fontFamily: "MinhaFontePersonalizada",
        })
        .setOrigin(0.5);

      rect.on("pointerdown", () => {
        if (onClick) onClick();
      });

      return { rect, txt };
    };

    // --- BLOCO: BOTÃO "JOGAR NOVAMENTE" ---
    createButton(width / 2, height * 0.5, "Jogar Novamente", () => {
      if (!this.game.isSpectator) {
        // For story mode, go to cutscene. For infinite mode, ask for name and start a new infinite match.
        if (this.game.isInfiniteMode) {
          this.cleanup();
          this.scene.start("nameentry", { prestart: true });
        } else {
          // story mode retry
          this.scene.start("cutscene", { isRetry: true });
        }
      }
    });

    // --- BLOCO: BOTÃO "MENU PRINCIPAL" ---
    createButton(width / 2, height * 0.5 + btnHeight + gap, "Menu", () => {
      // Para a música de Game Over antes de voltar ao menu (opcional, mas recomendado)
      if (this.sound.get("gameover")) {
        this.sound.get("gameover").stop();
      }

      this.scene.stop("gameover");
      this.scene.start("menu");
    });
  }

  cleanup() {
    // Stop the running game scene if the player is retrying, then silence the game over audio.
    try {
      if (this.scene.isActive("scene0")) {
        this.scene.stop("scene0");
      }
    } catch (e) {
      console.warn("Error stopping scene0 during cleanup:", e);
    }
    const gameoverSound = this.sound.get("gameover");
    if (gameoverSound && gameoverSound.isPlaying) {
      gameoverSound.stop();
    }
  }
}
