export default class Scene0 extends Phaser.Scene {
  constructor() {
    super("scene0");
  }

  create() {
    const { width, height } = this.scale;
    this.worldLayer = this.add.group();

    this.cameras.main.setBackgroundColor(0x080a29);

    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 200; i++) {
      graphics.fillCircle(
        Phaser.Math.Between(0, 512),
        Phaser.Math.Between(0, 512),
        Math.random() * 2,
      );
    }
    graphics.generateTexture("starfield", 512, 512);

    this.bgStars = this.add
      .tileSprite(
        width / 2,
        height / 2,
        Math.max(width, height) * 2,
        Math.max(width, height) * 2,
        "starfield",
      )
      .setScrollFactor(0)
      .setDepth(-4);

    this.roadPieces = [];
    this.asteroids = [];

    const texture = this.textures.get("way_f").getSourceImage();
    const roadScale = (width / texture.width) * 0.4;
    this.gridSize = Math.round(texture.height * roadScale);

    this.trackCursor = { x: 0, y: 0, dir: "UP" };
    this.straightPiecesCount = 0;
    this.justTurned = false;
    this.turnHistory = 0;

    // DIFICULDADE SUPREMA
    this.speed = 550;
    this.maxTime = 90;
    this.timeElapsed = 0;
    this.isGameOver = false;

    // PONTUAÇÃO (Sobrevivência é obrigatória)
    this.score = 0;
    this.targetScore = 1500;
    this.isDoingTrick = false;
    this.trickCooldown = false;

    this.bgMusic = this.sound.add("soundtrack", { loop: true, volume: 0.5 });
    this.bgMusic.play();

    // Gera mais blocos de início para mostrar o caminho lá na frente
    for (let i = 0; i < 40; i++) this.generateTrackPiece();

    this.carrier = this.physics.add.sprite(0, 0, "spaceship_new").setDepth(9);
    this.carrier.setScale((this.gridSize / this.carrier.width) * 0.6);
    this.carrierTravelDir = "UP";
    this.carrier.lastTurnedPiece = null;
    this.worldLayer.add(this.carrier);

    this.player = this.physics.add
      .sprite(0, 0, "player")
      .setDepth(10)
      .setScale(3);
    this.player.setFrame(0);
    this.worldLayer.add(this.player);

    this.playerLeanAngle = 0;
    this.leanDirection = "NONE";
    this.leanSpeed = 190;

