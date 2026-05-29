export default class Gameover extends Phaser.Scene {
  constructor() {
    super("gameover");
  }

  create() {
    const { width, height } = this.scale;

    //MÚSICA
if (!this.sound.get("gameover")) {
    const musica = this.sound.add("gameover", { 
        loop: true, 
        volume: 0.5 
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
      // Subi a posição de 0.4 para 0.3 para abrir espaço para os botões!
      .text(width / 2, height * 0.3, "GAME OVER", {
        fontSize: "60px",
        fill: "#9f88d8",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5);

    // --- BLOCO: CONFIGURAÇÃO DOS BOTÕES ---
    // Mesma lógica visual e de medidas que você usou no menu.js para manter o padrão
    const btnWidth = Math.min(420, width * 0.6);
    const btnHeight = 64;
    const btnColor = 0x9f89d9;
    const gap = 20;

    // Função auxiliar para criar os botões facilmente
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
      // Bloqueia a ação se for espectador, igualzinho ao seu código original
      if (!this.game.isSpectator) {
        // Verifica qual é o modo atual usando a variável que setamos no menu.js
        // Se for infinito: manda de volta pro "room" (ou troque aqui pro nome da cena do infinito, se for outra)
        // Se for história: manda pro "scene0" como já acontecia antes
        const targetScene = this.game.isInfiniteMode ? "room" : "scene0";

        // Avisa a sala no servidor e reinicia a cena
        this.game.socket.emit("change-scene", this.game.room, targetScene);
        this.scene.start(targetScene);
      }
    });

    // --- BLOCO: BOTÃO "MENU PRINCIPAL" ---
    createButton(width / 2, height * 0.5 + btnHeight + gap, "Menu", () => {
      // Para a tela de Game Over e volta para o Menu
      this.scene.stop("gameover");
      this.scene.start("menu");
    });
  }
}
