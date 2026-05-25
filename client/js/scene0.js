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

    this.safeZoneActive = true;
    this.safeZoneTime = 3; // seconds of safe start
    this.safeZoneRemaining = this.safeZoneTime;
    this.safeStraightPieces = this.isInfiniteMode ? 14 : 20; // more initial straight pieces in story mode
    this.safeStraightGenerated = 0;

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

    this.cameras.main.ignore(this.timeText);
    this.cameras.main.ignore(this.scoreText);
    this.cameras.main.ignore(this.testHintText);
    this.cameras.main.ignore(this.safeZoneText);

    this.cameras.main.startFollow(this.carrier, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.75);
    this.cameras.main.setFollowOffset(0, height * 0.4);

    this.uiCam = this.cameras.add(0, 0, width, height);
    this.uiCam.ignore([this.bgStars, this.worldLayer]);

    // O PONTO CHAVE: Espectador não emite comandos
    // Use swipe-up for trick, taps for left/right turn
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
      const swipeThresh = 60; // pixels

      // swipe up (downY - upY > threshold) and mostly vertical
      if (downY - upY > swipeThresh && absDy > absDx) {
        this.startTrick();
        this.game.socket.emit("player-action", this.game.room, {
          type: "trick",
        });
      } else {
        // treat as tap -> turn
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

    this.input.keyboard.on("keydown-W", () => {
      if (this.isGameOver || this.game.isSpectator || this.safeZoneActive)
        return;
      this.startTrick();
      this.game.socket.emit("player-action", this.game.room, {
        type: "trick",
      });
    });

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

    this.game.socket.on("scene0", (state) => {
      if (!this.game.isSpectator) return;
      if (!state || typeof state !== "object") return;
      if ("gravity" in state && state.gravity != null) {
        this.physics.world.gravity.y = state.gravity;
      }
      this.lastHostState = state;
    });

    if (this.game.isSpectator) {
      this.input.enabled = false;
    }
  }

  endGame(sceneKey) {
    if (!this.game.isSpectator) {
      this.game.socket.emit("change-scene", this.game.room, sceneKey);
    }
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
      duration: 1400,
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (this.isGameOver) return;

        this.isDoingTrick = false;
        this.score += 300;

        if (!this.isInfiniteMode) {
          if (this.score >= this.targetScore) {
            this.scoreText.setColor("#00ff00");
          }
          this.scoreText.setText(`Pontos: ${this.score} / ${this.targetScore}`);
        } else {
          this.scoreText.setText(`Pontos: ${this.score}`);
        }

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
      if (this.random.frac() > 0.7) continue;
      const type = this.random.pick(["aster_1", "aster_2", "aster_3"]);
      const radius = this.random.integerInRange(
        this.gridSize * 1.5,
        this.gridSize * 5,
      );
      const angle = this.random.realInRange(0, Math.PI * 2);
      const aster = this.add.image(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
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
      if (this.isInfiniteMode) {
        // Save last infinite-mode result and go to name entry
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
    // Increase minimum straight pieces and reduce curve chance for story mode
    let minS = this.speed > 800 ? 0 : this.isInfiniteMode ? 1 : 2;
    let cChance = this.isInfiniteMode ? 0.7 : 0.45;

    if (this.safeStraightGenerated < this.safeStraightPieces) {
      type = "way_f";
      this.safeStraightGenerated++;
    } else if (this.justTurned) {
      type = "way_f";
      this.justTurned = false;
      this.straightPiecesCount = 1;
    } else {
      this.straightPiecesCount++;
      if (this.straightPiecesCount > minS && this.random.frac() < cChance) {
        if (this.turnHistory > 0) type = "way_l";
        else if (this.turnHistory < 0) type = "way_r";
        else type = this.random.frac() < 0.5 ? "way_l" : "way_r";

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
      console.error("Error updating player:", e);
    }

    const dtSeconds = delta / 1000;

    let hostState = this.lastHostState;
    if (this.game.isSpectator && hostState) {
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

      let remainingTime = Math.max(0, this.maxTime - this.timeElapsed);
      this.timeText.setText(`Tempo: ${Math.ceil(remainingTime)}s`);
      this.scoreText.setText(`Pontos: ${this.score} / ${this.targetScore}`);

      if (this.isGameOver) {
        if (this.score >= this.targetScore) {
          this.endGame("win");
        } else {
          this.endGame("gameover");
        }
        return;
      }
    }

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

        this.speed = Math.min(1200, 550 + 650 * (this.timeElapsed / 40));
      }

      if (this.isInfiniteMode) {
        this.timeText.setText(`Tempo: ${Math.ceil(this.timeElapsed)}s`);
      } else {
        let remainingTime = Math.max(0, this.maxTime - this.timeElapsed);
        this.timeText.setText(`Tempo: ${Math.ceil(remainingTime)}s`);

        if (remainingTime <= 0) {
          this.isGameOver = true;
          this.carrier.setVelocity(0, 0);
          this.tweens.add({
            targets: this.bgMusic,
            volume: 0,
            duration: 1000,
            onComplete: () => {
              this.bgMusic.stop();
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

    if (this.roadPieces.length > 60) this.roadPieces.shift().destroy();

    const cp = this.getPieceUnder(this.carrier);

    if (
      !this.isGameOver &&
      cp &&
      cp.trackType === "way_f" &&
      this.leanDirection !== "NONE" &&
      !this.game.isSpectator
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

        // O espectador não resolve falhas, ele confia no Host para gerenciar vitórias/derrotas
        if (!this.isGameOver && !this.game.isSpectator) {
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

    if (
      !this.isGameOver &&
      !this.getPieceUnder(this.carrier) &&
      !this.game.isSpectator
    ) {
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
