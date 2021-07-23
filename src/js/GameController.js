/* eslint-disable max-len */
import GamePlay from './GamePlay';
import Team from './Team';
import { generateTeam, classGenerator, characterGenerator } from './generators';
import PositionedCharacter from './PositionedCharacter';
import GameState from './GameState';
import Themes from './themes';
import cursors from './cursors';

const playerClasses = [
  {
    attack: 40, defence: 10, type: 'swordsman', atkradius: 1, moveradius: 4,
  },
  {
    attack: 25, defence: 25, type: 'bowman', atkradius: 2, moveradius: 2,
  },
  {
    attack: 10, defence: 40, type: 'magician', atkradius: 4, moveradius: 1,
  },
];

const enemyClasses = [
  {
    attack: 40, defence: 10, type: 'undead', atkradius: 1, moveradius: 4,
  },
  {
    attack: 25, defence: 25, type: 'vampire', atkradius: 2, moveradius: 2,
  },
  {
    attack: 10, defence: 40, type: 'zombie', atkradius: 4, moveradius: 1,
  },
];

export default class GameController {
  constructor(gamePlay, stateService) {
    this.gamePlay = gamePlay;
    this.stateService = stateService;
    this.boardSize = 8;
    this.themes = [...new Themes()];
  }

  rebuildSavedTeam(savedTeam) {
    let classes;
    const team = new Team(savedTeam.side, []);
    if (savedTeam.side === 'player') classes = playerClasses;
    else classes = enemyClasses;
    savedTeam.characters.forEach((c) => {
      const { position } = c;
      const char = c.character;

      const charClass = classes.filter((cl) => cl.type === char.type);
      const generatedClass = [...classGenerator(charClass)];
      const charGenerator = characterGenerator(generatedClass, char.level);
      const generatedChar = charGenerator.next().value;
      generatedChar.level = char.level;
      generatedChar.attack = char.attack;
      generatedChar.defence = char.defence;
      generatedChar.health = char.health;

      const positionedCharecter = new PositionedCharacter(generatedChar, position);
      team.characters.push(positionedCharecter);
    });

    if (savedTeam.side === 'player') this.playerteam = team;
    else this.enemyteam = team;
  }

  positionTeam(team, positions) {
    for (let i = 0; i < team.characters.length; i += 1) {
      let pos;
      if (!(team.characters[i] instanceof PositionedCharacter)) {
        pos = positions[Math.floor((Math.random() * positions.length))];
        if (team.side === 'player') this.playerteam.characters[i] = new PositionedCharacter(team.characters[i], pos);
        else this.enemyteam.characters[i] = new PositionedCharacter(team.characters[i], pos);
      } else { pos = team.characters[i].position; }
      positions.splice(positions.indexOf(pos), 1);
      this.positions.delete(pos);
    }
  }

  positionTeams(lvl) {
    let positions = Array.from(this.positions);
    const size = this.boardSize;

    if (lvl === 1) {
      positions = positions.filter((pos) => (pos % size === 0 || pos % size === 1));
    }

    this.positionTeam(this.playerteam, positions);
    positions = Array.from(this.positions);

    if (lvl === 1) {
      positions = positions.filter((pos) => (pos % size === 7 || pos % size === 6));
    }

    this.positionTeam(this.enemyteam, positions);
  }

  setScore() {
    this.gamePlay.setScore('current', this.gameState.score);
    if (this.gameState.score > this.gameState.topscore) {
      this.gameState.topscore = this.gameState.score;
    }
    this.gamePlay.setScore('top', this.gameState.topscore);
  }

  init() {
    this.gameState = new GameState(this.stateService.load());

    if (this.gameState.playerteam) {
      this.rebuildSavedTeam(this.gameState.playerteam);
      this.rebuildSavedTeam(this.gameState.enemyteam);
    } else {
      this.playerteam = new Team('player', generateTeam([...classGenerator(playerClasses)], 1, 2));
      this.enemyteam = new Team('enemy', generateTeam([...classGenerator(enemyClasses)], 1, 2));
    }

    this.positions = new Set(Array(this.boardSize ** 2).keys());
    this.positionTeams(this.gameState.level || 1);

    if (!this.gamePlay.cellClickListeners.length) {
      this.gamePlay.drawUi(this.themes[0]);
      this.addCellEnterEvent();
      this.addCellLeaveEvent();
      this.addCellClickEvent();
      this.addNewGameClickEvent();
      this.addSaveGameClickEvent();
      this.addLoadGameClickEvent();
    }

    this.gamePlay.redrawPositions(this.playerteam.characters.concat(this.enemyteam.characters));
    this.setScore();

    if (this.gameState.stage === 'move') {
      const selectedCrarPosition = this.gameState.selectedChar.position;
      this.selectChar(this.playerteam.characters.filter((c) => c.position === selectedCrarPosition)[0]);
    }
  }

