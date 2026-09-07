import { Component, type ReactNode } from 'react';
import { STRINGS } from './strings';
import { getLocale } from '../game/i18n';

interface Props { children: ReactNode }
interface State { failed: boolean }

// A lazy scene chunk can fail to load — a deploy moved the hashed file names
// while the tab was open, or the link dropped mid-transfer. Without a boundary
// React unmounts the whole app to a blank page; with one, the compartment
// reports the fault and offers to reconnect. Progress is in the save already.
export class SceneBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('scene failed to load', error);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    const t = STRINGS[getLocale()];
    return (
      <div className="scene">
        <div className="panel" role="alert">
          <h2>{t.app.sceneLostTitle}</h2>
          <p className="status-dim">{t.app.sceneLostBody}</p>
          <button onClick={() => window.location.reload()}>{t.app.sceneReload}</button>
        </div>
      </div>
    );
  }
}
