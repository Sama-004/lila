import * as co from 'chessops';
import { looseH as h, VNode, onInsert, bind } from 'common/snabbdom';
import * as licon from 'common/licon';
import { storedBooleanProp, storedIntProp } from 'common/storage';
import { domDialog } from 'common/dialog';
import { EditDialog } from './editDialog';
import { Bot } from '../bot';
import { playerResults, playersWithResults } from './devUtil';
import { handOfCards, type Drop, type HandOfCards } from '../handOfCards';
import { domIdToUid, uidToDomId, type BotCtrl } from '../botCtrl';
import type { DevCtrl } from './devCtrl';
import type { GameCtrl } from '../gameCtrl';
import { rangeTicks } from '../gameView';
import { defined } from 'common';
import { LocalSetup } from '../types';

interface DevContext {
  devCtrl: DevCtrl;
  botCtrl: BotCtrl;
  gameCtrl: GameCtrl;
}

function devContext(devCtrl: DevCtrl): DevContext {
  return {
    devCtrl,
    gameCtrl: devCtrl.gameCtrl,
    botCtrl: devCtrl.gameCtrl.botCtrl,
  };
}

export function renderDevView(devCtrl: DevCtrl): VNode {
  const ctx = devContext(devCtrl);
  document
    .querySelectorAll('div.rclock')
    .forEach(el => el.classList.toggle('none', (ctx.gameCtrl.setup.initial ?? Infinity) === Infinity));
  return h('div.dev-side.dev-view', [
    h('div', player(ctx, co.opposite(ctx.gameCtrl.cgOrientation))),
    dashboard(ctx),
    progress(ctx),
    h('div', player(ctx, ctx.gameCtrl.cgOrientation)),
  ]);
}

function player(ctx: DevContext, color: Color): VNode {
  const { devCtrl, botCtrl, gameCtrl } = ctx;
  const p = botCtrl[color] as Bot | undefined;
  const imgUrl = botCtrl.imageUrl(p) ?? `/assets/lifat/bots/misc/${color}-torso.webp`;
  const isLight = document.documentElement.classList.contains('light');
  const buttonClass = {
    white: isLight ? '.button-metal' : '.button-inverse',
    black: isLight ? '.button-inverse' : '.button-metal',
  };
  console.log(color, p?.uid);
  return h(
    `div.player`,
    {
      attrs: { 'data-color': color },
      hook: onInsert(el => el.addEventListener('click', () => showBotSelector(ctx, el))),
    },
    [
      botCtrl[color] &&
        h(`button.upper-right`, {
          attrs: { 'data-action': 'remove', 'data-icon': licon.Cancel },
          hook: bind('click', e => {
            reset(ctx, { ...botCtrl.uids, [color]: undefined });
            e.stopPropagation();
          }),
        }),
      h('img', { attrs: { src: imgUrl } }),
      p &&
        !('level' in p) &&
        h('div.bot-actions', [
          p instanceof Bot &&
            h(
              'button.button' + buttonClass[color],
              {
                hook: onInsert(el =>
                  el.addEventListener('click', e => {
                    editBot(ctx, color);
                    e.stopPropagation();
                  }),
                ),
              },
              'Edit',
            ),
          h(
            'button.button' + buttonClass[color],
            {
              hook: onInsert(el =>
                el.addEventListener('click', e => {
                  botCtrl.setRating(p.uid, gameCtrl.speed, { r: 1500, rd: 350 });
                  e.stopPropagation();
                  devCtrl.run({
                    type: 'rate',
                    players: [p.uid, ...botCtrl.rateBots.map(b => b.uid)],
                  });
                }),
              ),
            },
            'rate',
          ),
        ]),
      h('div.stats', [
        h('span', p?.name ? `${p.name} ${botCtrl.ratingText(p.uid, gameCtrl.speed)}` : `Player ${color}`),
        p instanceof Bot && h('span.totals', p.statsText),
        h('span.totals', playerResults(devCtrl.log, botCtrl[color]?.uid)),
      ]),
    ],
  );
}

async function editBot({ devCtrl, botCtrl }: DevContext, color: Color) {
  const selected = botCtrl[color]?.uid;
  if (!selected) return;
  await new EditDialog(botCtrl, devCtrl.gameCtrl, color, () => devCtrl.redraw()).show();
  devCtrl.redraw();
}

