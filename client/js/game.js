import config from "./config.js";
import Scene0 from "./scene0.js";
import Start from "./start.js";
import preloader from "./preloader.js";
import Menu from "./menu.js";
import room from "./room.js";
import NameEntry from "./nameentry.js";
import Leaderboard from "./leaderboard.js";
import GameOver from "./gameover.js";
import Win from "./win.js";
import Cutscene from "./cutscene.js";

class Game extends Phaser.Game {
  constructor() {
    super(config);
    this.scene.add("start", Start);
    this.scene.add("preloader", preloader);
    this.scene.add("menu", Menu);
    this.scene.add("room", room);
    this.scene.add("nameentry", NameEntry);
    this.scene.add("leaderboard", Leaderboard);

    // --- 2. ADICIONAR A CUTSCENE AQUI ---
    this.scene.add("cutscene", Cutscene);

    this.scene.add("scene0", Scene0);
    this.scene.add("gameover", GameOver);
    this.scene.add("win", Win);
    this.scene.start("start");

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
        const activeScenes = this.scene.getScenes(true);
        activeScenes.forEach((s) => {
          if (s.scene.key !== scene) {
            this.scene.stop(s.scene.key);
          }
        });
        const isAlreadyActive = activeScenes.some((s) => s.scene.key === scene);

        if (!isAlreadyActive) {
          console.log("Changing scene to:", scene);
          this.scene.start(scene);
        }
      });
    });
  }
}

window.onload = () => {
  new Game();
};