    this.timeText = this.add
      .text(30, 30, `Tempo: ${this.maxTime}s`, {
        fontSize: "29px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setDepth(100)
      .setScrollFactor(0);

    this.scoreText = this.add
      .text(30, 70, `Pontos: 0 / ${this.targetScore}`, {
        fontSize: "24px",
        fill: "#ffff00",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setDepth(100)
      .setScrollFactor(0);

    // Configurando Câmera - ZOOM OUT e OFFSET para ver o futuro!
    this.cameras.main.ignore(this.timeText);
    this.cameras.main.ignore(this.scoreText);

    this.cameras.main.startFollow(this.carrier, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.75); // Afasta a câmera para visão estratégica
    this.cameras.main.setFollowOffset(0, height * 0.4); // Empurra o jogador mais pra baixo/canto

    this.uiCam = this.cameras.add(0, 0, width, height);
    this.uiCam.ignore([this.bgStars, this.worldLayer]);

    this.input.on("pointerdown", (pointer) => {
      if (this.isGameOver) return;

      if (pointer.y < 150) {
        this.startTrick();
        return;
      }

      const isRight = pointer.x > width / 2;
      this.attemptTurn(isRight ? "RIGHT" : "LEFT");
    });

    this.game.socket.on("scene0", (state) => {
      if (state.gravity) {
        this.physics.world.gravity.y = state.gravity;
        this.player.setFlipY(this.physics.world.gravity.y < 0);
      }
    });
  }

  startTrick() {
    if (
      this.isGameOver ||
      this.isDoingTrick ||
      this.trickCooldown ||
      this.leanDirection !== "NONE"
    )
      return;

    this.isDoingTrick = true;
    this.trickCooldown = true;
    this.sound.play("swoosh");

    this.tweens.add({
      targets: this.player,
      angle: this.player.angle + 360,
      duration: 1400, // Volta aos cruéis 1.4 segundos no ar
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (this.isGameOver) return;

        this.isDoingTrick = false;
        this.score += 300;

        // Cor do texto muda se bater a meta
        if (this.score >= this.targetScore) {
          this.scoreText.setColor("#00ff00");
        }
        this.scoreText.setText(`Pontos: ${this.score} / ${this.targetScore}`);

        // Cooldown de 1 segundo
        this.time.delayedCall(1000, () => {
          this.trickCooldown = false;
        });
      },
    });
  }

  updateCameraRotation() {
    let targetCamRad = 0;
    if (this.carrierTravelDir === "UP") targetCamRad = 0;
    else if (this.carrierTravelDir === "RIGHT") targetCamRad = -Math.PI / 2;
    else if (this.carrierTravelDir === "DOWN") targetCamRad = -Math.PI;
    else if (this.carrierTravelDir === "LEFT") targetCamRad = Math.PI / 2;

    const camDur = Math.max(120, 250 - (this.speed - 250) * 0.2);

    const currentCamRad = this.cameras.main.rotation;
    let camDiff = Math.atan2(
      Math.sin(targetCamRad - currentCamRad),
      Math.cos(targetCamRad - currentCamRad),
    );
    this.tweens.add({
      targets: this.cameras.main,
      rotation: currentCamRad + camDiff,
      duration: camDur,
    });

    // Usa offset maior (0.4) para acompanhar a mudança inicial e mostrar mais a frente
    let dist = this.scale.height * 0.4;
    let offX = 0,
      offY = 0;
    if (this.carrierTravelDir === "UP") offY = dist;
    else if (this.carrierTravelDir === "RIGHT") offX = -dist;
    else if (this.carrierTravelDir === "DOWN") offY = -dist;
    else offX = dist;

    this.tweens.add({
      targets: this.cameras.main.followOffset,
      x: offX,
      y: offY,
      duration: camDur,
    });

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

  spawnAsteroidNear(x, y) {
    for (let i = 0; i < 4; i++) {
      if (Math.random() > 0.7) continue;
      const type = Phaser.Math.RND.pick(["aster_1", "aster_2", "aster_3"]);
      const radius = Phaser.Math.Between(
        this.gridSize * 1.5,
        this.gridSize * 5,
      );
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const aster = this.add.image(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        type,
      );
      aster
        .setScale(Phaser.Math.FloatBetween(1.5, 3.5))
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2))
        .setDepth(0);
      aster.rotSpeed = Phaser.Math.FloatBetween(-0.5, 0.5);
      aster.driftX = Phaser.Math.FloatBetween(-10, 10);
      aster.driftY = Phaser.Math.FloatBetween(-10, 10);
      this.asteroids.push(aster);
      this.worldLayer.add(aster);
    }
  }

  triggerFall() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    const fallSide =
      this.playerLeanAngle !== 0
        ? this.playerLeanAngle > 0
          ? 1
          : -1
        : Math.random() > 0.5
          ? 1
          : -1;

    this.player.setFrame(2);

    this.tweens.add({
      targets: this.player,
      angle: this.player.angle + fallSide * 180,
      duration: 1200,
      ease: "Power1",
    });

    const impulse = fallSide * 400;
    if (this.carrierTravelDir === "UP" || this.carrierTravelDir === "DOWN") {
      this.player.body.setVelocityX(impulse);
      this.player.body.setVelocityY(this.carrier.body.velocity.y);
    } else {
      this.player.body.setVelocityY(impulse);
      this.player.body.setVelocityX(this.carrier.body.velocity.x);
    }

    this.tweens.add({
      targets: this.bgMusic,
      volume: 0,
      duration: 1200,
    });

    this.time.delayedCall(1200, () => {
      this.bgMusic.stop();
      this.scene.start("gameover");
    });
  }

  attemptTurn(turnIntent) {
    if (this.isGameOver || this.isDoingTrick) return;
    this.leanDirection = turnIntent;
  }

  generateTrackPiece() {
    let type = "way_f";

    // O INFERNO DE CURVAS (70% de chance de bater com tudo numa parede)
    let minS = this.speed > 800 ? 0 : 1;
    let cChance = 0.7;

    if (this.justTurned) {
      type = "way_f";
      this.justTurned = false;
      this.straightPiecesCount = 1;
    } else {
      this.straightPiecesCount++;
      if (this.straightPiecesCount > minS && Math.random() < cChance) {
        if (this.turnHistory > 0) type = "way_l";
        else if (this.turnHistory < 0) type = "way_r";
        else type = Math.random() < 0.5 ? "way_l" : "way_r";

        this.turnHistory += type === "way_r" ? 1 : -1;
        this.justTurned = true;
      }
    }

    const piece = this.add
      .image(this.trackCursor.x, this.trackCursor.y, type)
      .setDisplaySize(this.gridSize, this.gridSize)
      .setDepth(1);
    piece.trackType = type;
    this.roadPieces.push(piece);
    this.worldLayer.add(piece);
    this.spawnAsteroidNear(piece.x, piece.y);

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
    piece.setAngle(angle);
  }