  levelUp() {
    this.playerteam.characters.forEach((c) => {
      const char = c.character;
      this.gameState.score += char.health;
      char.level += 1;
      char.health += 80;
      char.attack = Math.max(char.attack, char.attack * ((1.8 - char.health) / 100));
      if (char.health >= 100) char.health = 100;
    });

    this.enemyteam = new Team('enemy', generateTeam([...classGenerator(enemyClasses)], this.gameState.level + 1, this.playerteam.characters.length));
    const newPlayerChar = characterGenerator([...classGenerator(playerClasses)], this.gameState.level);
    this.playerteam.characters.push(newPlayerChar.next().value);

    this.gameState.level += 1;

    this.gamePlay.drawUi(this.themes[0]);
    this.positions = new Set(Array(this.boardSize ** 2).keys());
    this.positionTeams(this.gameState.level);
    this.gamePlay.redrawPositions(this.playerteam.characters.concat(this.enemyteam.characters));
    this.setScore();
    this.gameState.stage = 'select';
  }

  startNew() {
    this.setScore();
    this.gameState.score = 0;
    if (this.gameState.stage === 'move') {
      this.gamePlay.deselectCell(this.gameState.selectedChar.position);
      this.gameState.selectedChar = null;
    }
    this.playerteam = new Team('player', generateTeam([...classGenerator(playerClasses)], 1, 2));
    this.enemyteam = new Team('enemy', generateTeam([...classGenerator(enemyClasses)], 1, 2));
    this.positions = new Set(Array(this.boardSize ** 2).keys());
    this.positionTeams(this.gameState.level || 1);
    this.gamePlay.redrawPositions(this.playerteam.characters.concat(this.enemyteam.characters));
    this.gameState.stage = 'select';
    this.setScore();
  }

  lose() {
    GamePlay.showError('You LOSE!');
    this.startNew();
  }

  selectChar(char) {
    if (this.gameState.stage !== 'botselect') {
      if (this.gameState.selectedChar) {
        this.gamePlay.deselectCell(this.gameState.selectedChar.position);
      }
      this.gamePlay.selectCell(char.position);
    }

    this.gameState.selectedChar = char;
    this.findRanges();
  }

  findRange(index, position, r, type) {
    const range = new Set();
    const { row, col } = position;
    const left = ((col - r) <= 0) ? col : r;
    const right = ((col + r) >= this.boardSize) ? this.boardSize - col : r;
    const top = ((row - r) <= 0) ? row : r;
    const bottom = ((row + r) >= this.boardSize) ? this.boardSize - row : r;

    for (let i = -top; i <= bottom; i += 1) {
      for (let j = -left; j <= right; j += 1) {
        if (type === 'attack') range.add(index + i * this.boardSize + j);
        else if ((Math.abs(i) === Math.abs(j)) || (i === 0) || (j === 0)) {
          range.add(index + i * this.boardSize + j);
        }
      }
    }
    const result = (Array.from(range));
    return result.filter((i) => (i >= 0) && (i < this.boardSize ** 2) && (i !== index));
  }

  findRanges() {
    const char = this.gameState.selectedChar;
    const row = Math.floor((char.position) / this.boardSize) + 1;
    const col = char.position - this.boardSize * (row - 1) + 1;

    char.attackRange = this.findRange(char.position, { row, col }, char.character.atkradius, 'attack');
    char.moveRange = this.findRange(char.position, { row, col }, char.character.moveradius, 'move');
  }

  onCellClick(index) {
    const { stage } = this.gameState;
    if (stage === 'select' && !this.positions.has(index)) {
      const char = this.playerteam.characters.concat(this.enemyteam.characters).filter((c) => c.position === index)[0];

      if (!this.playerteam.characters.includes(char)) {
        GamePlay.showError('Выберите персонажа СВОЕЙ команды!');
        return;
      }

      this.selectChar(char);
      this.gameState.stage = 'move';
      return;
    }

    const allies = (stage === 'move') ? this.playerteam.characters : this.enemyteam.characters;
    const enemies = (stage === 'move') ? this.enemyteam.characters : this.playerteam.characters;

    if (!this.positions.has(index)) {
      const char = allies.filter((c) => c.position === index)[0];
      if (char) {
        this.selectChar(char, index);
        this.gameState.stage = 'move';
      } else {
        const attacker = this.gameState.selectedChar;
        const target = enemies.filter((c) => c.position === index)[0];
        if (attacker.attackRange.includes(index)) {
          const damage = Math.max(attacker.character.attack - target.character.defence, attacker.character.attack * 0.1);
          this.gamePlay.showDamage(index, damage);
          target.character.health -= damage;
          this.gamePlay.redrawPositions(allies.concat(enemies));
          if (target.character.health <= 0) {
            this.positions.add(index);
            if (stage === 'move') this.enemyteam.characters.splice(this.enemyteam.characters.indexOf(target), 1);
            else this.playerteam.characters.splice(this.playerteam.characters.indexOf(target), 1);
            if (stage === 'move' && this.enemyteam.characters.length === 0) this.levelUp();
            else if (stage === 'botmove' && this.playerteam.characters.length === 0) this.lose();
            else {
              this.gamePlay.redrawPositions(allies.concat(enemies));
              if (stage !== 'botmove') this.botMove();
              this.gameState.stage = 'select';
            }
          } else {
            this.gamePlay.deselectCell(attacker.position);
            this.gamePlay.redrawPositions(allies.concat(enemies));
            if (stage !== 'botmove') this.botMove();
            this.gameState.stage = 'select';
          }
        } else {
          GamePlay.showError('Цель слишком далеко!');
          this.gameState.stage = 'move';
        }
      }
    } else {
      const char = this.gameState.selectedChar;
      if (char.moveRange.includes(index)) {
        this.gamePlay.deselectCell(char.position);
        this.positions.add(char.position);
        this.positions.delete(index);
        char.position = index;
        this.gamePlay.redrawPositions(this.playerteam.characters.concat(this.enemyteam.characters));
        if (stage !== 'botmove') this.botMove();
        this.gameState.stage = 'select';
      } else {
        GamePlay.showError('Недоступно!');
        this.gameState.stage = 'move';
      }
    }
  }

