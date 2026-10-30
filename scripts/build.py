"""ERP 일일판매실적조회 엑셀(input/*.xlsx) → 애터미 / B2B 대시보드 페이지 생성.

규칙
- 파일마다 '합계'·'TOTAL' 행은 빼고, 남은 행 합계가 TOTAL 행과 같은지 확인한다.
- 같은 날짜가 여러 파일에 있으면 나중에 올린 파일(git 커밋 시각, 없으면 수정 시각)이 이긴다.
  → 나중 파일의 날짜 구간(최소~최대 일자)에 있던 이전 행은 모두 지우고 새 행으로 바꾼다.
- 대표거래처 '개인소매' 제외.
- 애터미 = 대표거래처 '애터미', '애터미_수출'. 나머지(애터미아자 포함)는 B2B.
- 매출 = 원화판매금액(부가세 제외).
"""
import glob, json, math, os, re, subprocess, sys
from datetime import datetime, timezone, timedelta
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDE_CUST = {'개인소매', '맥널티 인터내셔널', '카페쇼'}
# 같은 거래처로 묶기 (대표거래처 이름 변경 등)
CUST_ALIAS = {'에스케이하이닉스': 'SK하이닉스(행복나래)', '행복나래': 'SK하이닉스(행복나래)'}
# 유형세부 묶기
TYPE_ALIAS = {'군복지단': '공공기관', '교정기관': '공공기관'}
ATOMY_CUST = {'애터미', '애터미_수출'}
# 현 재직 담당자. 여기 없는 이름은 화면에서 '퇴사자'(실적)·'미배정'(현재 담당 거래처)으로 묶인다.
STAFF = ['박성철', '문건수', '김준호', '윤남녕', '강승원']
KST = timezone(timedelta(hours=9))


def file_time(path):
    try:
        out = subprocess.run(['git', 'log', '-1', '--format=%ct', '--', os.path.relpath(path, ROOT)],
                             cwd=ROOT, capture_output=True, text=True).stdout.strip()
        if out:
            return int(out)
    except Exception:
        pass
    return int(os.path.getmtime(path))


def read_file(path):
    raw = pd.read_excel(path, header=None, dtype=str)
    # 머리글 행 찾기 ('수출구분'이 있는 행)
    hdr = next((i for i in range(min(10, len(raw))) if '수출구분' in raw.iloc[i].astype(str).str.replace(' ', '').tolist()), None)
    if hdr is None:  # 판매실적 파일이 아님 (예: 수익성분석 파일) → 건너뜀
        print(f'  {os.path.basename(path)}: 판매실적 형식이 아니라 건너뜀')
        return None
    d = pd.read_excel(path, header=hdr, dtype={'품번': str, '실적구분번호': str})
    d.columns = [str(c).replace(' ', '') for c in d.columns]
    tot = d[d['수출구분'] == 'TOTAL']
    r = d[~d['수출구분'].isin(['TOTAL', '합계'])].copy()
    r = r[r['실적구분일자'].notna()]
    for c in ['수량', '원화판매금액', '원화부가세액']:
        r[c] = pd.to_numeric(r[c], errors='coerce').fillna(0)
    r['date'] = pd.to_datetime(r['실적구분일자']).dt.strftime('%Y-%m-%d')
    s = r['원화판매금액'].sum()
    if len(tot):
        t = float(pd.to_numeric(tot['원화판매금액']).iloc[0])
        flag = 'OK' if abs(t - s) < 1 else f'!! 불일치 (TOTAL {t:,.0f})'
    else:
        flag = 'TOTAL 행 없음'
    print(f'  {os.path.basename(path)}: {len(r)}행, {r["date"].min()}~{r["date"].max()}, 합계 {s:,.0f} {flag}')
    return r


