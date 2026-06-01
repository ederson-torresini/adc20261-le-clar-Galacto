export default class Cutscene extends Phaser.Scene {
  constructor() {
    super("cutscene");
  }

  init(data) {
    // Recebe parâmetros para saber se é um retry do GameOver
    this.isRetry = data && data.isRetry;
  }

  create() {
    // 1. CHECAGEM DE BLOQUEIO (Modo Infinito ou Jogar Novamente)
    if (this.game.isInfiniteMode || this.isRetry) {
      this.scene.start("scene0");
      return;
    }

    const { width, height } = this.scale;
    this.isTransitioning = false;

    this.cameras.main.setBackgroundColor("#000000");

    // 2. CONFIGURAR IMAGENS DA CUTSCENE
    // Troque as keys pelas imagens reais que você carregou no preloader
    const imageKeys = ["cutscene_1", "cutscene_2", "cutscene_3", "cutscene_4"];
    this.images = imageKeys.map((key) => {
      const img = this.add.image(width / 2, height / 2, key).setAlpha(0);
      // Ajusta o tamanho da imagem para cobrir a tela (opcional)
      const scale = Math.max(width / img.width, height / img.height);
      img.setScale(scale);
      return img;
    });

    // 3. INICIAR TRANSIÇÕES BÁSICAS (Fade in, Hold, Fade out)
    this.playImage(0);

    // 4. UI DO SISTEMA DE PULAR (HOLD-TO-SKIP)
    this.holdProgress = 0;
    this.holdTween = null;

    this.skipGraphics = this.add.graphics().setDepth(100);
    this.skipText = this.add
      .text(width - 60, height - 110, "Pular", {
        fontSize: "18px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100);

    // 5. EVENTOS DE TOQUE/MOUSE
    this.input.on("pointerdown", () => {
      if (this.isTransitioning) return;

      this.holdTween = this.tweens.add({
        targets: this,
        holdProgress: 1,
        duration: 1500, // 1.5 segundos segurando para pular
        onUpdate: () => this.drawSkipRing(),
        onComplete: () => {
          this.finishCutscene();
        },
      });
    });

    this.input.on("pointerup", () => this.cancelSkip());
    // Caso o dedo saia da tela
    this.input.on("pointerout", () => this.cancelSkip());
  }

  playImage(index) {
    if (this.isTransitioning) return;

    if (index >= this.images.length) {
      this.finishCutscene();
      return;
    }

    // Fade in suave, espera 2 segundos, Fade out suave
    this.tweens.add({
      targets: this.images[index],
      alpha: 1,
      duration: 1000,
      hold: 2500,
      yoyo: true,
      onComplete: () => {
        this.playImage(index + 1);
      },
    });
  }

  cancelSkip() {
    if (this.holdTween && this.holdTween.isPlaying()) {
      this.holdTween.stop();
    }
    this.holdProgress = 0;
    this.drawSkipRing();
  }

  drawSkipRing() {
    this.skipGraphics.clear();

    if (this.holdProgress > 0 && !this.isTransitioning) {
      const x = this.scale.width - 60;
      const y = this.scale.height - 60;
      const radius = 30;

      // Fundo da rodinha (cinza escuro transparente)
      this.skipGraphics.lineStyle(6, 0x000000, 0.6);
      this.skipGraphics.strokeCircle(x, y, radius);

      // Progresso da rodinha (branco)
      this.skipGraphics.lineStyle(6, 0xffffff, 1);
      this.skipGraphics.beginPath();
      // O arco começa em -90 graus (topo) e vai até o progresso atual
      this.skipGraphics.arc(
        x,
        y,
        radius,
        Phaser.Math.DegToRad(-90),
        Phaser.Math.DegToRad(-90 + 360 * this.holdProgress),
        false,
      );
      this.skipGraphics.strokePath();

      this.skipText.setAlpha(1);
    } else {
      this.skipText.setAlpha(0);
    }
  }

  finishCutscene() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Um fade preto rápido antes de jogar pra cena do jogo pra não ficar seco
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("scene0");
    });
  }
}
