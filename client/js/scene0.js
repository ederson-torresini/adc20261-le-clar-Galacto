// Define e exporta a cena principal do jogo, estendendo a classe Scene do Phaser
export default class Scene0 extends Phaser.Scene {
  constructor() {
    // Define o identificador (chave) dessa cena como "scene0"
    super("scene0");
  }

  create() {
    // Captura a largura e altura da tela do jogo
    const { width, height } = this.scale;

    // Grupo que vai guardar os elementos do mundo do jogo (pista, jogador, asteroides)
    this.worldLayer = this.add.group();

    // Cria um gerador de números aleatórios sincronizado usando a sala (room) como "semente" (seed)
    // Isso garante que a pista gerada seja idêntica para todos os jogadores na mesma sala
    this.random = new Phaser.Math.RandomDataGenerator([
      this.game.room || "default",
    ]);

    // Define a cor de fundo da câmera principal (um azul bem escuro)
    this.cameras.main.setBackgroundColor(0x080a29);

    // --- BLOCO: CRIAÇÃO DO FUNDO ESTRELADO ---
    // Cria um gráfico temporário para desenhar 200 estrelinhas (círculos brancos)
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 200; i++) {
      graphics.fillCircle(
        this.random.integerInRange(0, 512),
        this.random.integerInRange(0, 512),
        this.random.realInRange(0, 2),
      );
    }
    // Transforma esse desenho de estrelas em uma textura reutilizável chamada "starfield"
    graphics.generateTexture("starfield", 512, 512);

    // Cria um fundo infinito (tileSprite) usando o "starfield", configurado para ficar no fundo (depth: -4)
    this.bgStars = this.add
      .tileSprite(
        width / 2,
        height / 2,
        Math.max(width, height) * 2,
        Math.max(width, height) * 2,
        "starfield",
      )
      .setScrollFactor(0) // Faz o fundo ficar fixo na tela para a câmera
      .setDepth(-4);

    // Arrays para guardar as peças da pista e os asteroides gerados
    this.roadPieces = [];
    this.asteroids = [];

    // Calcula o tamanho que cada pedaço da pista deve ter baseado na largura da tela
    const texture = this.textures.get("way_f").getSourceImage();
    const roadScale = (width / texture.width) * 0.4;
    this.gridSize = Math.round(texture.height * roadScale);

    // Variáveis de controle para a geração procedural da pista
    this.trackCursor = { x: 0, y: 0, dir: "UP" }; // Posição e direção onde a próxima peça será criada
    this.straightPiecesCount = 0; // Quantidade de peças retas seguidas já criadas
    this.justTurned = false; // Flag para evitar curvas coladas uma na outra
    this.turnHistory = 0; // Histórico para equilibrar curvas pra esquerda/direita

    // --- BLOCO: ZONA SEGURA (SAFE ZONE) ---
    // Impede que o jogador perca logo nos primeiros segundos de jogo
    this.safeZoneActive = true;
    this.safeZoneTime = 3; // segundos de invencibilidade inicial
    this.safeZoneRemaining = this.safeZoneTime;
    // Define a quantidade de peças retas no início dependendo do modo de jogo
    this.safeStraightPieces = this.isInfiniteMode ? 14 : 20;
    this.safeStraightGenerated = 0;

    // --- BLOCO: ATRIBUTOS DO JOGO E JOGADOR ---
    this.speed = 550; // Velocidade inicial do jogador
    this.maxTime = 90; // Tempo máximo de jogo no modo história
    this.timeElapsed = 0; // Tempo que já passou
    this.isGameOver = false; // Flag para saber se o jogo acabou

    this.score = 0; // Pontuação atual
    this.targetScore = 1500; // Pontuação necessária para vencer no modo história
    this.isDoingTrick = false; // Flag se o jogador está fazendo uma manobra
    this.trickCooldown = false; // Tempo de recarga para não espamar manobras

    // Configurações do modo de jogo (História vs Infinito)
    this.isInfiniteMode = !!this.game.isInfiniteMode;
    this.maxTime = this.isInfiniteMode ? Infinity : 90;
    this.targetScore = this.isInfiniteMode ? null : 1500;

    // Adiciona e dá play na música de fundo
    this.bgMusic = this.sound.add("soundtrack", { loop: true, volume: 0.5 });
    this.bgMusic.play();

    // Gera os primeiros 40 blocos da pista antes do jogo começar a rodar
    for (let i = 0; i < 40; i++) this.generateTrackPiece();

