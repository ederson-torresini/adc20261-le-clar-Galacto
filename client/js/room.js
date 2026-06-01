class room extends Phaser.Scene {
  constructor() {
    super("room");
  }

  create() {
    const { width, height } = this.scale;

    // 1. CORREÇÃO DO EFEITO FANTASMA
    // Removemos ouvintes antigos antes de criar novos para a segunda jogada
    this.game.socket.off("player-selected");

    // Pegamos a div do QR Code garantindo que estamos olhando pro HTML atualizado
    this.qrcodeContainer = document.getElementById("qr-code");

    // 2. IDENTIFICAÇÃO CORRETA DE CELULAR VS PC
    // Checa se quem acessou tem "?room=" na URL (ou seja, é o celular escaneando)
    const urlParams = new URLSearchParams(window.location.search);
    const isMobile = urlParams.has("room");

    if (isMobile) {
      // Se for o celular, assume a sala da URL e vai direto pro jogo
      // (O celular é só o controle, então não precisa passar pela cutscene)
      this.game.room = urlParams.get("room");
      this.scene.stop("room");
      this.scene.start("scene0");
      return; // Para a execução do script aqui para o celular
    }

    // --- DAQUI PRA BAIXO É O COMPORTAMENTO DO PC / TV (HOST) ---

    // Se o PC ainda não tem sala (primeira vez logando), gera um código
    // Se ele já tem (voltou do gameover), reaproveita o mesmo código!
    if (!this.game.room) {
      this.game.room = (Math.random() * 10000).toString().split(".")[0];
    }

    this.add.image(width / 2, height / 2, "room-background");

    // Define que quem está nesta tela é o JOGADOR PRINCIPAL
    this.game.isSpectator = false;

    this.add.text(50, 50, this.game.room, {
      fontFamily: "MinhaFontePersonalizada",
      fontSize: "32px",
      fill: "#483048",
    });

    // Botão de Iniciar
    const startBtn = this.add
      .text(width - 20, height / 2, "COMECAR ►", {
        fontFamily: "MinhaFontePersonalizada",
        fontSize: "18px",
        fill: "#ffffff",
        backgroundColor: "#080a29",
        padding: { x: 15, y: 10 },
      })
      .setOrigin(1, 0.5)
      .setInteractive();

    startBtn.on("pointerdown", () => {
      // 3. CORREÇÃO DO DOM DO QR CODE
      // Em vez de .remove() (que deleta pra sempre), apenas escondemos a div
      if (this.qrcodeContainer) {
        this.qrcodeContainer.style.display = "none";
      }
      this.game.socket.emit("start-game", this.game.room);
      this.scene.stop("room");
      // MUDANÇA AQUI: Agora o botão "Começar" manda pra Cutscene ao invés da scene0
      this.scene.start("cutscene");
    });

    // Gerar ou atualizar o QR Code
    if (this.qrcodeContainer) {
      // Limpa qualquer QR anterior (caso seja a segunda vez) e garante que fique visível
      this.qrcodeContainer.innerHTML = "";
      this.qrcodeContainer.style.display = "block";

      // Limpa a URL base pra não acumular ?room=
      const cleanUrl = location.origin + location.pathname;

      new QRCode(this.qrcodeContainer, {
        text: cleanUrl + "?room=" + this.game.room,
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

      // Esconde a div do QR code igual fizemos no botão COMECAR
      if (this.qrcodeContainer) {
        this.qrcodeContainer.style.display = "none";
      }

      this.scene.stop("room");
      this.scene.start("cutscene"); // Aqui já estava certinho!
    });
  }
}

export default room;