function clockOptions(ctx: DevContext) {
  return h('span', [
    ...(['initial', 'increment'] as const).map(type => {
      const val = ctx.gameCtrl.setup[type] ?? (type === 'initial' ? Infinity : 0);
      return h('label', [
        type === 'initial' ? 'clock' : 'inc',
        h(
          `select.${type}`,
          {
            hook: onInsert(el =>
              el.addEventListener('change', () => {
                const newVal = Number((el as HTMLSelectElement).value);
                reset(ctx, { [type]: newVal });
              }),
            ),
          },
          [
            ...rangeTicks[type].map(([secs, label]) =>
              h('option', { attrs: { value: secs, selected: secs === val } }, label),
            ),
          ],
        ),
      ]);
    }),
  ]);
}

function reset({ gameCtrl }: DevContext, params: Partial<LocalSetup>): void {
  gameCtrl.reset(params);
  localStorage.setItem('local.dev.setup', JSON.stringify(gameCtrl.setup));
  document
    .querySelectorAll('div.rclock')
    .forEach(el => el.classList.toggle('none', (gameCtrl.setup.initial ?? Infinity) === Infinity));
  gameCtrl.redraw();
}

function dashboard(ctx: DevContext) {
  const { gameCtrl, devCtrl } = ctx;

  return h('div.dev-dashboard', [
    fen(ctx),
    clockOptions(ctx),
    h('span', [
      h('div', [
        h('label', { attrs: { title: 'instantly deduct bot move times. disable animations and sound' } }, [
          h('input', {
            attrs: { type: 'checkbox', checked: devCtrl.hurry },
            hook: bind('change', e => {
              devCtrl.hurry = (e.target as HTMLInputElement).checked;
              storedBooleanProp('local.dev.hurry', false)(devCtrl.hurry);
            }),
          }),
          'hurry',
        ]),
      ]),
      h('label', [
        'games',
        h('input.num-games', {
          attrs: { type: 'text', value: storedIntProp('local.dev.numGames', 1)() },
          hook: bind('input', e => {
            const el = e.target as HTMLInputElement;
            const val = Number(el.value);
            const valid = val >= 1 && val <= 1000 && !isNaN(val);
            el.classList.toggle('invalid', !valid);
            if (valid) localStorage.setItem('local.dev.numGames', `${val}`);
          }),
        }),
      ]),
    ]),
    h('span', [
      h(
        'button.button.button-metal',
        { hook: onInsert(el => el.addEventListener('click', () => roundRobin(ctx))) },
        'round robin',
      ),
      h('div.spacer'),
      h(`button.refresh.button.button-metal`, {
        hook: onInsert(el =>
          el.addEventListener('click', () => {
            gameCtrl.reset();
            gameCtrl.redraw();
          }),
        ),
      }),
      renderPlayPause(ctx),
    ]),
  ]);
}

function progress(ctx: DevContext) {
  const { devCtrl, botCtrl, gameCtrl } = ctx;
  return h('div.dev-progress', [
    h(
      'div.results',
      playersWithResults(devCtrl.log).map(p => {
        const bot = botCtrl.get(p)!;
        return h(
          'div',
          `${bot?.name ?? p} ${botCtrl.ratingText(p, gameCtrl.speed)} ${playerResults(devCtrl.log, p)}`,
        );
      }),
    ),
  ]);
}

function renderPlayPause({ devCtrl, botCtrl, gameCtrl }: DevContext): VNode {
  const disabled = gameCtrl.isUserTurn;
  const paused = gameCtrl.isStopped || gameCtrl.live.end;
  return h(
    `button.play-pause.button.button-metal${disabled ? '.play.disabled' : paused ? '.play' : '.pause'}`,
    {
      hook: onInsert(el =>
        el.addEventListener('click', () => {
          if (devCtrl.hasUser && gameCtrl.isStopped) gameCtrl.start();
          else if (!paused) gameCtrl.stop();
          else {
            if (devCtrl.gameInProgress) gameCtrl.start();
            else {
              const numGamesField = document.querySelector('.num-games') as HTMLInputElement;
              if (numGamesField.classList.contains('invalid')) {
                numGamesField.focus();
                return;
              }
              const numGames = Number(numGamesField.value);
              devCtrl.run({ type: 'matchup', players: [botCtrl.white!.uid, botCtrl.black!.uid] }, numGames);
            }
          }
          gameCtrl.redraw();
        }),
      ),
    },
  );
}

