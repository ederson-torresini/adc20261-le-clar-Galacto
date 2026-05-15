class preloader extends Phaser.Scene {
  constructor() {
    super("preloader");
  }

  init() {
    this.add.image(400, 225, "menu_bg.png");

    this.add.rectangle(400, 300, 468, 32).setStrokeStyle(1, 0xffffff);
    const bar = this.add.rectangle(400 - 230, 300, 4, 28, 0xffffff);

    this.load.on("progress", (progress) => {
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    this.load.setPath("assets/");
        this.load.image("logo", "pixel-art.png");
        this.load.spritesheet("player", "player.png", {
          frameWidth: 32,
          frameHeight: 32,
        });
        this.load.image("way_f", "way_f.png");
        this.load.image("way_l", "way_l.png");
        this.load.image("way_r", "way_r.png");
        this.load.image("spaceship_new", "spaceship_new.png");
        this.load.audio("swoosh", "swoosh.mp3");

        this.load.audio("soundtrack", "soundtrack.mp3");

        this.load.image("aster_1", "aster_1.png");
        this.load.image("aster_2", "aster_2.png");
        this.load.image("aster_3", "aster_3.png");
    
        this.load.image("win_bg", "win_bg.png");
        this.load.image("room-background", "room-background.png");
  }

  create() {
    this.scene.stop("preloader");
    if (this.game.room) {
      this.scene.start("scene0");
    } else {
      this.scene.start("room");
    }
  }
}

export default preloader;