    // --- BLOCO: ENTIDADES PRINCIPAIS (CARRIER E PLAYER) ---
    // O "carrier" é um objeto invisível (ou guia) que percorre a pista de forma perfeita.
    // A câmera segue o carrier, e o jogador se move em relação a ele.
    this.carrier = this.physics.add.sprite(0, 0, "spaceship_new").setDepth(9);
    this.carrier.setScale((this.gridSize / this.carrier.width) * 0.6);
    this.carrierTravelDir = "UP"; // Direção em que o guia está viajando
    this.carrier.lastTurnedPiece = null;
    this.worldLayer.add(this.carrier);

    // Cria o sprite visual do jogador
    this.player = this.physics.add
      .sprite(0, 0, "player")
      .setDepth(10)
      .setScale(3);
    this.player.setFrame(0);
    this.worldLayer.add(this.player);

    // Controles de inclinação visual da nave do jogador
    this.playerLeanAngle = 0;
    this.leanDirection = "NONE";
    this.leanSpeed = 190;

    // --- BLOCO: INTERFACE DE USUÁRIO (UI) ---
    // Texto de tempo
    this.timeText = this.add
      .text(
        30,
        30,
        this.isInfiniteMode ? `Tempo: 0s` : `Tempo: ${this.maxTime}s`,
        {
          fontSize: "29px",
          fill: "#ffffff",
          fontFamily: "MinhaFontePersonalizada",
        },
      )
      .setDepth(100)
      .setScrollFactor(0); // ScrollFactor 0 faz o texto fixar na tela (UI)

    // Texto de pontuação
    this.scoreText = this.add
      .text(
        30,
        70,
        this.isInfiniteMode ? `Pontos: 0` : `Pontos: 0 / ${this.targetScore}`,
        {
          fontSize: "24px",
          fill: "#ffff00",
          fontFamily: "MinhaFontePersonalizada",
        },
      )
      .setDepth(100)
      .setScrollFactor(0);

    // Texto de dica para testes
    this.testHintText = this.add
      .text(30, 105, "Pressione E para teste", {
        fontSize: "16px",
        fill: "#aaaaaa",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setDepth(100)
      .setScrollFactor(0);

    // Texto do tempo de zona segura restante
    this.safeZoneText = this.add
      .text(30, 130, `Zona segura: ${this.safeZoneRemaining.toFixed(1)}s`, {
        fontSize: "22px",
        fill: "#00ff00",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setDepth(100)
      .setScrollFactor(0);

    // --- BLOCO: CONFIGURAÇÃO DAS CÂMERAS ---
    // A câmera principal vai ignorar a UI para não renderizá-la no mundo
    this.cameras.main.ignore(this.timeText);
    this.cameras.main.ignore(this.scoreText);
    this.cameras.main.ignore(this.testHintText);
    this.cameras.main.ignore(this.safeZoneText);

    // Faz a câmera principal seguir o 'carrier' com um pouco de suavidade (0.1, 0.1)
    this.cameras.main.startFollow(this.carrier, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.75); // Afasta um pouco a câmera
    this.cameras.main.setFollowOffset(0, height * 0.4); // Desloca o foco para o jogador aparecer mais embaixo na tela

    // Cria uma segunda câmera estática (UI Cam) exclusiva para desenhar os Textos da Interface
    this.uiCam = this.cameras.add(0, 0, width, height);
    this.uiCam.ignore([this.bgStars, this.worldLayer]); // Ignora o jogo, renderiza só a UI

    // --- BLOCO: CONTROLES MOBILE (Toque e Arraste) ---
    // O PONTO CHAVE: Espectador não emite comandos
    // Use swipe-up for trick, taps for left/right turn
    this.pointerGesture = { downX: 0, downY: 0, downTime: 0, moved: false };

    // Ao encostar na tela
    this.input.on("pointerdown", (pointer) => {
      // Ignora se for fim de jogo, espectador ou se estiver na zona segura
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive)
        return;
      this.pointerGesture.downX = pointer.x;
      this.pointerGesture.downY = pointer.y;
      this.pointerGesture.downTime = performance.now();
      this.pointerGesture.moved = false;
    });

    // Ao mover o dedo na tela
    this.input.on("pointermove", (pointer) => {
      if (!this.pointerGesture.downTime) return;
      const dx = Math.abs(pointer.x - this.pointerGesture.downX);
      const dy = Math.abs(pointer.y - this.pointerGesture.downY);
      if (dx > 10 || dy > 10) this.pointerGesture.moved = true;
    });

    // Ao soltar o dedo da tela (Resolve a ação)
    this.input.on("pointerup", (pointer) => {
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive) {
        this.pointerGesture.downTime = 0;
        return;
      }

      const downX = this.pointerGesture.downX;
      const downY = this.pointerGesture.downY;
      const upX = pointer.x;
      const upY = pointer.y;
      const dx = upX - downX;
      const dy = upY - downY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const swipeThresh = 60; // pixels necessários para considerar um "arraste"

      // Se arrastou pra cima (swipe up) faz manobra
      if (downY - upY > swipeThresh && absDy > absDx) {
        this.startTrick();
        this.game.socket.emit("player-action", this.game.room, {
          type: "trick",
        });
      } else {
        // Se foi só um clique (tap), decide a curva pela metade da tela clicada
        const isRight = upX > width / 2;
        const turn = isRight ? "RIGHT" : "LEFT";
        this.attemptTurn(turn);
        this.game.socket.emit("player-action", this.game.room, {
          type: "turn",
          data: { turn },
        });
      }

      this.pointerGesture.downTime = 0; // Reseta o gesto
    });

    // --- BLOCO: CONTROLES DE TECLADO (PC/Testes) ---
    // Curva para Esquerda
    this.input.keyboard.on("keydown-A", () => {
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive)
        return;
      const turn = "LEFT";
      this.attemptTurn(turn);
      this.game.socket.emit("player-action", this.game.room, {
        type: "turn",
        data: { turn },
      });
    });

    // Curva para Direita
    this.input.keyboard.on("keydown-D", () => {
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive)
        return;
      const turn = "RIGHT";
      this.attemptTurn(turn);
      this.game.socket.emit("player-action", this.game.room, {
        type: "turn",
        data: { turn },
      });
    });