  update(time, delta) {
    try {
      this.game.socket.emit("scene0", this.game.room, {
        player: {
          x: this.player.body.velocity.x,
          y: this.player.body.velocity.y,
          key: this.player.anims.currentAnim?.key || null,
          frame: this.player.anims.currentFrame?.index || 0,
        },
      });
    } catch (e) {
      console.error("Error updating player:", e);
    }

    const dtSeconds = delta / 1000;

    if (!this.isGameOver) {
      this.timeElapsed += dtSeconds;

      // Velocidade máxima insana em muito pouco tempo
      this.speed = Math.min(1200, 550 + 650 * (this.timeElapsed / 40));

      let remainingTime = Math.max(0, this.maxTime - this.timeElapsed);
      this.timeText.setText(`Tempo: ${Math.ceil(remainingTime)}s`);

      // Verifica o FIM DO JOGO apenas quando o relógio zera
      if (remainingTime <= 0) {
        this.isGameOver = true;
        this.carrier.setVelocity(0, 0); // Para a nave no final
        this.tweens.add({
          targets: this.bgMusic,
          volume: 0,
          duration: 1000,
          onComplete: () => {
            this.bgMusic.stop();
            // Sobreviveu e fez os pontos? Ganhou! Se não, Perdeu!
            if (this.score >= this.targetScore) {
              this.scene.start("win");
            } else {
              this.scene.start("gameover");
            }
          },
        });
      }

      if (this.leanDirection === "LEFT") {
        this.playerLeanAngle -= this.leanSpeed * dtSeconds;
        if (this.playerLeanAngle < -30) this.playerLeanAngle = -30;
        this.player.setFlipX(true);
      } else if (this.leanDirection === "RIGHT") {
        this.playerLeanAngle += this.leanSpeed * dtSeconds;
        if (this.playerLeanAngle > 30) this.playerLeanAngle = 30;
        this.player.setFlipX(false);
      }

      const absAngle = Math.abs(this.playerLeanAngle);
      if (absAngle < 15) {
        this.player.setFrame(0);
      } else {
        this.player.setFrame(1);
      }

      const maxOffset = 18;
      const shift = (this.playerLeanAngle / 30) * maxOffset;
      let offX = 0,
        offY = 0;

      if (this.carrierTravelDir === "UP") offX = shift;
      else if (this.carrierTravelDir === "DOWN") offX = -shift;
      else if (this.carrierTravelDir === "RIGHT") offY = shift;
      else if (this.carrierTravelDir === "LEFT") offY = -shift;

      this.player.setPosition(this.carrier.x + offX, this.carrier.y + offY);

      if (!this.isDoingTrick) {
        this.player.setRotation(
          this.carrier.rotation + Phaser.Math.DegToRad(this.playerLeanAngle),
        );
      }
    }

    const v = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[
      this.carrierTravelDir
    ];
    this.carrier.setVelocity(v[0] * this.speed, v[1] * this.speed);

    this.bgStars.tilePositionX = this.cameras.main.scrollX * 0.1;
    this.bgStars.tilePositionY = this.cameras.main.scrollY * 0.1;

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      if (
        Phaser.Math.Distance.Between(this.carrier.x, this.carrier.y, a.x, a.y) >
        2000
      ) {
        a.destroy();
        this.asteroids.splice(i, 1);
        continue;
      }
      a.rotation += a.rotSpeed * dtSeconds;
      a.x += a.driftX * dtSeconds;
      a.y += a.driftY * dtSeconds;
    }

    // Aumentado para 2500 para gerar as peças bem antes e tirar vantagem do zoom!
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
    // Aumentado para 60 para manter as peças desenhadas mais tempo na tela
    if (this.roadPieces.length > 60) this.roadPieces.shift().destroy();

    const cp = this.getPieceUnder(this.carrier);

    if (
      !this.isGameOver &&
      cp &&
      cp.trackType === "way_f" &&
      this.leanDirection !== "NONE"
    ) {
      this.triggerFall();
    }

    if (cp && cp !== this.carrier.lastTurnedPiece && cp.trackType !== "way_f") {
      let passed =
        (this.carrierTravelDir === "UP" && this.carrier.y <= cp.y) ||
        (this.carrierTravelDir === "DOWN" && this.carrier.y >= cp.y) ||
        (this.carrierTravelDir === "RIGHT" && this.carrier.x >= cp.x) ||
        (this.carrierTravelDir === "LEFT" && this.carrier.x <= cp.x);

      if (passed) {
        const requiredTurn = cp.trackType === "way_r" ? "RIGHT" : "LEFT";
        const next = {
          UP: { RIGHT: "RIGHT", LEFT: "LEFT" },
          RIGHT: { RIGHT: "DOWN", LEFT: "UP" },
          LEFT: { RIGHT: "UP", LEFT: "DOWN" },
          DOWN: { RIGHT: "LEFT", LEFT: "RIGHT" },
        }[this.carrierTravelDir][requiredTurn];

        this.carrierTravelDir = next;
        this.carrier.setPosition(cp.x, cp.y);
        this.carrier.lastTurnedPiece = cp;
        this.updateCameraRotation();

        if (!this.isGameOver) {
          if (this.leanDirection === requiredTurn) {
            this.playerLeanAngle = 0;
            this.leanDirection = "NONE";
            this.player.setFrame(0);
            this.player.setFlipX(requiredTurn === "LEFT");
            this.sound.play("swoosh");
          } else {
            this.triggerFall();
          }
        }
      }
    }

    if (!this.isGameOver && !this.getPieceUnder(this.carrier)) {
      this.triggerFall();
    }
  }

  getPieceUnder(target) {
    let closest = null,
      minDist = this.gridSize * 0.8;
    for (const p of this.roadPieces) {
      const d = Phaser.Math.Distance.Between(target.x, target.y, p.x, p.y);
      if (d < minDist) {
        minDist = d;
        closest = p;
      }
    }
    return closest;
  }
}
