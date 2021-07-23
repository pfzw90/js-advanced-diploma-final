export default class GameState {
  constructor(data) {
    if (data) {
      this.playerteam = data.playerteam || null;
      this.enemyteam = data.enemyteam || null;
      this.positions = data.positions || null;
      this.stage = data.stage;
      this.level = data.level;
      this.score = data.score;
      this.topscore = data.topscore;
      this.selectedChar = data.selectedChar;
    } else {
      this.playerteam = null;
      this.enemyteam = null;
      this.positions = null;
      this.stage = 'select';
      this.level = 1;
      this.score = 0;
      this.topscore = 0;
    }
  }
}
