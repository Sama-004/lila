import type { GameCtrl } from './gameCtrl';
import type { BotCtrl } from './botCtrl';
import * as co from 'chessops';
import { showSetupDialog } from './setupDialog';
import { LocalGame } from './localGame';
import { clockToSpeed } from 'game';
import type { RoundProxy as IRoundProxy, RoundController, RoundData, RoundOpts } from 'round';
import { analyse } from './analyse';

export class RoundProxy implements IRoundProxy {
  data: RoundData;
  handlers: SocketHandlers = {
    move: (d: any) => this.gameCtrl.move(d.u),
    resign: () => this.gameCtrl.resign(),
    'blindfold-no': () => {},
    'blindfold-yes': () => {},
    'rematch-yes': () => this.gameCtrl.reset(),
    'draw-yes': () => this.gameCtrl.draw(),
  };
  constructor(readonly gameCtrl: GameCtrl) {
    this.data = Object.defineProperties(
      {
        game: {
          id: 'synthetic',
          variant: { key: 'standard', name: 'Standard', short: 'Std' },
          speed: 'classical',
          perf: 'unlimited',
          rated: false,
          fen: gameCtrl.fen,
          turns: gameCtrl.ply,
          source: 'local',
          status: { id: 20, name: 'started' },
          player: gameCtrl.ply % 2 ? 'black' : 'white',
        },
        player: this.player('white', ''),
        opponent: this.player('black', ''),
        pref: this.gameCtrl.opts.pref,
        steps: [{ ply: 0, san: '', uci: '', fen: gameCtrl.fen }],
        takebackable: false,
        moretimeable: false,
        possibleMoves: this.gameCtrl.live.dests,
      },
      {
        clock: { get: () => gameCtrl.clock },
      },
    );
    this.reset();
  }
  send(t: string, d?: any): void {
    if (this.handlers[t]) this.handlers[t]?.(d);
    else console.log('send: no handler for', t, d);
  }
  newOpponent = (): void => showSetupDialog(this.botCtrl, this.gameCtrl.setup, this.gameCtrl);
  analyse = (): void => analyse(this.gameCtrl);
  moreTime = (): void => {};
  outoftime = (): void => this.gameCtrl.flag();
  berserk = (): void => {};
  sendLoading = (typ: string, data?: any): void => this.send(typ, data);
  receive = (typ: string, data: any): boolean => {
    if (this.handlers[typ]) this.handlers[typ]?.(data);
    else console.log('recv: no handler for', typ, data);
    return true;
  };
  reload = (): void => site.reload();

  updateCg(game: LocalGame | undefined, cgOpts?: CgConfig): void {
    const gameUpdates: CgConfig = {};
    if (game) {
      gameUpdates.fen = game.fen;
      gameUpdates.check = game.chess.isCheck();
      gameUpdates.turnColor = game.turn;
      if (this.gameCtrl.history || this.gameCtrl.isUserTurn)
        gameUpdates.movable = {
          color: game.turn,
          dests: game.cgDests,
        };
    }
    this.round.chessground?.set({ ...gameUpdates, ...cgOpts });
  }

  reset(): void {
    const bottom = this.gameCtrl.originalOrientation;
    const top = co.opposite(bottom);
    const twoPlayers = !this.gameCtrl.setup.white && !this.gameCtrl.setup.black;
    const playerName = {
      white: twoPlayers ? 'White player' : 'Player',
      black: twoPlayers ? 'Black player' : 'Player',
    };
    this.data.game.fen = this.gameCtrl.fen;
    this.data.game.turns = 0;
    this.data.game.status = { id: 20, name: 'started' };
    this.data.steps = [{ ply: 0, san: '', uci: '', fen: this.gameCtrl.fen }];
    this.data.possibleMoves = this.gameCtrl.live.dests;
    this.data.player = this.player(bottom, this.botCtrl[bottom]?.name ?? playerName[bottom]);
    this.data.opponent = this.player(top, this.botCtrl[top]?.name ?? playerName[top]);
    if (this.round) this.round.ply = 0;
    this.data.game.speed = this.data.game.perf = clockToSpeed(
      this.gameCtrl.setup.initial ?? Infinity,
      this.gameCtrl.setup.increment ?? 0,
    );
  }

  get round(): RoundController {
    return this.gameCtrl.round;
  }

  get roundOpts(): RoundOpts {
    return {
      local: this,
      data: this.data,
      userId: '',
      noab: false,
      i18n: this.gameCtrl.opts.i18n,
      //socketSend: this.send,
      onChange: () => {
        if (this.round.ply === 0)
          this.updateCg(undefined, {
            lastMove: undefined,
            orientation: this.gameCtrl.originalOrientation,
            events: { move: undefined },
          });
      },
    };
  }

  private get botCtrl(): BotCtrl {
    return this.gameCtrl.botCtrl;
  }

  private player(color: Color, name: string): RoundData['player'] {
    return {
      color,
      user: {
        id: '',
        username: name,
        online: true,
        perfs: {},
      },
      id: '',
      isGone: false,
      name,
      onGame: true,
      version: 0,
    };
  }
}
