export default class NameEntry extends Phaser.Scene {
  constructor() {
    super("nameentry");
    this.domElements = [];
    this.resizeHandler = null;
  }

  create() {
    this.cleanupDom();
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x050717, 0.95).setOrigin(0);

    this.add
      .text(width / 2, height * 0.2, "Fim de jogo - Modo Infinito", {
        fontSize: "44px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const result = this.game.lastInfiniteResult || { score: 0, time: 0 };
    this.add
      .text(
        width / 2,
        height * 0.32,
        `Pontos: ${result.score}  ·  Tempo: ${result.time}s`,
        {
          fontSize: "28px",
          fill: "#ffff00",
          fontFamily: "MinhaFontePersonalizada",
        },
      )
      .setOrigin(0.5);

    const inputLabel = this.add
      .text(width / 2, height * 0.42, "Digite seu nome:", {
        fontSize: "26px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5);

    const button = document.createElement("button");
    button.textContent = "Enviar";
    button.style.position = "absolute";
    button.style.padding = "14px 24px";
    button.style.fontSize = "18px";
    button.style.fontFamily = "MinhaFontePersonalizada, sans-serif";
    button.style.background = "#6f5cf0";
    button.style.color = "#ffffff";
    button.style.border = "none";
    button.style.borderRadius = "12px";
    button.style.cursor = "pointer";
    button.style.outline = "none";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Seu nome";
    input.maxLength = 16;
    input.autocomplete = "off";
    input.style.position = "absolute";
    input.style.padding = "14px 16px";
    input.style.fontSize = "18px";
    input.style.fontFamily = "MinhaFontePersonalizada, sans-serif";
    input.style.border = "2px solid #ffffff";
    input.style.borderRadius = "12px";
    input.style.background = "rgba(255,255,255,0.1)";
    input.style.color = "#ffffff";
    input.style.outline = "none";
    input.style.width = "320px";

    const info = document.createElement("div");
    info.textContent = "Os melhores jogadores aparecem no placar por 13 horas.";
    info.style.position = "absolute";
    info.style.color = "#d0d0ff";
    info.style.fontFamily = "MinhaFontePersonalizada, sans-serif";
    info.style.fontSize = "16px";
    info.style.textAlign = "center";
    info.style.width = "360px";

    const updateDomPlacement = () => {
      const rect = this.game.canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.55;
      input.style.left = `${centerX - 160}px`;
      input.style.top = `${centerY - 28}px`;
      button.style.left = `${centerX - 55}px`;
      button.style.top = `${centerY + 52}px`;
      info.style.left = `${centerX - 180}px`;
      info.style.top = `${centerY + 110}px`;
    };

    document.body.appendChild(input);
    document.body.appendChild(button);
    document.body.appendChild(info);
    this.domElements.push(input, button, info);
    updateDomPlacement();

    this.resizeHandler = () => updateDomPlacement();
    window.addEventListener("resize", this.resizeHandler);

    this.submitHandler = () => this.submitName(input.value.trim());
    this.keydownHandler = (event) => {
      if (event.key === "Enter") {
        this.submitName(input.value.trim());
      }
    };

    button.addEventListener("click", this.submitHandler);
    input.addEventListener("keydown", this.keydownHandler);

    input.focus();
  }

  submitName(name) {
    if (!name) return;
    const result = this.game.lastInfiniteResult || { score: 0, time: 0 };
    this.scoreConnectHandler = () => {
      this.game.socket.emit("submit-score", {
        name,
        points: result.score,
        time: result.time,
      });
    };

    if (this.game.socket.connected) {
      this.scoreConnectHandler();
      this.scoreConnectHandler = null;
    } else {
      this.game.socket.once("connect", this.scoreConnectHandler);
    }

    this.cleanupDom();
    this.scene.start("leaderboard");
  }

  cleanupDom() {
    this.domElements.forEach((el) => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    this.domElements = [];
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.scoreConnectHandler) {
      this.game.socket.off("connect", this.scoreConnectHandler);
      this.scoreConnectHandler = null;
    }
  }

  shutdown() {
    this.cleanupDom();
  }

  destroy() {
    this.cleanupDom();
    super.destroy();
  }
}
