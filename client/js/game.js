import config from "./config.js";
import Scene0 from "./scene0.js";
import Menu from "./menu.js";
import preloader from "./preloader.js";
import room from "./room.js";
import GameOver from "./gameover.js";
import Win from "./win.js";

class Game extends Phaser.Game {
  constructor() {
    super(config);
    this.scene.add("menu", Menu);
    this.scene.add("preloader", preloader);
    this.scene.add("room", room);
    this.scene.add("scene0", Scene0);
    this.scene.add("gameover", GameOver);
    this.scene.add("win", Win);
    this.scene.start("menu");

    if (location.hostname.match(/localhost|127\.0\.0\.1/)) {
      this.socket = io("http://localhost:3000");
    } else if (location.hostname.match(/github\.dev/)) {
      this.socket = io(location.hostname.replace("8080", "3000"));
    } else {
      this.socket = io();
    }

    this.socket.on("connect", () => {
      console.log("Socket ID:", this.socket.id);

      this.socket.on("change-scene", (scene) => {
        let currentScene = this.scene.scenes.find((s) =>
          s.scene.isActive(),
        ).scene.key

        if (currentScene !== scene) {
          console.log("Changing scene to:", scene);
          this.scene.stop(currentScene);
          this.scene.start(scene);
        }
      });
    });
  }
}

window.onload = () => {
  new Game();
};