def load_all():
    files = sorted(glob.glob(os.path.join(ROOT, 'input', '*.xlsx')), key=lambda p: (file_time(p), p))
    print('입력 파일 (오래된 순):')
    merged = None
    for p in files:
        if os.path.basename(p).startswith('~$'):
            continue
        r = read_file(p)
        if r is None or not len(r):
            continue
        lo, hi = r['date'].min(), r['date'].max()
        if merged is None:
            merged = r
        else:
            drop = (merged['date'] >= lo) & (merged['date'] <= hi)
            if drop.any():
                print(f'    → {lo}~{hi} 기존 {drop.sum()}행을 이 파일로 교체')
            merged = pd.concat([merged[~drop], r], ignore_index=True)
    return merged


def market_of(name):
    name = str(name).replace('\xa0', ' ')
    if '택배' in name:
        return '기타'
    m = re.search(r'\(([^()]*)\)\s*$', str(name))
    if not m or 'PB' in m.group(1):
        return '국내'
    mk = m.group(1).strip()
    mk = re.sub(r'용$', '', mk).strip()
    return {'싱가폴': '싱가포르'}.get(mk, mk)


def line_of(name):
    s = re.sub(r'^\(애터미 PB\)\s*', '', str(name).replace('\xa0', ' '))
    s = re.sub(r'\s*\([^()]*\)\s*$', '', s)
    return s.strip()


def s_(x):
    return '' if x is None or (isinstance(x, float) and math.isnan(x)) else str(x)


def pack(r, atomy):
    r = r.copy()
    r['유형세부'] = r['유형세부'].fillna('미분류')
    r['담당자'] = r['담당자'].fillna('미지정')
    r['거래처'] = r['거래처'].fillna(r['대표거래처'])
    r = r.sort_values(['date', '실적구분번호']).reset_index(drop=True)

    def idx(col):
        vals = sorted(r[col].astype(str).unique())
        m = {v: i for i, v in enumerate(vals)}
        return vals, r[col].astype(str).map(m)

    dates, di = idx('date'); types, ti = idx('유형세부'); custs, ci = idx('대표거래처'); subs, si = idx('거래처')
    reps, ri = idx('담당자'); exps, ei = idx('수출구분'); docs, oi = idx('실적구분번호')
    r['ik'] = r['품번'].astype(str)
    last = r.sort_values('date').groupby('ik').last()
    items = last.index.tolist(); imap = {v: i for i, v in enumerate(items)}
    item_rows = []
    for k in items:
        x = last.loc[k]
        row = [k, s_(x['품명']), s_(x['규격']), s_(x['단위']), s_(x['품목중분류']) or '기타', s_(x['품목소분류']) or '기타', s_(x['품목자산분류'])]
        if atomy:
            row += [market_of(x['품명']), line_of(x['품명'])]
        item_rows.append(row)
    # 현재 담당 = 가장 최근 거래의 담당자
    pos = r[r['원화판매금액'] != 0]
    cur_rep = pos.sort_values('date').groupby('대표거래처')['담당자'].last()
    main_type = r.groupby('대표거래처')['유형세부'].agg(lambda x: x.value_counts().index[0])
    rows = []
    q = r['수량'].round(2).tolist(); a = r['원화판매금액'].round().astype('int64').tolist()
    for k, (d_, t_, c_, s2, i_, p_, e_, o_) in enumerate(zip(di, ti, ci, si, r['ik'].map(imap), ri, ei, oi)):
        rows.append([int(d_), int(t_), int(c_), int(s2), int(i_), int(p_), int(e_), int(o_), q[k], a[k]])
    return dict(dates=dates, types=types, custs=custs,
                custRep=[reps.index(cur_rep.get(c, r[r['대표거래처'] == c]['담당자'].iloc[-1])) for c in custs],
                custType=[types.index(main_type[c]) for c in custs],
                subs=subs, reps=reps, exps=exps, docs=docs, items=item_rows, rows=rows), r['원화판매금액'].sum(), r['수량'].sum()


def gate_js():
    return open(os.path.join(ROOT, 'templates', 'gate.js'), encoding='utf-8').read()


