import { useState } from 'react';
import { resolveAsset } from '../../assets/resolve';
import { content, useGameStore } from '../../store/gameStore';

/** The owner's intro (D-071, D-076): five screens of Prabu's words, once per run, then the map. */
export function IntroScreen() {
  const act = useGameStore((s) => s.act);
  const [page, setPage] = useState(0);
  const { screens, image } = content.story.intro;
  const last = page === screens.length - 1;
  const done = () => act({ type: 'intro.done' });

  return (
    <main className="intro" style={{ backgroundImage: `url(${resolveAsset(image)})` }} data-testid="intro">
      <div className="intro-text" key={page}>
        {screens[page]!.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="intro-actions">
        <span className="muted tiny">{page + 1} / {screens.length}</span>
        <button onClick={done}>Skip</button>
        <button onClick={() => (last ? done() : setPage(page + 1))}>{last ? 'Begin' : 'Next'}</button>
      </div>
    </main>
  );
}
