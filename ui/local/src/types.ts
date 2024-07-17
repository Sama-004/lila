import type { RoundData } from 'round';
import type { Position, FishSearch } from 'zerofish';
import type { CardData } from './handOfCards';
import type { GameState } from './game';
import type { Chess } from 'chessops';

export type { CardData };

export interface Quirks {
  takebacks?: number; // 0 to 1 is the chance of asking for a takeback at mistake or below
}

export type Point = [number, number];

export interface Operator {
  readonly range: { min: number; max: number };
  from: 'move' | 'score';
  data: Point[];
}

export type Trigger =
  | 'greeting'
  | 'move'
  | 'takeback'
  | 'playerBlunder'
  | 'botBlunder'
  | 'playerWin'
  | 'botWin'
  | 'playerCheck'
  | 'botCheck'
  | 'botCapture'
  | 'playerCapture';

export type Sounds = { [key in Trigger]?: { [sound: string]: number } };

export type Operators = { [key: string]: Operator };

export type ZeroSearch = { multipv: number; net: string };

export type Book = { name: string; weight?: number };

export type Glicko = { r: number; rd: number };

export interface BotInfo {
  readonly uid: string;
  readonly name: string;
  readonly description: string;
  readonly image?: string;
  readonly sounds?: Sounds;
  readonly glicko?: Glicko;
}

export type BotInfos = { [id: string]: BotInfo };

export interface Libot extends BotInfo {
  glicko?: Glicko;
  readonly ratingText: string;

  move: (pos: Position, chess?: Chess) => Promise<Uci>;
}

export type Libots = { [id: string]: Libot };

export interface ZerofishBotInfo extends BotInfo {
  readonly books?: Book[];
  readonly zero?: ZeroSearch;
  readonly fish?: FishSearch;
  readonly quirks?: Quirks;
  readonly operators?: Operators;
}

export interface LocalPlayOpts {
  pref: any;
  i18n: any;
  data: RoundData;
  setup?: LocalSetup;
  state?: GameState;
  devUi?: boolean;
  assets?: { net: string[]; image: string[]; book: string[]; sound: string[] };
}

export interface LocalSetup {
  white?: string;
  black?: string;
  fen?: string;
  time?: string;
  go?: boolean;
}

export type Outcome = 'white' | 'black' | 'draw';

export interface Automator {
  onGameEnd: (outcome: Outcome, reason: string) => boolean; // returns true to keep going
  onMove?: (fen: string) => void;
  onReset?: () => void;
  isStopped?: boolean;
}

export interface Result {
  outcome: Outcome;
  white?: string;
  black?: string;
  reason: string;
}

export interface Matchup {
  white: string;
  black: string;
}

export type NetData = {
  key: string;
  data: Uint8Array;
};
