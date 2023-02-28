import { SvelteComponentTyped } from 'svelte';
import { ObsUtilsApi } from './utils/api';

export {};

/* eslint no-shadow: 0 */

declare global {
  namespace Game {
    interface ModuleData {
      api: ObsUtilsApi;
    }
  }

  namespace ClientSettings {
    interface Values {
      'obs-utils.minScale': number;
      'obs-utils.maxScale': number;
      'obs-utils.defaultOutOfCombat': string;
      'obs-utils.defaultInCombat': string;
      'obs-utils.popupCloseDelay': number;
      'obs-utils.obsRemote': OBSRemoteSettings;
    }
  }
  class Tagger {
    static toggleTags(token: any, arg1: string): void;
    static hasTags(currenToken: Token | undefined, arg1: string): boolean;
    static getByTag(arg0: string): Array<TokenDocument>;
  }
  interface TrackedTokenData {
    x: number | undefined;
    y: number | undefined;
    width: number | undefined;
    height: number | undefined;
  }
  interface DirectorButtonData {
    icon: string;
    tooltip: string;
    id: string;
  }
  interface DirectorData {
    ic: Array<DirectorButtonData>;
    ooc: Array<DirectorButtonData>;
    players: StoredDocument<User>[];
  }

  interface Combatant {
    tokenId: string;
  }
  class UiELementsData {
    sidebar: Sidebar | undefined;
  }
  interface TokenLayer {
    controlledObjects: Array<Token>;
  }
  interface TokenDocument {
    x: number;
    y: number;
    _id: string;
  }
  let socketlib: any;

  class DirectorApp extends SvelteComponentTyped {}
}
