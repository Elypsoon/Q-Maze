import Phaser from "phaser";

class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
  }

  preload() {
    // Aquí cargarías assets si los tuvieras
  }

  create() {
    // Fondo
    this.cameras.main.setBackgroundColor("#24252A");

    // Crear un rectángulo simple como "jugador"
    this.player = this.add.rectangle(400, 300, 40, 40, 0x5dade2);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    // Texto de instrucciones
    this.add.text(10, 10, "Usa las flechas para mover (ejemplo)", { font: "16px Arial", fill: "#ffffff" });

    // Controles del teclado
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update(time, delta) {
    // Movimiento simple
    const speed = 200;
    const body = this.player.body;

    body.setVelocity(0);

    if (this.cursors.left.isDown) {
      body.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(speed);
    }

    if (this.cursors.up.isDown) {
      body.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      body.setVelocityY(speed);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  scene: [MainScene],
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  }
};

const game = new Phaser.Game(config);