def profit_enc():
    """data/profit.enc*.json 중 가장 나중에 올린 파일 (암호화된 손익 + 비밀번호 확인용 chk)."""
    pfs = glob.glob(os.path.join(ROOT, 'data', 'profit.enc*.json'))
    return json.load(open(max(pfs, key=file_time), encoding='utf-8')) if pfs else {}


def render(page, data, out_path, artifact=False):
    t = open(os.path.join(ROOT, 'templates', 'shell.html'), encoding='utf-8').read()
    css = open(os.path.join(ROOT, 'templates', 'core.css'), encoding='utf-8').read()
    core = gate_js() + open(os.path.join(ROOT, 'templates', 'core.js'), encoding='utf-8').read()
    pj = open(os.path.join(ROOT, 'templates', f'{page}.js'), encoding='utf-8').read()
    title = {'atomy': '애터미 매출 대시보드', 'b2b': 'B2B 채널 매출 대시보드'}[page]
    js = json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False).replace('</', '<\\/')
    html = (t.replace('__TITLE__', title).replace('__CSS__', css).replace('__DATA__', js)
             .replace('__CORE__', core).replace('__PAGE__', pj))
    if artifact:  # claude.ai 미리보기용: 문서 뼈대 제거
        html = re.sub(r'(?s)^.*?<!--BODY-->', '', html).replace('<!--/BODY--></body></html>', '')
        html = f'<title>{title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + html
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    open(out_path, 'w', encoding='utf-8').write(html)
    print(f'  → {os.path.relpath(out_path, ROOT)} ({len(html)/1024:,.0f} KB)')


def main():
    artifact_dir = sys.argv[1] if len(sys.argv) > 1 else None
    r = load_all()
    n0 = len(r)
    r = r[~r['대표거래처'].isin(EXCLUDE_CUST)].copy()
    print(f'제외 거래처 {sorted(EXCLUDE_CUST)}: {n0 - len(r)}행')
    r['대표거래처'] = r['대표거래처'].replace(CUST_ALIAS)
    r['유형세부'] = r['유형세부'].replace(TYPE_ALIAS)
    # ERP 대표거래처가 '애터미(대표)' 등으로 바뀌어도 거래처(애터미/애터미_수출) 기준으로 맞춤
    sub_at = r['거래처'].isin(ATOMY_CUST)
    r.loc[sub_at, '대표거래처'] = r.loc[sub_at, '거래처']
    is_at = r['대표거래처'].isin(ATOMY_CUST) | (r['유형세부'] == 'Atomy')
    built = datetime.now(KST).strftime('%Y-%m-%d %H:%M')
    base = r['date'].max()
    dmin = r['date'].min()
    total = r['원화판매금액'].sum()
    sums = 0
    for page, part in [('atomy', r[is_at]), ('b2b', r[~is_at])]:
        data, s, q = pack(part, page == 'atomy')
        sums += s
        data['meta'] = dict(page=page, base=base, built=built, min=dmin, staff=STAFF)
        pe = profit_enc()
        data['penc'] = pe.get(page)
        data['chk'] = pe.get('chk')
        print(f'{page}: {len(data["rows"])}행, 매출 {s:,.0f}, 수량 {q:,.2f}')
        render(page, data, os.path.join(ROOT, page, 'index.html'))
        if artifact_dir:
            render(page, data, os.path.join(artifact_dir, f'{page}-dashboard.html'), artifact=True)
    print(f'검증: 애터미+B2B {sums:,.0f} = 전체 {total:,.0f} → {"OK" if abs(sums-total) < 1 else "불일치!"}')
    chk = json.dumps(profit_enc().get('chk'))
    home = open(os.path.join(ROOT, 'templates', 'home.html'), encoding='utf-8').read()
    home = home.replace('__BASE__', base).replace('__BUILT__', built).replace('__GATE__', gate_js()).replace('__CHK__', chk)
    open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(home)


if __name__ == '__main__':
    main()