    // Fazer manobra
    this.input.keyboard.on("keydown-W", () => {
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive)
        return;
      this.startTrick();
      this.game.socket.emit("player-action", this.game.room, {
        type: "trick",
      });
    });

    // Botão de Cheat/Teste para ganhar pontos e acelerar o fim do jogo
    this.input.keyboard.on("keydown-E", () => {
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive)
        return;

      this.score = 1500;
      if (this.isInfiniteMode) {
        this.timeElapsed = 10;
        this.timeText.setText(`Tempo: ${Math.ceil(this.timeElapsed)}s`);
        this.scoreText.setText(`Pontos: ${this.score}`);
      } else {
        this.timeElapsed = Math.max(0, this.maxTime - 10);
        const remainingTime = Math.max(0, this.maxTime - this.timeElapsed);
        this.timeText.setText(`Tempo: ${Math.ceil(remainingTime)}s`);
        this.scoreText.setColor("#00ff00");
        this.scoreText.setText(`Pontos: ${this.score} / ${this.targetScore}`);
      }
    });

    // --- BLOCO: MULTIPLAYER / RECEPÇÃO DO SOCKET ---
    // Escuta atualizações da cena vindas do host
    this.game.socket.on("scene0", (state) => {
      // Apenas espectadores consomem esse estado pesado
      if (!this.game.isSpectator) return;
      if (!state || typeof state !== "object") return;

      // Sincroniza gravidade e guarda o estado global do host para ser usado no update()
      if ("gravity" in state && state.gravity != null) {
        this.physics.world.gravity.y = state.gravity;
      }
      this.lastHostState = state;
    });

    // Desativa a captura de inputs se for um espectador
    if (this.game.isSpectator) {
      this.input.enabled = false;
    }
  }

  // --- MÉTODOS DA CLASSE ---

  // Lida com o fim da cena, avisando o servidor (se for o host) e trocando de tela
  endGame(sceneKey) {
    if (!this.game.isSpectator) {
      this.game.socket.emit("change-scene", this.game.room, sceneKey);
    }
    this.scene.start(sceneKey);
  }

  // Lógica de iniciar uma manobra (trick)
  startTrick() {
    // Bloqueia a manobra sob certas condições
    if (
      this.isGameOver ||
      this.safeZoneActive ||
      this.isDoingTrick ||
      this.trickCooldown ||
      this.leanDirection !== "NONE"
    )
      return;

    this.isDoingTrick = true;
    this.trickCooldown = true;
    this.sound.play("swoosh"); // Toca efeito sonoro

    // Faz uma animação (Tween) girando o player 360 graus
    this.tweens.add({
      targets: this.player,
      angle: this.player.angle + 360,
      duration: 1400,
      ease: "Cubic.easeOut",
      onComplete: () => {
        // O que acontece quando o giro terminar
        if (this.isGameOver) return;

        this.isDoingTrick = false;
        this.score += 300; // Soma pontos

        // Atualiza a cor e o texto do placar baseado no modo de jogo
        if (!this.isInfiniteMode) {
          if (this.score >= this.targetScore) {
            this.scoreText.setColor("#00ff00"); // Fica verde se bateu a meta
          }
          this.scoreText.setText(`Pontos: ${this.score} / ${this.targetScore}`);
        } else {
          this.scoreText.setText(`Pontos: ${this.score}`);
        }

        // Aguarda 1 segundo antes de liberar nova manobra
        this.time.delayedCall(1000, () => {
          this.trickCooldown = false;
        });
      },
    });
  }

  // Lógica para girar dinamicamente a câmera quando o jogador faz uma curva
  updateCameraRotation() {
    let targetCamRad = 0; // Ângulo alvo da câmera em radianos
    // Define pra onde a câmera deve virar baseado na direção da pista
    if (this.carrierTravelDir === "UP") targetCamRad = 0;
    else if (this.carrierTravelDir === "RIGHT") targetCamRad = -Math.PI / 2;
    else if (this.carrierTravelDir === "DOWN") targetCamRad = -Math.PI;
    else if (this.carrierTravelDir === "LEFT") targetCamRad = Math.PI / 2;

    // Calcula a duração do giro (Fica mais rápido conforme a velocidade do jogo aumenta)
    const camDur = Math.max(120, 250 - (this.speed - 250) * 0.2);

    const currentCamRad = this.cameras.main.rotation;
    // Calcula a menor distância angular para rotacionar
    let camDiff = Math.atan2(
      Math.sin(targetCamRad - currentCamRad),
      Math.cos(targetCamRad - currentCamRad),
    );
    // Anima a rotação da câmera
    this.tweens.add({
      targets: this.cameras.main,
      rotation: currentCamRad + camDiff,
      duration: camDur,
    });

    // Desloca (Offset) a câmera para manter o player enquadrado após a curva
    let dist = this.scale.height * 0.4;
    let offX = 0,
      offY = 0;
    if (this.carrierTravelDir === "UP") offY = dist;
    else if (this.carrierTravelDir === "RIGHT") offX = -dist;
    else if (this.carrierTravelDir === "DOWN") offY = -dist;
    else offX = dist;

    // Anima o reposicionamento (offset) da câmera
    this.tweens.add({
      targets: this.cameras.main.followOffset,
      x: offX,
      y: offY,
      duration: camDur,
    });

    // Faz o 'carrier' rotacionar junto com a câmera para acompanhar a pista
    let shipTargetRad = targetCamRad === 0 ? 0 : -targetCamRad;
    if (this.carrierTravelDir === "DOWN") shipTargetRad = Math.PI;

    const currentShipRad = this.carrier.rotation;
    let shipDiff = Math.atan2(
      Math.sin(shipTargetRad - currentShipRad),
      Math.cos(shipTargetRad - currentShipRad),
    );
    this.tweens.add({
      targets: this.carrier,
      rotation: currentShipRad + shipDiff,
      duration: camDur,
    });
  }

  // Gera asteroides estéticos aleatoriamente nas bordas da pista
  spawnAsteroidNear(x, y) {
    for (let i = 0; i < 4; i++) {
      if (this.random.frac() > 0.7) continue; // 70% de chance de NÃO spawnar esse asteroide
      // Escolhe tipo, raio de distância e ângulo
      const type = this.random.pick(["aster_1", "aster_2", "aster_3"]);
      const radius = this.random.integerInRange(
        this.gridSize * 1.5,
        this.gridSize * 5,
      );
      const angle = this.random.realInRange(0, Math.PI * 2);

      // Cria e posiciona o asteroide
      const aster = this.add.image(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        type,
      );
      // Aplica escala, rotação inicial e depth
      aster
        .setScale(this.random.realInRange(1.5, 3.5))
        .setRotation(this.random.realInRange(0, Math.PI * 2))
        .setDepth(0);

      // Atributos customizados de movimento para serem calculados no update()
      aster.rotSpeed = this.random.realInRange(-0.5, 0.5);
      aster.driftX = this.random.realInRange(-10, 10);
      aster.driftY = this.random.realInRange(-10, 10);

      // Adiciona na lista e no grupo mundial
      this.asteroids.push(aster);
      this.worldLayer.add(aster);
    }
  }

  // Executado quando o jogador erra uma curva (cai no espaço)
  triggerFall() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Define para qual lado o jogador vai cair com base na inclinação ou aleatoriamente
    const fallSide =
      this.playerLeanAngle !== 0
        ? this.playerLeanAngle > 0
          ? 1
          : -1
        : this.random.frac() > 0.5
          ? 1
          : -1;

    // Muda o frame do jogador para a pose de falha (frame 2)
    this.player.setFrame(2);

    // Anima o giro de queda do jogador
    this.tweens.add({
      targets: this.player,
      angle: this.player.angle + fallSide * 180,
      duration: 1200,
      ease: "Power1",
    });

    // Aplica força física jogando a nave pra fora da pista, mantendo a inércia forward
    const impulse = fallSide * 400;
    if (this.carrierTravelDir === "UP" || this.carrierTravelDir === "DOWN") {
      this.player.body.setVelocityX(impulse);
      this.player.body.setVelocityY(this.carrier.body.velocity.y);
    } else {
      this.player.body.setVelocityY(impulse);
      this.player.body.setVelocityX(this.carrier.body.velocity.x);
    }

    // Tira o volume da música suavemente
    this.tweens.add({
      targets: this.bgMusic,
      volume: 0,
      duration: 1200,
    });

    // Atraso antes de chamar a tela final para dar tempo da animação rolar
    this.time.delayedCall(1200, () => {
      this.bgMusic.stop();
      if (this.isInfiniteMode) {
        // Salva os resultados do modo infinito e leva para inserção de nome
        this.game.lastInfiniteResult = {
          score: this.score,
          time: Math.ceil(this.timeElapsed),
        };
        this.scene.start("nameentry");
      } else {
        // Encerra o jogo normalmente (Modo história)
        this.endGame("gameover");
      }
    });
  }

  // Registra a intenção do jogador de fazer uma curva (não curva de fato ainda)
  attemptTurn(turnIntent) {
    if (this.isGameOver || this.safeZoneActive || this.isDoingTrick) return;
    this.leanDirection = turnIntent;
  }

  // Gera proceduramente (matematicamente) a próxima peça da pista e seu alinhamento
  generateTrackPiece() {
    let type = "way_f"; // "way_f" = Reta
    // Aumenta blocos retos e diminui chances de curva conforme velocidade ou modo de jogo
    let minS = this.speed > 800 ? 0 : this.isInfiniteMode ? 1 : 2;
    let cChance = this.isInfiniteMode ? 0.7 : 0.45; // Chance de virar

    // Gera o segmento de segurança inicial obrigatoriamente reto
    if (this.safeStraightGenerated < this.safeStraightPieces) {
      type = "way_f";
      this.safeStraightGenerated++;
    } else if (this.justTurned) {
      // Força uma reta logo após fazer uma curva
      type = "way_f";
      this.justTurned = false;
      this.straightPiecesCount = 1;
    } else {
      // Se já andou o mínimo reto, verifica na "sorte" se deve gerar uma curva
      this.straightPiecesCount++;
      if (this.straightPiecesCount > minS && this.random.frac() < cChance) {
        // Lógica para equilibrar a pista e impedir que ela faça caracóis infinitos em uma direção
        if (this.turnHistory > 0) type = "way_l";
        else if (this.turnHistory < 0) type = "way_r";
        else type = this.random.frac() < 0.5 ? "way_l" : "way_r"; // Sorteia "way_l" (Esquerda) ou "way_r" (Direita)

        this.turnHistory += type === "way_r" ? 1 : -1;
        this.justTurned = true;
      }
    }

    // Adiciona o sprite visual na tela
    const piece = this.add
      .image(this.trackCursor.x, this.trackCursor.y, type)
      .setDisplaySize(this.gridSize, this.gridSize)
      .setDepth(1);
    piece.trackType = type; // Salva o tipo na própria peça para fácil acesso
    this.roadPieces.push(piece);
    this.worldLayer.add(piece);
    this.spawnAsteroidNear(piece.x, piece.y); // Spawna asteroides perto da peça gerada

    // Calcula e ajusta a orientação e posição (Cursor) da PRÓXIMA peça que for gerada
    let angle = 0;
    if (this.trackCursor.dir === "UP") {
      if (type === "way_f") this.trackCursor.y -= this.gridSize;
      else if (type === "way_l") {
        this.trackCursor.dir = "LEFT";
        this.trackCursor.x -= this.gridSize;
      } else {
        this.trackCursor.dir = "RIGHT";
        this.trackCursor.x += this.gridSize;
      }
    } else if (this.trackCursor.dir === "RIGHT") {
      angle = 90;
      if (type === "way_f") this.trackCursor.x += this.gridSize;
      else if (type === "way_l") {
        this.trackCursor.dir = "UP";
        this.trackCursor.y -= this.gridSize;
      } else {
        this.trackCursor.dir = "DOWN";
        this.trackCursor.y += this.gridSize;
      }
    } else if (this.trackCursor.dir === "LEFT") {
      angle = -90;
      if (type === "way_f") this.trackCursor.x -= this.gridSize;
      else if (type === "way_l") {
        this.trackCursor.dir = "DOWN";
        this.trackCursor.y += this.gridSize;
      } else {
        this.trackCursor.dir = "UP";
        this.trackCursor.y -= this.gridSize;
      }
    } else if (this.trackCursor.dir === "DOWN") {
      angle = 180;
      if (type === "way_f") this.trackCursor.y += this.gridSize;
      else if (type === "way_l") {
        this.trackCursor.dir = "RIGHT";
        this.trackCursor.x += this.gridSize;
      } else {
        this.trackCursor.dir = "LEFT";
        this.trackCursor.x -= this.gridSize;
      }
    }
    // Rotaciona a peça visualmente
    piece.setAngle(angle);
  }

  // Método rodado em todos os frames (O "coração" da fase)
  update(time, delta) {
    try {
      // --- BLOCO MULTIPLAYER: ENVIO DO HOST ---
      // Se não for espectador (ou seja, se for o Host jogando), emite todos os dados da partida pro servidor espelhar
      if (!this.game.isSpectator) {
        this.game.socket.emit("scene0", this.game.room, {
          gravity: this.physics.world.gravity.y,
          carrier: {
            x: this.carrier.x,
            y: this.carrier.y,
            angle: this.carrier.rotation,
            travelDir: this.carrierTravelDir,
          },
          player: {
            x: this.player.x,
            y: this.player.y,
            angle: this.player.rotation,
            frame: this.player.frame.name || this.player.frame.index || 0,
            flipX: this.player.flipX,
            leanAngle: this.playerLeanAngle,
            leanDirection: this.leanDirection,
            isDoingTrick: this.isDoingTrick,
            trickCooldown: this.trickCooldown,
          },
          score: this.score,
          timeElapsed: this.timeElapsed,
          speed: this.speed,
          isGameOver: this.isGameOver,
        });
      }
    } catch (e) {
      console.error("Error updating player:", e); // Evita o jogo "quebrar" (crash) se houver erro de rede
    }

    const dtSeconds = delta / 1000; // Tempo em segundos desde o último frame (Delta Time)

    // --- BLOCO MULTIPLAYER: LEITURA DO ESPECTADOR ---
    let hostState = this.lastHostState;
    if (this.game.isSpectator && hostState) {
      // Sobrepõe os atributos locais do Espectador com os dados recebidos do Host
      if ("gravity" in hostState) {
        this.physics.world.gravity.y = hostState.gravity;
      }
      this.carrier.setPosition(hostState.carrier.x, hostState.carrier.y);
      this.carrier.rotation = hostState.carrier.angle;
      this.carrierTravelDir = hostState.carrier.travelDir;

      this.player.setPosition(hostState.player.x, hostState.player.y);
      this.player.rotation = hostState.player.angle;
      this.player.setFlipX(hostState.player.flipX);
      this.player.setFrame(hostState.player.frame);

      this.playerLeanAngle = hostState.player.leanAngle;
      this.leanDirection = hostState.player.leanDirection;
      this.isDoingTrick = hostState.player.isDoingTrick;
      this.trickCooldown = hostState.player.trickCooldown;

      this.score = hostState.score;
      this.timeElapsed = hostState.timeElapsed;
      this.speed = hostState.speed;
      this.isGameOver = hostState.isGameOver;

      // Atualiza a Interface UI do espectador
      let remainingTime = Math.max(0, this.maxTime - this.timeElapsed);
      this.timeText.setText(`Tempo: ${Math.ceil(remainingTime)}s`);
      this.scoreText.setText(`Pontos: ${this.score} / ${this.targetScore}`);

      // Valida fim de jogo e engatilha telas de Win/Loss localmente pelo espectador
      if (this.isGameOver) {
        if (this.score >= this.targetScore) {
          this.endGame("win");
        } else {
          this.endGame("gameover");
        }
        return;
      }
    }

    // --- BLOCO: LÓGICA GERAL DE GAMEPLAY ---
    if (!this.isGameOver) {
      // Contagem regressiva da Safe Zone inicial
      if (this.safeZoneActive) {
        this.safeZoneRemaining = Math.max(
          0,
          this.safeZoneRemaining - dtSeconds,
        );
        this.safeZoneText.setText(
          `Zona segura: ${this.safeZoneRemaining.toFixed(1)}s`,
        );
        if (this.safeZoneRemaining <= 0) {
          this.safeZoneActive = false; // Desativa a zona
          this.safeZoneText.destroy(); // Apaga o texto
        }
      }

      // Progressão do tempo e velocidade (somente o Host calcula, pra evitar dessincronia)
      if (!this.game.isSpectator) {
        this.timeElapsed += dtSeconds;

        // A velocidade aumenta progressivamente ao longo do tempo (Dificuldade escalonável)
        this.speed = Math.min(1200, 550 + 650 * (this.timeElapsed / 40));
      }

      // Atualiza os textos de tempo na tela
      if (this.isInfiniteMode) {
        this.timeText.setText(`Tempo: ${Math.ceil(this.timeElapsed)}s`);
      } else {
        let remainingTime = Math.max(0, this.maxTime - this.timeElapsed);
        this.timeText.setText(`Tempo: ${Math.ceil(remainingTime)}s`);

        // Verifica se acabou o tempo no Modo História (Win condition ou Timeout Loss)
        if (remainingTime <= 0) {
          this.isGameOver = true;
          this.carrier.setVelocity(0, 0); // Trava movimento
          this.tweens.add({
            targets: this.bgMusic,
            volume: 0,
            duration: 1000,
            onComplete: () => {
              this.bgMusic.stop();
              // Se tiver os pontos = WIN, se não = GAMEOVER
              if (this.score >= this.targetScore) {
                this.endGame("win");
              } else {
                this.endGame("gameover");
              }
            },
          });
        }
      }

      // IMPORTANTE: Espectador não lê as intenções de movimento localmente (sincronizar pelo servidor idealmente)
      // Ajusta o "Lean" (Inclinação visual da nave pros lados) conforme o comando do host
      if (!this.game.isSpectator) {
        if (this.leanDirection === "LEFT") {
          this.playerLeanAngle -= this.leanSpeed * dtSeconds;
          if (this.playerLeanAngle < -30) this.playerLeanAngle = -30;
          this.player.setFlipX(true);
        } else if (this.leanDirection === "RIGHT") {
          this.playerLeanAngle += this.leanSpeed * dtSeconds;
          if (this.playerLeanAngle > 30) this.playerLeanAngle = 30;
          this.player.setFlipX(false);
        }
      }

      // Muda frame da nave (Deixa reta ou curvada dependendo da angulação)
      const absAngle = Math.abs(this.playerLeanAngle);
      if (absAngle < 15) {
        this.player.setFrame(0);
      } else {
        this.player.setFrame(1);
      }

      // Desloca fisicamente o sprite do player um pouquinho pro lado pra enfatizar a curva
      const maxOffset = 18;
      const shift = (this.playerLeanAngle / 30) * maxOffset;
      let offX = 0,
        offY = 0;

      // Traduz o deslocamento local pros eixos mundiais (depende pra onde está viajando)
      if (this.carrierTravelDir === "UP") offX = shift;
      else if (this.carrierTravelDir === "DOWN") offX = -shift;
      else if (this.carrierTravelDir === "RIGHT") offY = shift;
      else if (this.carrierTravelDir === "LEFT") offY = -shift;

      // Aplica posição do player presa ao "carrier" (guia invisível)
      this.player.setPosition(this.carrier.x + offX, this.carrier.y + offY);

      // Rotaciona visualmente o player em relação à curva e seu Lean Angle
      if (!this.isDoingTrick) {
        this.player.setRotation(
          this.carrier.rotation + Phaser.Math.DegToRad(this.playerLeanAngle),
        );
      }
    }

    // --- BLOCO: MOVIMENTO GLOBAL, PISTA E AMBIENTE ---

    // Move o 'carrier' firmemente pela pista baseando-se na velocidade atual e direção de viagem
    const v = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[
      this.carrierTravelDir
    ];
    this.carrier.setVelocity(v[0] * this.speed, v[1] * this.speed);

    // Faz o fundo estrelado aplicar efeito parallax (mover com a câmera)
    this.bgStars.tilePositionX = this.cameras.main.scrollX * 0.1;
    this.bgStars.tilePositionY = this.cameras.main.scrollY * 0.1;

    // Atualiza fisicamente todos os asteroides no mundo (movendo e girando)
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      // Se o asteroide ficar pra trás (muito longe da câmera/carrier), destrua-o para não pesar a memória
      if (
        Phaser.Math.Distance.Between(this.carrier.x, this.carrier.y, a.x, a.y) >
        2000
      ) {
        a.destroy();
        this.asteroids.splice(i, 1);
        continue;
      }
      // Movimenta o asteroide suavemente
      a.rotation += a.rotSpeed * dtSeconds;
      a.x += a.driftX * dtSeconds;
      a.y += a.driftY * dtSeconds;
    }

    // Verifica se precisa criar mais pista na frente do jogador (Chegando perto do fim gerado)
    if (
      Phaser.Math.Distance.Between(
        this.carrier.x,
        this.carrier.y,
        this.roadPieces[this.roadPieces.length - 1].x,
        this.roadPieces[this.roadPieces.length - 1].y,
      ) < 2500
    ) {
      this.generateTrackPiece();
    }

    // Se tiver muita pista na memória (mais de 60 blocos), destrói a mais velha (a que ficou pra trás)
    if (this.roadPieces.length > 60) this.roadPieces.shift().destroy();

    // Descobre em qual bloco da pista a nave está encima agora
    const cp = this.getPieceUnder(this.carrier);

    // Regra: Não pode inclinar (turn) do nada se a pista é RETA. Se fizer isso, cai (Trigger Fall)
    if (
      !this.isGameOver &&
      cp &&
      cp.trackType === "way_f" &&
      this.leanDirection !== "NONE" &&
      !this.game.isSpectator
    ) {
      this.triggerFall();
    }

    // --- BLOCO: LÓGICA DE CURVAS (Tolerância e Decisão) ---
    // Checa se o player pisou em um bloco de curva novo que ainda não processou
    if (cp && cp !== this.carrier.lastTurnedPiece && cp.trackType !== "way_f") {
      // Verifica matematicamente se ele "cruzou" o centro geométrico da peça
      let passed =
        (this.carrierTravelDir === "UP" && this.carrier.y <= cp.y) ||
        (this.carrierTravelDir === "DOWN" && this.carrier.y >= cp.y) ||
        (this.carrierTravelDir === "RIGHT" && this.carrier.x >= cp.x) ||
        (this.carrierTravelDir === "LEFT" && this.carrier.x <= cp.x);

      // Se passou da metade da curva
      if (passed) {
        // Mapeia para qual lado ele DEVERIA ter virado
        const requiredTurn = cp.trackType === "way_r" ? "RIGHT" : "LEFT";
        // Computa a nova direção de movimento geral baseado na direção atual vs o lado da curva
        const next = {
          UP: { RIGHT: "RIGHT", LEFT: "LEFT" },
          RIGHT: { RIGHT: "DOWN", LEFT: "UP" },
          LEFT: { RIGHT: "UP", LEFT: "DOWN" },
          DOWN: { RIGHT: "LEFT", LEFT: "RIGHT" },
        }[this.carrierTravelDir][requiredTurn];

        // Aplica e alinha matematicamente a nave pra não "derrapar"
        this.carrierTravelDir = next;
        this.carrier.setPosition(cp.x, cp.y);
        this.carrier.lastTurnedPiece = cp;
        this.updateCameraRotation(); // Inicia o giro da câmera principal

        // O espectador não resolve falhas, ele confia no Host para gerenciar vitórias/derrotas
        if (!this.isGameOver && !this.game.isSpectator) {
          // Se a intenção do Host bate com o lado que deveria virar: ACERTOU
          if (this.leanDirection === requiredTurn) {
            this.playerLeanAngle = 0; // Reseta as inclinações e poses
            this.leanDirection = "NONE";
            this.player.setFrame(0);
            this.player.setFlipX(requiredTurn === "LEFT");
            this.sound.play("swoosh"); // Toca o som de manobra certinha
          } else {
            // ERROU: Cai no vazio (Trigger Fall)
            this.triggerFall();
          }
        }
      }
    }

    // Regra de segurança final: Se não tiver mais chão embaixo e o jogo não acabou = Caiu.
    if (
      !this.isGameOver &&
      !this.getPieceUnder(this.carrier) &&
      !this.game.isSpectator
    ) {
      this.triggerFall();
    }
  }

  // --- FUNÇÃO AUXILIAR ---
  // Função que encontra e retorna qual o bloco de pista mais próximo ao alvo providenciado (Carrier)
  getPieceUnder(target) {
    let closest = null,
      minDist = this.gridSize * 0.8; // Raio máximo de tolerância
    for (const p of this.roadPieces) {
      // Usando trigonometria nativa do Phaser para caçar colisões distantes
      const d = Phaser.Math.Distance.Between(target.x, target.y, p.x, p.y);
      if (d < minDist) {
        minDist = d;
        closest = p; // Pega o menor de todos dentro do raio
      }
    }
    return closest;
  }
}
