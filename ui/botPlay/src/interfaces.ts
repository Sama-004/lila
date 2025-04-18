import { BotInfo, MoveSource, SoundEvent } from 'lib/bot/types';
import * as Prefs from 'lib/prefs';

export type DateMillis = number; // local millis since Unix epoch = Date.getTime()

export interface BotOpts {
  bots: BotInfo[];
  pref: Pref;
}

export interface Pref {
  animationDuration: number;
  autoQueen: Prefs.AutoQueen;
  blindfold: boolean;
  coords: Prefs.Coords;
  destination: boolean;
  enablePremove: boolean;
  highlight: boolean;
  is3d: boolean;
  keyboardMove: boolean;
  voiceMove: boolean;
  moveEvent: Prefs.MoveEvent;
  rookCastle: boolean;
  showCaptured: boolean;
  resizeHandle: Prefs.ShowResizeHandle;
  clockTenths: Prefs.ShowClockTenths;
  clockBar: boolean;
}

export interface LocalBridge extends MoveSource {
  playSound: (eventList: SoundEvent[]) => number;
}
