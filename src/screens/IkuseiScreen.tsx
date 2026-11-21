import { useMemo, useState } from 'react';
import { PUGS, PUG_BY_ID, RARITY_INFO } from '../data/pugs';
import { MILESTONES, PROFILES, TREATS, stageOf, PUG_MAX_LV, LOVE_MAX } from '../data/growth';
import { PugArt, type PugMood } from '../components/PugFace';
import { Coins, PP, Hearts, PugLevel } from '../components/Status';
import { LevelUpModal, type LevelUpInfo } from '../components/LevelUpModal';
import { canPet, feedPug, petPug } from '../core/progress';
import { sfx } from '../services/sound';
import { newGrowth, type SaveData } from '../store/save';

export function IkuseiScreen({ save, initialId, onBack, onChange }: {
  save: SaveData;
  initialId?: string;
  onBack: () => void;
  onChange: (s: SaveData) => void;
}) {
  const [sel, setSel] = useState(initialId && save.pugs[initialId] ? initialId : save.favoritePug);
  const [moodIdx, setMoodIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [lu, setLu] = useState<LevelUpInfo | null>(null);
  const [bounce, setBounce] = useState(0);

  const p = PUG_BY_ID[sel];
  const g = save.growth[sel] ?? newGrowth();
  const stage = stageOf(g.lv);
  const isPartner = save.favoritePug === sel;
  const moods: PugMood[] = useMemo(() => {
    const m: PugMood[] = [p.mood ?? 'normal', 'happy', 'sleep'];
    if (g.lv >= 10) m.push('wink');
    if (g.lv >= 20) m.push('love');
    return [...new Set(m)];
  }, [p, g.lv]);
  const mood = moods[moodIdx % moods.length];
  const owned = useMemo(
    () => PUGS.filter((x) => save.pugs[x.id]).sort((a, b) => (save.growth[b.id]?.lv ?? 1) - (save.growth[a.id]?.lv ?? 1) || a.no - b.no),
    [save.pugs, save.growth],
  );
  const profile = PROFILES[sel];

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1600);
  };

  const pet = () => {
    const r = petPug(save, sel, new Date());
    if (!r.ok) { flash(r.reason); return; }
    sfx.bark();
    setBounce((b) => b + 1);
    setMoodIdx(moods.indexOf('happy'));
    onChange(r.save);
    flash(`なでなで… 親密度が上がった！`);
  };

  const feed = (treatId: string) => {
    const before = g.lv;
    const r = feedPug(save, sel, treatId);
    if (!r.ok) { flash(r.reason); sfx.tap(); return; }
    sfx.place();
    setBounce((b) => b + 1);
    onChange(r.save);
    const after = r.save.growth[sel].lv;
    if (after > before) setLu({ kind: 'pug', id: sel, from: before, to: after });
    else flash('もぐもぐ… おいしい！');
  };

  return (
    <div className="screen ikusei-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="もどる">‹</button>
        <div className="topbar-title">パグ育成</div>
        <span className="icon-spacer" />
      </header>

      <div className="wallet-row"><Coins n={save.wallet.coins} /><PP n={save.wallet.pp} /></div>

      <section className={`partner-card stage-${stage.id}`} style={{ ['--rc' as string]: RARITY_INFO[p.rarity].color }}>
        {isPartner && <span className="partner-tag">パートナー</span>}
        <button className="pc-art" key={bounce} onClick={() => { sfx.tap(); setMoodIdx((i) => i + 1); }} aria-label="表情をかえる">
          <PugArt coat={p.coat} hat={p.hat} acc={p.acc} mood={mood} framed />
        </button>
        <div className="pc-info">
          <div className="pc-name">{p.name}</div>
          <div className="pc-badges">
            <span className="rarity-badge" style={{ background: RARITY_INFO[p.rarity].color }}>{p.rarity}</span>
            <span className="stage-badge">{stage.name}</span>
            <span className="lv-badge">Lv.{g.lv}{g.lv >= PUG_MAX_LV ? ' MAX' : ''}</span>
          </div>
          <PugLevel g={g} />
          <div className="pc-love">親密度 <Hearts love={g.love} /> <small>{g.love}/{LOVE_MAX}</small></div>
          <p className="muted small">パグをタップすると表情がかわるよ（{moods.length}種）</p>
        </div>
      </section>

      <section className="care-row">
        <button className="care-btn pet" onClick={pet} disabled={!canPet(save, sel, new Date())}>
          <span>🤚</span>{canPet(save, sel, new Date()) ? 'なでる' : 'また明日'}
          <small>親密度 +5（1日1回）</small>
        </button>
        {TREATS.map((t) => (
          <button key={t.id} className="care-btn" onClick={() => feed(t.id)}>
            <span>{t.icon}</span>{t.name}
            <small>{t.coins ? `${t.coins}コイン` : `${t.pp}PP`}・EXP+{t.exp}</small>
          </button>
        ))}
      </section>

      {!isPartner && (
        <button className="btn primary wide" onClick={() => { sfx.bark(); onChange({ ...save, favoritePug: sel }); flash(`${p.name}がパートナーになった！`); }}>
          この子をパートナーにする
        </button>
      )}
      <p className="muted center">パートナーは対局のたびに経験値と親密度をもらえます。育ててもオセロの強さは変わりません。</p>

      <section className="profile-card">
        <h4>プロフィール</h4>
        {g.lv >= 5 && profile ? (
          <dl>
            <dt>好きなもの</dt><dd>{profile[0]}</dd>
            <dt>特技</dt><dd>{profile[1]}</dd>
            <dt>口ぐせ</dt><dd>「{profile[2]}」</dd>
          </dl>
        ) : <p className="muted">Lv.5 になると専用プロフィールが見られるよ</p>}
        <ul className="milestones">
          {MILESTONES.map((m) => (
            <li key={m.key} className={g.lv >= m.lv ? 'done' : ''}>
              <span>{g.lv >= m.lv ? '✔' : '🔒'}</span> Lv.{m.lv} {m.label}
            </li>
          ))}
        </ul>
      </section>

      <h4 className="section-title">なかまのパグ（{owned.length}）</h4>
      <section className="pug-pick">
        {owned.map((x) => {
          const xg = save.growth[x.id] ?? newGrowth();
          return (
            <button key={x.id} className={`pick ${x.id === sel ? 'on' : ''}`} onClick={() => { sfx.tap(); setSel(x.id); setMoodIdx(0); }}>
              {save.favoritePug === x.id && <span className="pick-star">★</span>}
              <span className="pick-art"><PugArt coat={x.coat} hat={x.hat} acc={x.acc} mood={x.mood} framed /></span>
              <span className="pick-lv">Lv.{xg.lv}</span>
            </button>
          );
        })}
      </section>

      {toast && <div className="toast home-toast" role="status">{toast}</div>}
      {lu && <LevelUpModal info={lu} onClose={() => setLu(null)} />}
    </div>
  );
}