function fen(ctx: DevContext): VNode {
  const { devCtrl, gameCtrl } = ctx;
  return h('input.fen', {
    attrs: {
      type: 'text',
      value: gameCtrl.fen === co.fen.INITIAL_FEN ? '' : gameCtrl.fen,
      spellcheck: 'false',
      placeholder: co.fen.INITIAL_FEN,
    },
    hook: bind('input', e => {
      let fen = co.fen.INITIAL_FEN;
      const el = e.target as HTMLInputElement;
      if (!el.value || co.fen.parseFen(el.value).isOk) fen = el.value || co.fen.INITIAL_FEN;
      else {
        el.classList.add('invalid');
        return;
      }
      el.classList.remove('invalid');
      if (fen) reset(ctx, { fen });
    }),
    props: { value: devCtrl.startingFen },
  });
}

function roundRobin({ devCtrl, botCtrl, gameCtrl }: DevContext) {
  domDialog({
    class: 'round-robin-dialog',
    htmlText: `<h2>participants</h2>
    <ul>${[...botCtrl.sorted(), ...botCtrl.rateBots.filter(b => b.ratings[gameCtrl.speed]!.r % 100 === 0)]
      .map(p => {
        const checked = isNaN(parseInt(p.uid.slice(1)))
          ? storedBooleanProp(`local.dev.tournament-${p.uid.slice(1)}`, true)()
          : false;
        return `<li><input type="checkbox" id="${p.uid.slice(1)}" ${checked ? 'checked=""' : ''} value="${
          p.uid
        }">
        <label for='${p.uid.slice(1)}'>${p.name} ${botCtrl.ratingText(p.uid, gameCtrl.speed)}</label></li>`;
      })
      .join('')}</ul>
    <span>Repeat: <input type="number" maxLength="3" value="1"><button class="button" id="start-tournament">Start</button></span>`,
    actions: [
      {
        selector: '#start-tournament',
        listener: (_, dlg) => {
          const participants = Array.from(dlg.view.querySelectorAll('input:checked')).map(
            (el: HTMLInputElement) => el.value,
          );
          if (participants.length < 2) return;
          const iterationField = dlg.view.querySelector('input[type="number"]') as HTMLInputElement;
          const iterations = Number(iterationField.value);
          devCtrl.run(
            {
              type: 'roundRobin',
              players: participants,
            },
            isNaN(iterations) ? 1 : iterations,
          );
          dlg.close();
        },
      },
      {
        selector: 'input[type="checkbox"]',
        event: 'change',
        listener: e => {
          const el = e.target as HTMLInputElement;
          if (!isNaN(parseInt(el.value.slice(1)))) return;
          storedBooleanProp(`local.dev.tournament-${el.value.slice(1)}`, true)(el.checked);
        },
      },
    ],
    show: 'modal',
  });
}

let botSelector: HandOfCards | undefined;

function showBotSelector(ctx: DevContext, clickedEl: HTMLElement) {
  if (botSelector) return;
  const { botCtrl, gameCtrl } = ctx;
  const cardData = [...botCtrl.sorted(gameCtrl.speed).map(b => botCtrl.classifiedCard(b))]
    .filter(defined)
    .sort(botCtrl.classifiedSort);
  const main = document.querySelector('main') as HTMLElement;
  const drops: Drop[] = [];
  main.classList.add('with-cards');

  document.querySelectorAll<HTMLElement>('main .player')?.forEach(el => {
    const selected = uidToDomId(botCtrl[el.dataset.color as Color]?.uid);
    drops.push({ el: el as HTMLElement, selected });
  });
  botSelector = handOfCards({
    view: main,
    getDrops: () => drops,
    getCardData: () => cardData,
    select: (el, domId) => {
      const color = (el ?? clickedEl).dataset.color as Color;
      gameCtrl.stop();
      reset(ctx, { ...botCtrl.uids, [color]: domIdToUid(domId) });
    },
    onRemove: () => {
      main.classList.remove('with-cards');
      botSelector = undefined;
    },
    orientation: 'left',
    transient: true,
    autoResize: true,
  });
}