  botMove() {
    this.gameState.stage = 'botselect';
    const bots = this.enemyteam.characters;
    const char = bots[Math.floor((Math.random() * bots.length))];
    this.selectChar(char);
    const target = this.playerteam.characters.filter(
      (c) => char.attackRange.includes(c.position),
    ).sort((a, b) => b.character.health - a.character.health)[0];
    this.gameState.stage = 'botmove';
    if (target) {
      this.onCellClick(target.position);
    } else {
      const moveRange = char.moveRange.filter((i) => this.positions.has(i));
      const index = moveRange[Math.floor((Math.random() * moveRange.length))];
      this.positions.add(char.position);
      this.positions.delete(index);
      char.position = index;
      this.gamePlay.redrawPositions(this.playerteam.characters.concat(this.enemyteam.characters));
    }
  }

  addCellClickEvent() {
    this.onCellClick = this.onCellClick.bind(this);
    this.gamePlay.addCellClickListener(this.onCellClick);
  }

  onNewGameClick() {
    this.startNew();
  }

  addNewGameClickEvent() {
    this.onNewGameClick = this.onNewGameClick.bind(this);
    this.gamePlay.addNewGameListener(this.onNewGameClick);
  }

  onLoadGameClick() {
    this.init();
  }

  addLoadGameClickEvent() {
    this.onLoadGameClick = this.onLoadGameClick.bind(this);
    this.gamePlay.addLoadGameListener(this.onLoadGameClick);
  }

  onSaveGameClick() {
    this.gameState.playerteam = this.playerteam;
    this.gameState.enemyteam = this.enemyteam;
    this.gameState.positions = this.positions;
    this.stateService.save(this.gameState);
  }

  addSaveGameClickEvent() {
    this.onSaveGameClick = this.onSaveGameClick.bind(this);
    this.gamePlay.addSaveGameListener(this.onSaveGameClick);
  }

  onCellEnter(index) {
    if (!this.positions.has(index)) {
      const char = this.playerteam.characters.concat(this.enemyteam.characters).filter((c) => c.position === index)[0].character;
      this.gamePlay.showCellTooltip(`🎖 ${char.level} ⚔ ${char.attack} 🛡 ${char.defence} ❤ ${char.health} `, index);
      if (this.gameState.stage === 'move') {
        const attacker = this.gameState.selectedChar;
        const target = this.enemyteam.characters.filter((c) => c.position === index)[0];
        if (target) {
          if (attacker.attackRange.includes(index)) {
            this.gamePlay.setCursor(cursors.crosshair);
            this.gamePlay.selectCell(index, 'red');
          } else { this.gamePlay.setCursor(cursors.notallowed); }
        } else { this.gamePlay.setCursor(cursors.pointer); }
      } else if (this.playerteam.characters.filter((c) => c.position === index)[0]) {
        this.gamePlay.setCursor(cursors.pointer);
      } else { this.gamePlay.setCursor(cursors.notallowed); }
    } else {
      const char = this.gameState.selectedChar;
      if (char && char.moveRange.includes(index)) {
        this.gamePlay.setCursor(cursors.pointer);
      } else { this.gamePlay.setCursor(cursors.notallowed); }
    }
  }

  addCellEnterEvent() {
    this.onCellEnter = this.onCellEnter.bind(this);
    this.gamePlay.addCellEnterListener(this.onCellEnter);
  }

  onCellLeave(index) {
    if (this.gameState.stage === 'select' || this.gameState.selectedChar.position !== index) {
      this.gamePlay.deselectCell(index);
    }
    this.gamePlay.hideCellTooltip(index);
    this.gamePlay.setCursor(cursors.auto);
  }

  addCellLeaveEvent() {
    this.onCellLeave = this.onCellLeave.bind(this);
    this.gamePlay.addCellLeaveListener(this.onCellLeave);
  }
}
