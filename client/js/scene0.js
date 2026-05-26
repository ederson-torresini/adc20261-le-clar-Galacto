export default class Scene0 extends Phaser.Scene {
  constructor() {
    super("scene0");
  }

  create() {
    const { width, height } = this.scale;

    this.worldLayer = this.add.group();

    this.random = new Phaser.Math.RandomDataGenerator([
      this.game.room || "default",
    ]);

    this.cameras.main.setBackgroundColor(0x080a29);

    // --- FUNDO ESTRELADO ---
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 200; i++) {
      graphics.fillCircle(
        this.random.integerInRange(0, 512),
        this.random.integerInRange(0, 512),
        this.random.realInRange(0, 2),
      );
    }
    graphics.generateTexture("starfield", 512, 512);

    const bgSize = Math.max(width, height) * 8;

    this.bgStars = this.add
      .tileSprite(width / 2, height / 2, bgSize, bgSize, "starfield")
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

    // SISTEMA DE EQUILÍBRIO DE MANOBRAS
    this.piecesSinceLastWindow = 0;
    this.forcedStraightRemaining = 0;

    // ZONA SEGURA
    this.safeZoneActive = true;
    this.safeZoneTime = 3;
    this.safeZoneRemaining = this.safeZoneTime;
    this.safeStraightPieces = 10;
    this.safeStraightGenerated = 0;

    // ATRIBUTOS
    this.speed = 550;
    this.maxTime = 90;
    this.timeElapsed = 0;
    this.isGameOver = false;

    this.score = 0;
    this.targetScore = 1500;
    this.isDoingTrick = false;
    this.trickCooldown = false;

    this.isInfiniteMode = !!this.game.isInfiniteMode;
    this.maxTime = this.isInfiniteMode ? Infinity : 90;
    this.targetScore = this.isInfiniteMode ? null : 1500;

    this.bgMusic = this.sound.add("soundtrack", { loop: true, volume: 0.5 });
    this.bgMusic.play();

    for (let i = 0; i < 80; i++) this.generateTrackPiece();

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

    // UI TEXTS
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
      .setScrollFactor(0);

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

    this.testHintText = this.add
      .text(30, 105, "Pressione E para teste", {
        fontSize: "16px",
        fill: "#aaaaaa",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setDepth(100)
      .setScrollFactor(0);

    this.safeZoneText = this.add
      .text(30, 130, `Zona segura: ${this.safeZoneRemaining.toFixed(1)}s`, {
        fontSize: "22px",
        fill: "#00ff00",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setDepth(100)
      .setScrollFactor(0);

    // CÂMERAS
    this.cameras.main.ignore([
      this.timeText,
      this.scoreText,
      this.testHintText,
      this.safeZoneText,
    ]);

    this.cameras.main.startFollow(this.carrier, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.4);

    this.cameras.main.setFollowOffset(0, height * 1.0);

    this.uiCam = this.cameras.add(0, 0, width, height);
    this.uiCam.ignore([this.bgStars, this.worldLayer]);

    // CONTROLES MOBILE
    this.pointerGesture = { downX: 0, downY: 0, downTime: 0, moved: false };

    this.input.on("pointerdown", (pointer) => {
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive)
        return;
      this.pointerGesture.downX = pointer.x;
      this.pointerGesture.downY = pointer.y;
      this.pointerGesture.downTime = performance.now();
      this.pointerGesture.moved = false;
    });

    this.input.on("pointermove", (pointer) => {
      if (!this.pointerGesture.downTime) return;
      const dx = Math.abs(pointer.x - this.pointerGesture.downX);
      const dy = Math.abs(pointer.y - this.pointerGesture.downY);
      if (dx > 10 || dy > 10) this.pointerGesture.moved = true;
    });

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
      const swipeThresh = 60;

      if (downY - upY > swipeThresh && absDy > absDx) {
        this.startTrick();
        this.game.socket.emit("player-action", this.game.room, {
          type: "trick",
        });
      } else {
        const isRight = upX > width / 2;
        const turn = isRight ? "RIGHT" : "LEFT";
        this.attemptTurn(turn);
        this.game.socket.emit("player-action", this.game.room, {
          type: "turn",
          data: { turn },
        });
      }

      this.pointerGesture.downTime = 0;
    });

    // CONTROLES DE TECLADO
    this.input.keyboard.on("keydown-A", () => {
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive)
        return;
      this.attemptTurn("LEFT");
      this.game.socket.emit("player-action", this.game.room, {
        type: "turn",
        data: { turn: "LEFT" },
      });
    });

    this.input.keyboard.on("keydown-D", () => {
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive)
        return;
      this.attemptTurn("RIGHT");
      this.game.socket.emit("player-action", this.game.room, {
        type: "turn",
        data: { turn: "RIGHT" },
      });
    });

    this.input.keyboard.on("keydown-W", () => {
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive)
        return;
      this.startTrick();
      this.game.socket.emit("player-action", this.game.room, { type: "trick" });
    });

    this.input.keyboard.on("keydown-E", () => {
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive)
        return;
      this.score = 1500;
      this.scoreText.setText(
        this.isInfiniteMode
          ? `Pontos: ${this.score}`
          : `Pontos: ${this.score} / ${this.targetScore}`,
      );
    });

    // MULTIPLAYER SYNC
    this.game.socket.on("scene0", (state) => {
      if (!this.game.isSpectator) return;
      if (!state || typeof state !== "object") return;
      if ("gravity" in state && state.gravity != null)
        this.physics.world.gravity.y = state.gravity;
      this.lastHostState = state;
    });

    if (this.game.isSpectator) this.input.enabled = false;
  }

  endGame(sceneKey) {
    if (!this.game.isSpectator)
      this.game.socket.emit("change-scene", this.game.room, sceneKey);
    this.scene.start(sceneKey);
  }

  startTrick() {
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
    this.sound.play("swoosh");

    this.tweens.add({
      targets: this.player,
      angle: this.player.angle + 360,

      // ATUALIZADO: 1100ms como você pediu
      duration: 1100,

      ease: "Cubic.easeOut",
      onComplete: () => {
        if (this.isGameOver) return;
        this.isDoingTrick = false;
        this.score += 300;
        this.scoreText.setText(
          this.isInfiniteMode
            ? `Pontos: ${this.score}`
            : `Pontos: ${this.score} / ${this.targetScore}`,
        );

        this.time.delayedCall(200, () => {
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

    const camDur = 250;
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

    let dist = this.scale.height * 1.0;
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

    let shipTargetRad =
      this.carrierTravelDir === "DOWN"
        ? Math.PI
        : targetCamRad === 0
          ? 0
          : -targetCamRad;
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
      if (this.random.frac() > 0.7) continue;
      const type = this.random.pick(["aster_1", "aster_2", "aster_3"]);
      const aster = this.add.image(
        x + this.random.integerInRange(-500, 500),
        y + this.random.integerInRange(-500, 500),
        type,
      );
      aster
        .setScale(this.random.realInRange(1.5, 3.5))
        .setRotation(this.random.realInRange(0, Math.PI * 2))
        .setDepth(0);
      aster.rotSpeed = this.random.realInRange(-0.5, 0.5);
      aster.driftX = this.random.realInRange(-10, 10);
      aster.driftY = this.random.realInRange(-10, 10);
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
        : this.random.frac() > 0.5
          ? 1
          : -1;
    this.player.setFrame(2);
    this.tweens.add({
      targets: this.player,
      angle: this.player.angle + fallSide * 180,
      duration: 1200,
    });
    this.tweens.add({ targets: this.bgMusic, volume: 0, duration: 1200 });
    this.time.delayedCall(1200, () => {
      this.bgMusic.stop();
      if (this.isInfiniteMode) {
        this.game.lastInfiniteResult = {
          score: this.score,
          time: Math.ceil(this.timeElapsed),
        };
        this.scene.start("nameentry");
      } else {
        this.endGame("gameover");
      }
    });
  }

  attemptTurn(turnIntent) {
    if (this.isGameOver || this.safeZoneActive || this.isDoingTrick) return;
    this.leanDirection = turnIntent;
  }

  generateTrackPiece() {
    let type = "way_f";
    if (this.safeStraightGenerated < this.safeStraightPieces) {
      this.safeStraightGenerated++;
    } else if (this.forcedStraightRemaining > 0) {
      this.forcedStraightRemaining--;
      if (this.forcedStraightRemaining === 0) this.justTurned = true;
    } else if (this.justTurned) {
      this.justTurned = false;
      this.straightPiecesCount = 1;
      this.piecesSinceLastWindow++;
    } else {
      this.straightPiecesCount++;
      this.piecesSinceLastWindow++;
      if (this.piecesSinceLastWindow >= 28) {
        this.forcedStraightRemaining = Math.ceil(
          (this.speed * 1.6) / this.gridSize,
        );
        this.piecesSinceLastWindow = 0;
        type = "way_f";
        this.forcedStraightRemaining--;
      } else if (this.straightPiecesCount > 2 && this.random.frac() < 0.45) {
        type =
          this.turnHistory > 0
            ? "way_l"
            : this.turnHistory < 0
              ? "way_r"
              : this.random.frac() < 0.5
                ? "way_l"
                : "way_r";
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
      else {
        this.trackCursor.dir = type === "way_l" ? "LEFT" : "RIGHT";
        this.trackCursor.x += type === "way_l" ? -this.gridSize : this.gridSize;
      }
    } else if (this.trackCursor.dir === "RIGHT") {
      angle = 90;
      if (type === "way_f") this.trackCursor.x += this.gridSize;
      else {
        this.trackCursor.dir = type === "way_l" ? "UP" : "DOWN";
        this.trackCursor.y += type === "way_l" ? -this.gridSize : this.gridSize;
      }
    } else if (this.trackCursor.dir === "LEFT") {
      angle = -90;
      if (type === "way_f") this.trackCursor.x -= this.gridSize;
      else {
        this.trackCursor.dir = type === "way_l" ? "DOWN" : "UP";
        this.trackCursor.y += type === "way_l" ? this.gridSize : -this.gridSize;
      }
    } else if (this.trackCursor.dir === "DOWN") {
      angle = 180;
      if (type === "way_f") this.trackCursor.y += this.gridSize;
      else {
        this.trackCursor.dir = type === "way_l" ? "RIGHT" : "LEFT";
        this.trackCursor.x += type === "way_l" ? this.gridSize : -this.gridSize;
      }
    }
    piece.setAngle(angle);
  }

  update(time, delta) {
    // SOCKET BROADCAST
    try {
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
            frame: this.player.frame.name || 0,
            flipX: this.player.flipX,
            leanAngle: this.playerLeanAngle,
            leanDirection: this.leanDirection,
            isDoingTrick: this.isDoingTrick,
          },
          score: this.score,
          timeElapsed: this.timeElapsed,
          speed: this.speed,
          isGameOver: this.isGameOver,
        });
      }
    } catch (e) {}

    const dtSeconds = delta / 1000;

    if (!this.isGameOver) {
      if (this.safeZoneActive) {
        this.safeZoneRemaining = Math.max(
          0,
          this.safeZoneRemaining - dtSeconds,
        );
        this.safeZoneText.setText(
          `Zona segura: ${this.safeZoneRemaining.toFixed(1)}s`,
        );
        if (this.safeZoneRemaining <= 0) {
          this.safeZoneActive = false;
          this.safeZoneText.destroy();
        }
      }

      if (!this.game.isSpectator) {
        this.timeElapsed += dtSeconds;

        // ALTERAÇÃO: Divisor mudou de 40 para 20. O jogo fica difícil 2x mais rápido.
        this.speed = Math.min(1200, 550 + 650 * (this.timeElapsed / 20));

        this.timeText.setText(
          this.isInfiniteMode
            ? `Tempo: ${Math.ceil(this.timeElapsed)}s`
            : `Tempo: ${Math.ceil(Math.max(0, this.maxTime - this.timeElapsed))}s`,
        );
      }

      if (this.leanDirection === "LEFT")
        this.playerLeanAngle = Math.max(
          -30,
          this.playerLeanAngle - this.leanSpeed * dtSeconds,
        );
      else if (this.leanDirection === "RIGHT")
        this.playerLeanAngle = Math.min(
          30,
          this.playerLeanAngle + this.leanSpeed * dtSeconds,
        );

      this.player.setFrame(Math.abs(this.playerLeanAngle) < 15 ? 0 : 1);
      const shift = (this.playerLeanAngle / 30) * 18;
      let offX = 0,
        offY = 0;
      if (this.carrierTravelDir === "UP") offX = shift;
      else if (this.carrierTravelDir === "DOWN") offX = -shift;
      else if (this.carrierTravelDir === "RIGHT") offY = shift;
      else offY = -shift;

      this.player.setPosition(this.carrier.x + offX, this.carrier.y + offY);
      if (!this.isDoingTrick)
        this.player.setRotation(
          this.carrier.rotation + Phaser.Math.DegToRad(this.playerLeanAngle),
        );
    }

    const v = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[
      this.carrierTravelDir
    ];
    this.carrier.setVelocity(v[0] * this.speed, v[1] * this.speed);

    this.bgStars.tilePositionX = this.cameras.main.scrollX * 0.1;
    this.bgStars.tilePositionY = this.cameras.main.scrollY * 0.1;

    if (
      Phaser.Math.Distance.Between(
        this.carrier.x,
        this.carrier.y,
        this.roadPieces[this.roadPieces.length - 1].x,
        this.roadPieces[this.roadPieces.length - 1].y,
      ) < 4500
    ) {
      this.generateTrackPiece();
    }
    if (this.roadPieces.length > 120) this.roadPieces.shift().destroy();

    const cp = this.getPieceUnder(this.carrier);
    if (
      !this.isGameOver &&
      cp &&
      cp.trackType === "way_f" &&
      this.leanDirection !== "NONE" &&
      !this.game.isSpectator
    )
      this.triggerFall();

    if (cp && cp !== this.carrier.lastTurnedPiece && cp.trackType !== "way_f") {
      let passed =
        (this.carrierTravelDir === "UP" && this.carrier.y <= cp.y) ||
        (this.carrierTravelDir === "DOWN" && this.carrier.y >= cp.y) ||
        (this.carrierTravelDir === "RIGHT" && this.carrier.x >= cp.x) ||
        (this.carrierTravelDir === "LEFT" && this.carrier.x <= cp.x);
      if (passed) {
        const turn = cp.trackType === "way_r" ? "RIGHT" : "LEFT";
        this.carrierTravelDir = {
          UP: { RIGHT: "RIGHT", LEFT: "LEFT" },
          RIGHT: { RIGHT: "DOWN", LEFT: "UP" },
          LEFT: { RIGHT: "UP", LEFT: "DOWN" },
          DOWN: { RIGHT: "LEFT", LEFT: "RIGHT" },
        }[this.carrierTravelDir][turn];
        this.carrier.setPosition(cp.x, cp.y);
        this.carrier.lastTurnedPiece = cp;
        this.updateCameraRotation();
        if (this.leanDirection === turn) {
          this.playerLeanAngle = 0;
          this.leanDirection = "NONE";
          this.sound.play("swoosh");
        } else {
          this.triggerFall();
        }
      }
    }
    if (!this.isGameOver && !cp && !this.game.isSpectator) this.triggerFall();
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
