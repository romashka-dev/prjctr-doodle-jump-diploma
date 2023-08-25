'use strict'

let player;
let floor;
let tile;
let tilesGroup;
let score = 0;
let maxScore = 0;
let scoreText;
let GameOverText;
let tn;

class Game extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  preload() {
    /* Загружаємо всі зображення */
    this.load.svg("player", "img/player-01.svg", { scale: .8 });
    this.load.svg("tile-platform", "img/platform.svg", { scale: 1 });
    this.load.svg("tile-ground", "img/ground.svg", { scale: .2 });
  }

  create() {
    /* Створюємо головну платформу і додаємо фізику + деякі налаштування */
    floor = this.physics.add.image(game.config.width / 2, 830, 'tile-ground');
    floor.setImmovable();
    floor.scale = 6;

    /* Створюємо плитки/платформи */
    this.createTiles();
    /* Створюємо ігрока */
    this.createPlayer();

    // Отримаємо останній score з localStorage та додаємо його до maxScore в самій грі
    const lastScore = parseInt(localStorage.getItem('lastScore')) || 0;
    maxScore += lastScore;

    /* Score текст */
    scoreText = this.add.text(14, 14, 'Score: ' + score + ' | Max Score: ' + maxScore, { fontFamily: '"Share Tech Mono"', fontSize: '32px', fill: '#27374D' }).setScrollFactor(0);
    scoreText.depth = 2;

    /* Game Over текст */
    GameOverText = this.add.text(game.config.width / 2, game.config.height - 600, 'GAME OVER', { fontFamily: '"Share Tech Mono"', fontSize: '32px', fill: '#27374D' }).setScrollFactor(0);
    GameOverText.setOrigin(0.5);
    GameOverText.depth = 2;
    GameOverText.visible = false;

    /* Перевірки зіткнень і подій */
    this.physics.add.collider(player, floor, this.GameOver, null, this);
    this.physics.add.collider(player, tilesGroup, this.bounceBack, null, this);

    /* Камера і слідкування за плитками */
    this.cameraYMin = 99999;
    this.tileYMin = 99999;

    /* Управління клавіатурою  */
    this.key_left = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.key_right = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.key_Up = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);

    /* Клік за допомогою миши */
    this.input.mouse.disableContextMenu();
  }

  update() {
    /* Слідкування за макс кількістю плиток, яку пройшов ігрок */
    player.yChange = Math.max(player.yChange, Math.abs(player.y - player.yOrig));

    /* Динамічно змінюємо межі екрану залежно від позиції гравця */
    this.physics.world.setBounds(0, -player.yChange, this.physics.world.bounds.width, this.game.config.height + player.yChange);

    /* Фокус на гравця, коли він рухається */
    this.cameras.main.setLerp(.5);
    this.cameras.main.centerOnY(player.y);

    /* Контролювання руху гравця вліво/вправо (подія відбувається, коли клавіша натиснута на клавіатурі) */
    if (this.key_right.isDown) player.body.velocity.x = 400;
    else if (this.key_left.isDown) player.body.velocity.x = -400;
    else player.body.velocity.x = 0;

    /* Перехід гравця меж екарну зліва <==> зправа */
    this.physics.world.wrap(player, player.width / 6, false);

    /* Якщо гравець падає вниз - гра закінчується */
    if (player.y > this.cameraYMin + this.game.config.height) {
      this.GameOver();
    }

    /* Для кожного дочірнього елемента TilesGroup з’ясуйте, який із них найвищий,
    якщо один проходить нижче огляду камери, то створіть новий на відстані від найвищого */
    tilesGroup.children.iterate(function (item) {
      const chance = Phaser.Math.Between(1, 100);
      let xAxis;
      const yAxis = this.tileYMin - 200;
      this.tileYMin = Math.min(this.tileYMin, item.y);
      this.cameraYMin = Math.min(this.cameraYMin, player.y - this.game.config.height + 430);

      if (item.y > this.cameraYMin + this.game.config.height) {
        item.destroy();
        /* 15% припущення для зникнення плитки */
        if (chance > 75 && chance < 81) {
          xAxis = Phaser.Math.Between(100, this.physics.world.bounds.width - 100);
          tn = this.spawnTile(xAxis, yAxis, 'tile-platform');
        }
        /* в іншому випадку генеруємо регулярні плитки */
        else if (chance < 71)
          xAxis = Phaser.Math.Between(100, this.physics.world.bounds.width - 100);
        tn = this.spawnTile(xAxis, yAxis, 'tile-platform');
      }
    }, this);
  }

  /* Створення гравця */
  createPlayer() {
    player = this.physics.add.image(game.config.width / 2, 3 * game.config.height / 4, "player");
    player.setVelocity(0, -500);
    player.setGravityY(360);
    player.setBounce(0.4);
    player.body.checkCollision.up = false;
    player.depth = 1;

    player.yOrig = player.y;
    player.yChange = 0;
  }

  /* Створення плиток/платформ */
  createTiles() {
    tilesGroup = this.physics.add.staticGroup({ runChildUpdate: true });
    tilesGroup.enableBody = true;

    // spawnTile();
    for (let i = 0; i < 5; i++) {
      tn = this.spawnTile(Phaser.Math.Between(25, this.physics.world.bounds.width - 25), this.physics.world.bounds.height - 200 - 200 * i, 'tile-platform');
    }
  }

  /* Додаткова функція для створення регулярних плиток */
  spawnTile(x, y, type) {
    tile = tilesGroup.create(x, y, type);
    tile.setImmovable();
    return tile;
  }

  /* Виконання певних дій при взаємодії з плитками */
  bounceBack(_player, _tilesGroup) {
    if (_player.body.touching.down && _tilesGroup.body.touching.up) {
      score += 10;
      scoreText.setText('Score: ' + score + ' | Max Score: ' + maxScore);
      player.body.velocity.y = -400;
    }
  }

  GameOver() {
    // Збергаємо score значення в localStorage
    localStorage.setItem('lastScore', score);

    // Показуємо Game Over текст
    GameOverText.visible = true;

    scoreText.setPosition(this.game.config.width / 2, this.game.config.height - 600 + 50);
    scoreText.setFontSize(32);
    scoreText.setOrigin(0.5);

    /* Ховаємо плитки */
    tilesGroup.setAlpha(0);
    tilesGroup.clear();

    /* Opacity */
    player.setAlpha(.45);
  }

  handleOrientation(e) {
    const dx = e.gamma;
    const edx = (dx / 3.5) ** 4;
    
    if (dx < 0) {
      player.body.velocity.x = -edx;
    } else {
      player.body.velocity.x = edx;
    }

    if (player.body.velocity.x > 400) {
      player.body.velocity.x = 400;
    }
    else if (player.body.velocity.x < -400)
      player.body.velocity.x = -400;
  }
}

const config = {
  type: Phaser.AUTO,
  scale: {
    parent: 'gamespace',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 600,
    height: 800
  },
  physics: {
    default: 'arcade',
    arcade: {
      // debug: true
    }
  },
  scene: [Game,],
  backgroundColor: 0x33BBC5
};
const game = new Phaser.Game(config);