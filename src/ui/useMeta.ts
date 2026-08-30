import { useStore } from 'zustand';
import { metaStore } from '../game/meta';
import type { Meta } from '../game/meta';

export function useMeta<T>(selector: (m: Meta) => T): T {
  return useStore(metaStore, selector);
}
