var wobbleSpeed = 8,
  wobbleDist = 0.07;
var playerXSpeed = 7;
var gravity = 30;
var jumpSpeed = 17;

class Level {
  constructor(plan) {
    let rows = plan
      .trim()
      .split('\n')
      .map(l => [...l]);
    this.height = rows.length;
    this.width = rows[0].length;
    this.startActors = [];

    this.rows = rows.map((row, y) => {
      return row.map((ch, x) => {
        let type = levelChars[ch];
        if (ch === '@') console.log('player');
        if (typeof type == 'string') return type;
        if (type === Monster) console.log(x, y, type.create(new Vec(x, y), ch));
        this.startActors.push(type.create(new Vec(x, y), ch));
        return 'empty';
      });
    });
  }

  touches(pos, size, type) {
    let xStart = Math.floor(pos.x);
    let xEnd = Math.ceil(pos.x + size.x);
    let yStart = Math.floor(pos.y);
    let yEnd = Math.ceil(pos.y + size.y);

    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        let isOutside = x < 0 || x >= this.width || y < 0 || y >= this.height;
        let here = isOutside ? 'wall' : this.rows[y][x];
        if (here == type) return true;
      }
    }
    return false;
  }
}

class State {
  constructor(level, actors, status) {
    this.level = level;
    this.actors = actors;
    this.status = status;
  }

  static start(level) {
    return new State(level, level.startActors, 'playing');
  }

  get player() {
    return this.actors.find(a => a.type == 'player');
  }

  update(time, keys) {
    let actors = this.actors.map(actor => actor.update(time, this, keys));
    let newState = new State(this.level, actors, this.status);

    if (newState.status != 'playing') return newState;

    let player = newState.player;
    if (this.level.touches(player.pos, player.size, 'lava')) {
      return new State(this.level, actors, 'lost');
    }

    for (let actor of actors) {
      if (actor != player && State.#overlap(actor, player)) {
        newState = actor.collide(newState);
      }
    }
    return newState;
  }

  static #overlap(actor1, actor2) {
    return (
      actor1.pos.x + actor1.size.x > actor2.pos.x &&
      actor1.pos.x < actor2.pos.x + actor2.size.x &&
      actor1.pos.y + actor1.size.y > actor2.pos.y &&
      actor1.pos.y < actor2.pos.y + actor2.size.y
    );
  }
}

class Vec {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  plus(other) {
    return new Vec(this.x + other.x, this.y + other.y);
  }
  times(factor) {
    return new Vec(this.x * factor, this.y * factor);
  }
  static zero = new Vec(0, 0);
  toString() {
    return `(${this.x}, ${this.y})`;
  }
}

class Actor {
  constructor(pos, speed) {
    this.pos = pos;
    this.speed = speed;
  }

  get type() {
    return this.constructor.name.toLowerCase();
  }

  update(time) {}
}

class Player extends Actor {
  constructor(pos, speed) {
    super(pos, speed);
    this.size = new Vec(0.8, 1.5);
  }

  static create(pos) {
    return new Player(pos.plus(new Vec(0, -0.5)), Vec.zero);
  }

  update(time, state, keys) {
    let xSpeed = 0;
    if (keys.ArrowLeft) xSpeed -= playerXSpeed;
    if (keys.ArrowRight) xSpeed += playerXSpeed;
    let pos = this.pos;
    let movedX = pos.plus(new Vec(xSpeed * time, 0));
    if (!state.level.touches(movedX, this.size, 'wall')) {
      pos = movedX;
    }

    let ySpeed = this.speed.y + time * gravity;
    let movedY = pos.plus(new Vec(0, ySpeed * time));
    if (!state.level.touches(movedY, this.size, 'wall')) {
      pos = movedY;
    } else if (keys.ArrowUp && ySpeed > 0) {
      ySpeed = -jumpSpeed;
    } else {
      ySpeed = 0;
    }
    return new Player(pos, new Vec(xSpeed, ySpeed));
  }
}

class Lava extends Actor {
  constructor(pos, speed, reset) {
    super(pos, speed);
    this.reset = reset;
    this.size = new Vec(1, 1);
  }

  static create(pos, ch) {
    if (ch == '=') {
      return new Lava(pos, new Vec(2, 0));
    } else if (ch == '|') {
      return new Lava(pos, new Vec(0, 2));
    } else if (ch == 'v') {
      return new Lava(pos, new Vec(0, 3), pos);
    }
  }

  collide(state) {
    return new State(state.level, state.actors, 'lost');
  }

  update(time, state) {
    let newPos = this.pos.plus(this.speed.times(time));
    if (!state.level.touches(newPos, this.size, 'wall')) {
      return new Lava(newPos, this.speed, this.reset);
    } else if (this.reset) {
      return new Lava(this.reset, this.speed, this.reset);
    } else {
      return new Lava(this.pos, this.speed.times(-1));
    }
  }
}

class Coin extends Actor {
  constructor(pos, basePos, wobble) {
    super(pos, Vec.zero);
    this.basePos = basePos;
    this.wobble = wobble;
    this.size = new Vec(0.6, 0.6);
  }

  static create(pos) {
    let basePos = pos.plus(new Vec(0.2, 0.1));

    return new Coin(basePos, basePos, Math.random() * Math.PI * 2);
  }

  collide(state) {
    let filtered = state.actors.filter(a => a != this);
    let status = state.status;
    if (!filtered.some(a => a.type == 'coin')) status = 'won';
    return new State(state.level, filtered, status);
  }

  update(time) {
    let wobble = this.wobble + time * wobbleSpeed;
    let wobblePos = Math.sin(wobble) * wobbleDist;
    return new Coin(
      this.basePos.plus(new Vec(0, wobblePos)),
      this.basePos,
      wobble
    );
  }
}

class Monster extends Actor {
  constructor(pos, speed, reset) {
    super(pos, speed);
    this.reset = reset;
    this.size = new Vec(1, 1);
  }

  static create(pos) {
    return new Monster(pos, new Vec(4, 0));
  }

  collide(state) {
    return new State(state.level, state.actors, 'lost');
  }

  update(time, state) {
    let factor = Math.floor(Math.random() * 5) - 5;
    let direction = factor === 0 ? 1 : factor;
    let newPos = this.pos.plus(this.speed.times(time).times(direction));
    if (!state.level.touches(newPos, this.size, 'wall')) {
      return new Monster(newPos, this.speed);
    } else {
      return new Monster(this.pos, this.speed.times(-1));
    }
  }
}

const levelChars = {
  '.': 'empty',
  '#': 'wall',
  '+': 'lava',
  '@': Player,
  o: Coin,
  '=': Lava,
  '|': Lava,
  v: Lava,
  M: Monster,
};
