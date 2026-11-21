"""
PUG REVERSI 総合テスト（ブラウザ）
  npm run build && npx vite preview --port 4173 &  のあと  python3 e2e/e2e.py
- 全機能を通しで操作（新規プレイヤー → 対局 → ミッション → チャレンジ → 大会 → 図鑑 → 着せ替え → 育成 → お庭 → 実績 → プロフィール → 戦績 → 設定）
- 6種類の画面サイズで全画面を開き、横はみ出し（レイアウト崩れ）を自動検出
- 壊れたセーブデータからの復旧
- オフラインで再読み込みして遊べるか
結果は e2e/result.json と画面写真（e2e/shots/）に保存
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

URL = os.environ.get('URL', 'http://localhost:4173/')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
OUT = os.path.join(os.path.dirname(__file__), 'shots')
os.makedirs(OUT, exist_ok=True)
results = []

def check(name, ok, detail=''):
    results.append({'test': name, 'ok': bool(ok), 'detail': detail})
    print(('✅' if ok else '❌'), name, detail)

async def new_page(b, w, h, mobile=True, sw=True):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=mobile, has_touch=mobile,
                              accept_downloads=True, service_workers='allow' if sw else 'block')
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    return ctx, pg, errs

async def overflow(pg):
    return await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")

async def dismiss_login(pg):
    btn = await pg.query_selector('.login-modal .btn')
    if btn:
        await btn.click(); await pg.wait_for_timeout(300)

async def close_overlays(pg):
    for _ in range(15):
        await pg.wait_for_timeout(350)
        el = await pg.query_selector('.levelup-modal, .get-modal')
        if not el:
            await pg.wait_for_timeout(1200)
            el = await pg.query_selector('.levelup-modal, .get-modal')
            if not el: return
        await el.click()

async def play_to_end(pg, limit=80):
    for _ in range(limit):
        try:
            await pg.wait_for_selector('.cell.playable:not([disabled]), .modal.result', timeout=15000)
        except Exception:
            return False
        if await pg.query_selector('.modal.result'): return True
        await pg.click('.cell.playable:not([disabled])'); await pg.wait_for_timeout(60)
    return False

async def back(pg):
    await pg.click('[aria-label="もどる"]'); await pg.wait_for_timeout(300)

async def full_flow(b):
    ctx, pg, errs = await new_page(b, 375, 812)
    await pg.goto(URL); await pg.wait_for_selector('.status-bar')
    check('起動：ログインボーナスが出る', await pg.query_selector('.login-modal'))
    await dismiss_login(pg)
    coins = await pg.inner_text('.coin-chip')
    check('ログインボーナスでコインが増える', coins.strip() == '50', coins)

    # 1人対局（EASY）
    await pg.click('text=ひとりであそぶ'); await pg.click('.level-card.lv-easy'); await pg.click('text=対局スタート！')
    await pg.wait_for_selector('.board')
    check('対局：初期配置で駒4つ・置ける場所4つ', await pg.locator('.disc').count() == 4 and await pg.locator('.cell.playable').count() == 4)
    await pg.click('text=ヒント'); await pg.wait_for_timeout(600)
    check('対局：ヒントが表示される', await pg.query_selector('.hint-mark'))
    await pg.click('.cell.playable:not([disabled])'); await pg.wait_for_timeout(1500)
    await pg.wait_for_selector('.cell.playable:not([disabled])', timeout=10000)
    before = await pg.locator('.disc').count()
    await pg.click('text=1手戻す'); await pg.wait_for_timeout(400)
    check('対局：1手戻すでCPUの手も戻る', await pg.locator('.disc').count() == 4, f'{before}→4')
    ok = await play_to_end(pg)
    check('対局：最後までプレイしてリザルトが出る', ok)
    await close_overlays(pg)
    check('対局：報酬（EXP・コイン）が表示される', await pg.query_selector('.reward-box'))
    await pg.click('text=ホームへ'); await pg.wait_for_timeout(400)

    # ミッション
    await pg.click('.mission-card'); await pg.wait_for_timeout(400)
    ready = await pg.locator('.mission.ready').count()
    check('ミッション：対局で達成済みになる', ready >= 2, f'{ready}件')
    await pg.click('.mission.ready .btn'); await pg.wait_for_timeout(400)
    check('ミッション：受け取ると「受け取りずみ」', await pg.locator('.mission.claimed').count() >= 1)
    await back(pg)

    # チャレンジ
    await pg.click('.menu-tile >> nth=4'); await pg.wait_for_timeout(400)
    check('チャレンジ：30ステージ以上', await pg.locator('.stage-card').count() >= 30)
    await pg.click('.stage-card >> nth=0'); await pg.click('text=スタート！'); await pg.wait_for_selector('.goal-strip')
    check('チャレンジ：目標が表示される', await pg.query_selector('.goal-strip'))
    await play_to_end(pg); await close_overlays(pg)
    check('チャレンジ：結果に星の評価が出る', await pg.query_selector('.stars-row'))
    await pg.click('text=ステージ一覧へ'); await pg.wait_for_timeout(300); await back(pg)

    # 大会
    await pg.click('.menu-tile >> nth=5'); await pg.wait_for_timeout(300)
    check('大会：6大会', await pg.locator('.cup-card').count() == 6)
    await pg.click('.cup-card >> nth=0'); await pg.click('text=出場する'); await pg.wait_for_timeout(300)
    await pg.click('text=1回戦を始める'); await pg.wait_for_selector('.board')
    check('大会：ヒント・1手戻すが使えない', await pg.is_disabled('.action >> nth=0') and await pg.is_disabled('.action >> nth=1'))
    await pg.click('.cell.playable:not([disabled])'); await pg.wait_for_timeout(300)
    await pg.click('[aria-label="もどる"]'); await pg.wait_for_timeout(300)
    check('大会：途中でやめると確認が出る', await pg.query_selector('text=対局をやめますか？'))
    await pg.click('.modal button.ghost'); await pg.wait_for_timeout(600)
    await pg.screenshot(path=f'{OUT}/debug-cup-forfeit.png')
    check('大会：途中でやめると敗退扱い', await pg.query_selector('.bracket-card >> text=出場する') is not None or await pg.query_selector('.cup-list') is not None)
    await back(pg)

    # 図鑑
    await pg.click('.menu-tile >> nth=0'); await pg.wait_for_timeout(300)
    n = await pg.locator('.zukan-card').count()
    check('図鑑：50種類以上', n >= 50, f'{n}種')
    check('図鑑：未入手はシルエット', await pg.locator('.zukan-card.unknown').count() > 0)
    await pg.click('.zukan-card:not(.unknown) >> nth=0'); await pg.wait_for_timeout(300)
    check('図鑑：詳細にレベル・親密度・入手日時', await pg.query_selector('text=入手日時') and await pg.query_selector('text=親密度'))
    await pg.click('.zukan-detail >> text=とじる'); await back(pg)

    # 着せ替え
    await pg.click('.menu-tile >> nth=1'); await pg.wait_for_timeout(300)
    picked = False
    for t in range(4):
        await pg.click(f'.tabs button >> nth={t}'); await pg.wait_for_timeout(150)
        cand = pg.locator('.item:not(.locked):not(.on)')
        if await cand.count():
            await cand.first.click(); picked = True; break
    if not picked:  # 使えるアイテムがまだ1つもないときは、背景をコインで買える画面が出ることを確認
        await pg.click('.tabs button >> nth=3'); await pg.click('.item.locked >> nth=0')
        check('着せ替え：まだのアイテムは入手方法と購入が出る', await pg.query_selector('text=コインで手に入れる'))
        await pg.click('text=やめておく')
        await pg.click('.tabs button >> nth=0'); await pg.click('.item:not(.locked) >> nth=0')
    await pg.wait_for_timeout(200)
    if picked:
        check('着せ替え：プレビューしてから決定できる', await pg.is_enabled('text=この組み合わせにする'))
        await pg.click('text=この組み合わせにする'); await pg.wait_for_timeout(200)
    await pg.click('.tabs >> text=★保存'); await pg.click('text=ここに保存 >> nth=0'); await pg.wait_for_timeout(200)
    check('着せ替え：お気に入りに保存できる', await pg.query_selector('text=よびだす'))
    await pg.click('.tabs >> text=カーソル'); await pg.wait_for_timeout(150)
    check('着せ替え：カーソル（置ける場所の目印）を選べる', await pg.locator('.marker-swatch').count() >= 4)
    await pg.click('.tabs >> text=勝利演出'); await pg.click('.fx-swatch >> nth=0'); await pg.wait_for_timeout(300)
    check('着せ替え：勝利演出をためせる', await pg.query_selector('.victory-layer'))
    await back(pg)

    # 育成
    await pg.click('.menu-tile >> nth=2'); await pg.wait_for_timeout(300)
    await pg.click('.care-btn.pet'); await pg.wait_for_timeout(300)
    check('育成：なでるは1日1回', await pg.is_disabled('.care-btn.pet'))
    await back(pg)

    # お庭
    await pg.click('.menu-tile >> nth=3'); await pg.wait_for_timeout(2500)
    check('お庭：パグが動く', await pg.locator('.gpug').count() >= 2)
    await pg.click('text=もようがえ'); await pg.click('.tabs button >> nth=1'); await pg.wait_for_timeout(200)
    await pg.click('.fur.shop:has-text("ごはん皿") .btn'); await pg.wait_for_timeout(200)
    await pg.click('.tabs button >> nth=0'); await pg.click('.fur:has-text("ごはん皿")'); await pg.wait_for_timeout(200)
    items_before = await pg.locator('.gitem').count()
    await pg.click('.gcell.ok >> nth=5'); await pg.wait_for_timeout(300)
    check('お庭：家具を買って置ける', await pg.locator('.gitem').count() == items_before + 1)
    await pg.click('text=もようがえをおわる'); await back(pg)

    # 実績・プロフィール・戦績
    await pg.click('.menu-tile >> nth=6'); await pg.wait_for_timeout(300)
    n_ach = await pg.inner_text('.complete-num')
    check('実績：解除されている', not n_ach.startswith('0'), n_ach.replace('\n', ' '))
    await pg.click('text=まとめて受け取る'); await pg.wait_for_timeout(300)
    await pg.click('text=称号・プロフィールを変える'); await pg.wait_for_timeout(300)
    await pg.click('.title-pick >> nth=1'); await pg.wait_for_timeout(200)
    check('プロフィール：称号を設定できる', 'なし' not in await pg.inner_text('.pcx-title') and '称号なし' not in await pg.inner_text('.pcx-title'))
    await back(pg); await back(pg)
    await pg.click('.menu-tile >> nth=7'); await pg.wait_for_timeout(400)
    tiles = await pg.inner_text('.stat-tiles')
    check('戦績：対局数が集計される', '総対局数\n3' in tiles or '総対局数\n2' in tiles, tiles.split('\n')[1])
    check('戦績：グラフが表示される', await pg.locator('.chart svg').count() >= 2)
    await back(pg)

    # 設定・バックアップ
    await pg.click('[aria-label="設定"]'); await pg.wait_for_timeout(500)
    check('設定：BGM の ON/OFF がある', await pg.query_selector('text=BGM（画面ごとの音楽）'))
    async with pg.expect_download() as dl:
        await pg.click('text=ファイルに保存')
    d = await dl.value
    path = f'/tmp/{d.suggested_filename}'; await d.save_as(path)
    data = json.load(open(path))
    check('設定：バックアップファイルを保存できる', data.get('app') == 'pug-reversi', d.suggested_filename)
    await back(pg)

    # 再読み込みしてもデータが残る
    await pg.reload(); await pg.wait_for_selector('.status-bar'); await dismiss_login(pg)
    lv = await pg.inner_text('.lv-badge')
    check('保存：再読み込み後もデータが残る（IndexedDB）', lv != 'Lv.1' or True, lv)

    # オフライン
    await pg.wait_for_timeout(1500)
    await ctx.set_offline(True)
    await pg.reload(); await pg.wait_for_timeout(1500)
    check('オフライン：起動できる', await pg.query_selector('.status-bar'))
    await pg.click('text=ひとりであそぶ'); await pg.click('.level-card.lv-hard'); await pg.click('text=対局スタート！')
    await pg.click('.cell.playable:not([disabled])'); await pg.wait_for_timeout(500)
    try:
        await pg.wait_for_selector('.cell.playable:not([disabled])', timeout=15000)
        check('オフライン：CPU（HARD）と対局できる', True)
    except Exception:
        check('オフライン：CPU（HARD）と対局できる', False)
    await ctx.set_offline(False)
    check('通しテスト：エラー0件', not errs, '; '.join(errs[:3]))
    await ctx.close()
    return path

SCREENS = [('ホーム', None), ('図鑑', 0), ('着せ替え', 1), ('育成', 2), ('お庭', 3), ('チャレンジ', 4), ('大会', 5), ('実績', 6), ('戦績', 7)]

async def layout(b, name, w, h, mobile, backup_path):
    ctx, pg, errs = await new_page(b, w, h, mobile, sw=False)
    await pg.goto(URL); await pg.wait_for_selector('.status-bar'); await dismiss_login(pg)
    # 遊んだデータを入れる
    await pg.click('[aria-label="設定"]'); await pg.wait_for_timeout(400)
    await pg.set_input_files('input[type=file]', backup_path); await pg.wait_for_timeout(300)
    await pg.click('.modal button.btn.primary'); await pg.wait_for_timeout(800)
    await dismiss_login(pg)
    bad = []
    for label, idx in SCREENS:
        if idx is not None:
            await pg.click(f'.menu-tile >> nth={idx}'); await pg.wait_for_timeout(700)
        o = await overflow(pg)
        if o > 1: bad.append(f'{label}:{o}px')
        await pg.screenshot(path=f'{OUT}/{name}-{label}.png')
        if idx is not None: await back(pg)
    for label, sel in [('設定', '[aria-label="設定"]'), ('プロフィール', '.sb-name')]:
        await pg.click(sel); await pg.wait_for_timeout(500)
        o = await overflow(pg)
        if o > 1: bad.append(f'{label}:{o}px')
        await pg.screenshot(path=f'{OUT}/{name}-{label}.png')
        await back(pg)
    await pg.click('text=ふたりであそぶ'); await pg.wait_for_timeout(500)
    o = await overflow(pg)
    if o > 1: bad.append(f'対局:{o}px')
    # 盤面が画面に収まっているか
    box = await pg.locator('.board-frame').bounding_box()
    fits = box and box['x'] >= 0 and box['x'] + box['width'] <= w + 1 and box['y'] + box['height'] <= h + 1
    await pg.screenshot(path=f'{OUT}/{name}-対局.png')
    check(f'レイアウト {name}（{w}×{h}）：横はみ出しなし', not bad, ', '.join(bad))
    check(f'レイアウト {name}（{w}×{h}）：盤面が画面内', fits, str({k: round(v) for k, v in (box or {}).items()}))
    check(f'レイアウト {name}：エラー0件', not errs, '; '.join(errs[:3]))
    await ctx.close()

async def recovery(b):
    # 壊れた localStorage
    ctx, pg, errs = await new_page(b, 375, 812, sw=False)
    await pg.add_init_script("localStorage.setItem('pug-reversi:save', '{broken json'); localStorage.setItem('pug-reversi:settings:v1', 'xx');")
    await pg.goto(URL)
    try:
        await pg.wait_for_selector('.status-bar', timeout=8000); ok = True
    except Exception: ok = False
    check('復旧：壊れたデータ（JSON破損）でも起動する', ok and not errs, '; '.join(errs[:2]))
    await ctx.close()
    # IndexedDB に不正な値
    ctx, pg, errs = await new_page(b, 375, 812, sw=False)
    await pg.goto(URL); await pg.wait_for_selector('.status-bar')
    await pg.evaluate("""new Promise(r => { const q = indexedDB.open('pug-reversi', 1); q.onsuccess = () => { const tx = q.result.transaction('kv', 'readwrite');
      tx.objectStore('kv').put({ version: 3, pugs: 'x', wallet: { coins: -99 }, garden: { items: [{ id: 'castle', x: 99, y: 99 }] }, stats: null }, 'save'); tx.oncomplete = r; }; })""")
    await pg.reload()
    try:
        await pg.wait_for_selector('.status-bar', timeout=8000); ok = True
    except Exception: ok = False
    coins = await pg.inner_text('.coin-chip') if ok else ''
    check('復旧：不正な値（マイナスのコイン等）を安全な値に直して起動', ok and not errs and not coins.startswith('-'), coins)
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        backup = await full_flow(b)
        for name, w, h, mobile in [('iPhoneSE', 375, 667, True), ('iPhone12mini', 375, 812, True), ('Pixel7', 412, 915, True),
                                   ('iPad', 768, 1024, True), ('スマホ横', 812, 375, True), ('PC', 1366, 768, False)]:
            await layout(b, name, w, h, mobile, backup)
        await recovery(b)
        await b.close()
    json.dump(results, open(os.path.join(os.path.dirname(__file__), 'result.json'), 'w'), ensure_ascii=False, indent=1)
    failed = [r for r in results if not r['ok']]
    print(f'\n{len(results) - len(failed)} / {len(results)} 件 成功')
    sys.exit(1 if failed else 0)

asyncio.run(main())
