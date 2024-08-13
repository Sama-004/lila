import { domDialog, alert, type Dialog } from 'common/dialog';
import { frag } from 'common';
import type { EditDialog } from './editDialog';
import { ShareCtrl } from './shareCtrl';

export function shareDialog(host: EditDialog, uid?: string): Promise<ShareDialog> {
  return new ShareDialog(host, uid).show();
}

class ShareDialog {
  private dlg: Dialog;
  private view: HTMLElement;

  constructor(
    readonly host: EditDialog,
    readonly uid?: string,
  ) {}

  private get botCtrl() {
    return this.host.botCtrl;
  }

  private get assets() {
    return this.host.assets;
  }

  async show(): Promise<this> {
    this.view = frag<HTMLElement>(`<div class="dev-view share-dialog">
        <div class="share-grid">${this.shareGridItemHtml()}</div>
      </div>`);
    this.dlg = await domDialog({
      append: [{ node: this.view }],
      onClose: () => {},
      actions: [{ selector: '.share', listener: this.share }],
    });
    this.refresh();
    this.dlg.show();
    return this;
  }

  private shareGridItemHtml() {
    const serverBots = this.botCtrl.serverBots;
    const localBots = this.botCtrl.localBots;
    const scratchBots = this.host.scratch;
    const uidSet = new Set<string>();
    Object.keys({ ...serverBots, ...localBots, ...scratchBots }).forEach(uid => uidSet.add(uid));
    return [...uidSet]
      .map(uid => {
        const scratch = scratchBots[uid];
        const local = localBots[uid];
        const server = serverBots[uid];
        return `<div class="scratch">${scratch?.name ?? ''} ${scratch?.version ?? ''}</div>
        <div class="local">${local?.name ?? ''} ${local?.version ?? ''}</div>
        <div class="server">${server?.name ?? ''} ${server?.version ?? ''}</div>`;
      })
      .join('');
  }

  private share = (_: Event): void => {
    console.log('we jammin');
    if (!this.uid) return;
    const bot = this.botCtrl.get(this.uid);
    if (!bot) return;
    this.assets.shareCtrl.postBot(bot).then(success =>
      alert(success ? 'shared!' : 'failed').then(() => {
        if (success) this.dlg.close();
      }),
    );
  };
  refresh(): void {}
}
