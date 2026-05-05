export default class Scene0 extends Phaser.Scene {
  constructor() {
    super("scene0");
  }

  preload() {
    this.load.image("logo", "assets/pixel-art.png");
    this.load.spritesheet("player", "assets/player.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image("way_f", "assets/way_f.png");
    this.load.image("way_l", "assets/way_l.png");
    this.load.image("way_r", "assets/way_r.png");
    this.load.image("spaceship_new", "assets/spaceship_new.png");
    this.load.audio("swoosh", "assets/swoosh.mp3");
    this.load.image("aster_1", "assets/aster_1.png");
    this.load.image("aster_2", "assets/aster_2.png");
    this.load.image("aster_3", "assets/aster_3.png");
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

    this.speed = 250;
    this.targetDistance = 25000;
    this.distanceTraveled = 0;
    this.isGameOver = false;

    for (let i = 0; i < 20; i++) this.generateTrackPiece();

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
    this.leanSpeed = 180;
    this.playerTravelDir = "UP";

    this.distanceText = this.add
      .text(30, 30, "", {
        fontSize: "29px",
        fill: "#7e7e7e",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setDepth(100)
      .setScrollFactor(0);

    this.cameras.main.ignore(this.distanceText);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(0, height * 0.3);

    this.uiCam = this.cameras.add(0, 0, width, height);
    this.uiCam.ignore([this.bgStars, this.worldLayer]);

    this.input.on("pointerdown", (pointer) => {
      if (this.isGameOver) return;
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

  updateCameraRotation() {
    let targetCamRad = 0;
    if (this.carrierTravelDir === "UP") targetCamRad = 0;
    else if (this.carrierTravelDir === "RIGHT") targetCamRad = -Math.PI / 2;
    else if (this.carrierTravelDir === "DOWN") targetCamRad = -Math.PI;
    else if (this.carrierTravelDir === "LEFT") targetCamRad = Math.PI / 2;

    const camDur = Math.max(150, 300 - (this.speed - 250) * 0.2);

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

    let dist = this.scale.height * 0.3;
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

    // Se ele não inclinou para lado nenhum e bateu, escolhe um lado aleatório pra cair
    const fallSide =
      this.playerLeanAngle !== 0
        ? this.playerLeanAngle > 0
          ? 1
          : -1
        : Math.random() > 0.5
          ? 1
          : -1;

    // Mudar imediatamente para o sprite 2 (inclinação máxima)
    this.player.setFrame(2);

    // Animação de queda arremessando ATÉ 60 graus (novo limite solicitado)
    this.tweens.add({
      targets: this,
      playerLeanAngle: fallSide * 60,
      duration: 400,
      ease: "Power1",
    });

    const impulse = fallSide * 300;
    if (this.carrierTravelDir === "UP" || this.carrierTravelDir === "DOWN") {
      this.player.body.setVelocityX(impulse);
    } else {
      this.player.body.setVelocityY(impulse);
    }

    this.time.delayedCall(1200, () => this.scene.start("gameover"));
  }

  attemptTurn(turnIntent) {
    if (this.isGameOver) return;
    this.leanDirection = turnIntent;
  }

  generateTrackPiece() {
    let type = "way_f";
    let minS = this.speed > 500 ? 0 : this.speed > 350 ? 1 : 2;
    let cChance = 0.4 + (this.speed - 250) / 800;

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
          key: this.player.anims.currentAnim.key,
          frame: this.player.anims.currentFrame.index,
        },
      });
    } catch (e) {
      console.error("Error updating player:", e);
    }

    const dtSeconds = delta / 1000;
    if (this.isGameOver) {
      this.player.setRotation(
        this.carrier.rotation + Phaser.Math.DegToRad(this.playerLeanAngle),
      );
      return;
    }

    this.speed = Math.min(850, this.speed + 7 * dtSeconds);
    const distanceStep = this.speed * dtSeconds;
    this.distanceTraveled += distanceStep;

    let remaining = Math.max(
      0,
      Math.floor(this.targetDistance - this.distanceTraveled),
    );
    this.distanceText.setText(`${remaining}`);

    if (this.distanceTraveled >= this.targetDistance) {
      this.isGameOver = true;
      this.scene.start("win");
    }

    const v = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[
      this.carrierTravelDir
    ];
    this.carrier.setVelocity(v[0] * this.speed, v[1] * this.speed);

    // 1. Verifica em qual peça estamos e se é uma curva correta
    const cp = this.getPieceUnder(this.carrier);
    let isOnCorrectCurve = false;

    if (cp && cp !== this.carrier.lastTurnedPiece && cp.trackType !== "way_f") {
      const requiredTurn = cp.trackType === "way_r" ? "RIGHT" : "LEFT";
      if (this.leanDirection === requiredTurn) {
        isOnCorrectCurve = true;
      }
    }

    // 2. Lógica de inclinação: Trava em 30 graus durante o jogo normal (Novo limite solicitado)
    if (this.leanDirection === "LEFT") {
      this.playerLeanAngle -= this.leanSpeed * dtSeconds;
      // Sempre trava em 30, a curva correta é gerenciada pela física depois
      if (this.playerLeanAngle < -30) this.playerLeanAngle = -30;
      this.player.setFlipX(true);
    } else if (this.leanDirection === "RIGHT") {
      this.playerLeanAngle += this.leanSpeed * dtSeconds;
      if (this.playerLeanAngle > 30) this.playerLeanAngle = 30; // Trava em 30
      this.player.setFlipX(false);
    }

    // 3. Gerenciamento de frames: Apenas 0 e 1 no jogo normal
    const absAngle = Math.abs(this.playerLeanAngle);
    if (absAngle < 15) {
      this.player.setFrame(0);
    } else {
      // Inclinação suave até 30 graus usa o frame 1
      this.player.setFrame(1);
    }
    // O frame 2 (absAngle >= 60) é gerenciado apenas dentro do triggerFall()

    this.player.setRotation(
      this.carrier.rotation + Phaser.Math.DegToRad(this.playerLeanAngle),
    );
    this.player.setPosition(this.carrier.x, this.carrier.y);

    // 4. Se inclinou fora da curva, ele deve cair.
    // Como limitamos a 30, precisamos checar se ele está inclinando em uma reta.
    if (cp && cp.trackType === "way_f" && this.leanDirection !== "NONE") {
      this.triggerFall();
    }

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

    // 5. Mecânica de passagem pela curva
    if (cp && cp !== this.carrier.lastTurnedPiece && cp.trackType !== "way_f") {
      let passed =
        (this.carrierTravelDir === "UP" && this.carrier.y <= cp.y) ||
        (this.carrierTravelDir === "DOWN" && this.carrier.y >= cp.y) ||
        (this.carrierTravelDir === "RIGHT" && this.carrier.x >= cp.x) ||
        (this.carrierTravelDir === "LEFT" && this.carrier.x <= cp.x);

      if (passed) {
        const requiredTurn = cp.trackType === "way_r" ? "RIGHT" : "LEFT";

        if (this.leanDirection === requiredTurn) {
          const next = {
            UP: { RIGHT: "RIGHT", LEFT: "LEFT" },
            RIGHT: { RIGHT: "DOWN", LEFT: "UP" },
            LEFT: { RIGHT: "UP", LEFT: "DOWN" },
            DOWN: { RIGHT: "LEFT", LEFT: "RIGHT" },
          }[this.carrierTravelDir][requiredTurn];

          this.carrierTravelDir = next;
          this.carrier.setPosition(cp.x, cp.y);
          this.carrier.lastTurnedPiece = cp;

          this.playerLeanAngle = 0;
          this.leanDirection = "NONE";
          this.player.setFrame(0);
          this.player.setFlipX(requiredTurn === "LEFT");

          this.sound.play("swoosh");
          this.updateCameraRotation();
        } else {
          this.triggerFall();
        }
      }
    }

    if (
      Phaser.Math.Distance.Between(
        this.carrier.x,
        this.carrier.y,
        this.roadPieces[this.roadPieces.length - 1].x,
        this.roadPieces[this.roadPieces.length - 1].y,
      ) < 1500
    ) {
      this.generateTrackPiece();
    }

    if (this.roadPieces.length > 40) this.roadPieces.shift().destroy();

    if (!this.getPieceUnder(this.carrier)) this.triggerFall();
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
