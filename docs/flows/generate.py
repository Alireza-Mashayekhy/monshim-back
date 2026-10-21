# -*- coding: utf-8 -*-
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from flows_data import FLOWS, CHANGES, ROLES

STATE_RULES = [
    ("رزرو", [
        ("pending", "پرداخت‌شده و منتظر تأیید آرایشگر؛ ساعت را نگه می‌دارد. اگر تا شروع نوبت پاسخی نیاید، لغو و بازپرداخت می‌شود."),
        ("confirmed", "قطعی؛ ساعت را اشغال می‌کند. نوبت دستی یا نوبت آنلاینِ تأییدشده."),
        ("completed", "انجام‌شده؛ ساعت همچنان اشغال است و فقط بعد از شروع نوبت ممکن است."),
        ("canceled", "لغو‌شده توسط مشتری/آرایشگر/ادمین/سیستم؛ ساعت آزاد می‌شود."),
        ("rejected", "رد‌شده (فقط از pending)؛ ساعت آزاد می‌شود."),
    ]),
    ("پرداخت", [
        ("PENDING", "در انتظار نتیجهٔ درگاه؛ کرون تطبیق آن را بررسی می‌کند."),
        ("PAID", "تأیید‌شده نزد زیبال؛ فقط یک بار عملیات وابسته اجرا می‌شود."),
        ("FAILED", "ناموفقِ قطعی (نه خطای موقت شبکه)."),
        ("CANCELED", "انصراف کاربر؛ ساعت نگه‌داشته‌شده فوراً آزاد می‌شود."),
    ]),
    ("تیکت / نظر / اشتراک", [
        ("ticket", "OPEN → ANSWERED → CLOSED؛ تیکت بسته پیام جدید نمی‌پذیرد."),
        ("review", "pending → approved / rejected؛ فقط برای نوبت completed."),
        ("subscription", "active → expired / canceled؛ انقضا با کرون ساعتی انجام می‌شود."),
    ]),
]

stats = {
    "flows": len(FLOWS),
    "steps": sum(len(f["steps"]) for f in FLOWS),
    "changes": len(CHANGES),
}

DATA = {
    "meta": {
        "title": "منشیم — فلوهای محصول",
        "subtitle": "نسخهٔ چهارم؛ وضعیت پس از بازبینی چهارم",
        "date": "۲۰۲۶-۱۰-۲۱",
    },
    "stats": stats,
    "roles": ROLES,
    "flows": FLOWS,
    "changes": CHANGES,
    "stateRules": STATE_RULES,
    "verification": [
        ("build بک‌اند (nest build)", "موفق"),
        ("تست‌های بک‌اند", "۶۲ تست / ۹ سوئیت"),
        ("build فرانت (next build)", "موفق"),
        ("تایپ‌چک فرانت", "بدون خطا"),
        ("ESLint فایل‌های تغییریافته", "بدون خطا"),
    ],
}

HTML = r"""<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
:root{
  --ink:#0f172a; --muted:#64748b; --line:#e5e9f0; --bg:#f4f7fb; --card:#fff;
  --brand:#0f766e; --brand-2:#ccfbf1; --warn:#b45309; --warn-2:#fef3c7;
  --danger:#b91c1c; --ok:#047857;
}
*{box-sizing:border-box}
body{
  margin:0;background:var(--bg);color:var(--ink);
  font-family:"Vazirmatn","IRANSans","Segoe UI",Tahoma,sans-serif;
  font-size:14px;line-height:1.8;
}
a{color:inherit}
.wrap{display:grid;grid-template-columns:300px 1fr;min-height:100vh}
aside{
  position:sticky;top:0;height:100vh;overflow:auto;background:#0b1220;color:#cbd5e1;
  padding:22px 16px;border-left:1px solid #1e293b;
}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.logo{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#14b8a6,#0ea5e9);
  display:grid;place-items:center;font-weight:900;color:#062a2a;font-size:16px}
.brand h1{font-size:15px;margin:0;color:#f8fafc}
.brand p{margin:0;font-size:11px;color:#94a3b8}
.search{width:100%;border:1px solid #1e293b;background:#111c2f;color:#e2e8f0;border-radius:10px;
  padding:9px 11px;font-family:inherit;font-size:12px;outline:none}
.search:focus{border-color:#14b8a6}
.navtitle{color:#64748b;font-size:10.5px;font-weight:800;letter-spacing:.4px;margin:18px 4px 8px}
.nav-item{
  display:flex;align-items:center;gap:8px;width:100%;text-align:right;border:0;background:transparent;
  color:#cbd5e1;padding:9px 10px;border-radius:10px;font-family:inherit;font-size:12.5px;cursor:pointer;
}
.nav-item:hover{background:#16233a;color:#fff}
.nav-item.active{background:#0f766e;color:#fff;font-weight:800}
.dot{width:6px;height:6px;border-radius:50%;background:#334155;flex:none}
.nav-item.active .dot{background:#5eead4}
.main{padding:26px 30px 60px;max-width:1180px}
.hero{background:linear-gradient(120deg,#0f766e,#0e7490);color:#fff;border-radius:20px;padding:22px 24px;
  box-shadow:0 18px 40px -24px rgba(15,118,110,.8)}
.hero h2{margin:0 0 6px;font-size:21px}
.hero p{margin:0;color:#d7fffb;font-size:12.5px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0 20px}
.stat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.stat b{display:block;font-size:22px;line-height:1.2}
.stat span{font-size:11px;color:var(--muted)}
.panel{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px 20px;margin-bottom:16px}
.panel h3{margin:0 0 4px;font-size:15px}
.hint{color:var(--muted);font-size:11.5px;margin:0 0 12px}
.chain{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11.5px;color:#334155;
  background:#f8fafc;border:1px dashed #dbe3ec;border-radius:12px;padding:10px 12px}
.chain b{background:#fff;border:1px solid var(--line);border-radius:8px;padding:2px 7px;font-weight:700}
.step{display:grid;grid-template-columns:34px 1fr 130px;gap:10px;padding:11px 0;border-top:1px solid #f1f5f9}
.step:first-child{border-top:0}
.n{width:26px;height:26px;border-radius:9px;background:#eef6f5;color:#0f766e;display:grid;
  place-items:center;font-weight:900;font-size:11.5px}
.step h4{margin:0;font-size:12.8px}
.step p{margin:2px 0 0;font-size:11.5px;color:#475569}
.meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:5px}
.tag{font-size:10px;border-radius:7px;padding:2px 7px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
.tag.api{background:#eff6ff;color:#1d4ed8;border-color:#dbeafe;direction:ltr;unicode-bidi:embed}
.tag.ok{background:#ecfdf5;color:#047857;border-color:#d1fae5}
.tag.wait{background:#fff7ed;color:#b45309;border-color:#ffedd5}
.tag.dead{background:#fef2f2;color:#b91c1c;border-color:#fee2e2}
.status{font-size:10.5px;font-weight:800;align-self:start;justify-self:end;border-radius:8px;padding:3px 8px;
  background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;white-space:nowrap}
.change{border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px;background:#fff}
.change h4{margin:0 0 8px;font-size:14px}
.ba{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.box{border-radius:12px;padding:10px 12px;font-size:11.5px;line-height:1.9}
.box .lbl{display:inline-block;font-size:10px;font-weight:900;border-radius:6px;padding:1px 6px;margin-bottom:4px}
.before{background:#fff7ed;border:1px solid #ffedd5;color:#7c2d12}
.before .lbl{background:#fed7aa;color:#7c2d12}
.after{background:#ecfdf5;border:1px solid #d1fae5;color:#065f46}
.after .lbl{background:#a7f3d0;color:#065f46}
.flowlinks{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.flowlink{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:3px 9px;font-size:10.5px;
  font-family:inherit;cursor:pointer;color:#0f172a}
.flowlink:hover{border-color:#0f766e;color:#0f766e}
.verifygrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}
.verify{display:flex;justify-content:space-between;gap:8px;background:#f8fafc;border:1px solid var(--line);
  border-radius:12px;padding:9px 12px;font-size:11.5px}
.verify b{color:#047857;font-size:11px;white-space:nowrap}
.rule{display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-top:1px solid #f1f5f9;font-size:11.5px}
.rule:first-of-type{border-top:0}
.rule code{background:#0f172a;color:#e2e8f0;border-radius:6px;padding:1px 7px;font-size:10.5px;direction:ltr}
.note{background:#fffbeb;border:1px solid #fde68a;color:#78350f;border-radius:12px;padding:10px 12px;font-size:11.5px;margin-top:10px}
ul.notes{margin:8px 0 0;padding-inline-start:18px;font-size:11.5px;color:#475569}
ul.notes li{margin:3px 0}
.badge{display:inline-block;font-size:10px;border-radius:999px;padding:2px 8px;font-weight:800}
.badge.warn{background:var(--warn-2);color:var(--warn)}
.badge.ok{background:#d1fae5;color:var(--ok)}
.badge.danger{background:#fee2e2;color:var(--danger)}
.empty{color:var(--muted);font-size:12px;padding:18px;text-align:center}
@media(max-width:900px){
  .wrap{grid-template-columns:1fr}
  aside{position:relative;height:auto}
  .stats{grid-template-columns:1fr 1fr}
  .ba{grid-template-columns:1fr}
  .step{grid-template-columns:30px 1fr}
  .status{grid-column:2;justify-self:start}
}
</style>
</head>
<body>
<div class="wrap">
  <aside>
    <div class="brand">
      <div class="logo">م</div>
      <div>
        <h1>فلوهای منشیم</h1>
        <p>نسخهٔ ۴ · __DATE__</p>
      </div>
    </div>
    <input id="search" class="search" placeholder="جست‌وجوی فلو یا مرحله…">
    <div class="navtitle">فلوها</div>
    <div id="navflows"></div>
    <div class="navtitle">اسناد</div>
    <button class="nav-item" id="nav-changes"><span class="dot"></span> تغییرات این دور</button>
    <button class="nav-item" id="nav-rules"><span class="dot"></span> قواعد وضعیت</button>
  </aside>

  <main class="main">
    <div class="hero">
      <h2 id="hero-title"></h2>
      <p id="hero-sub"></p>
    </div>

    <div class="stats" id="stats"></div>

    <div id="view"></div>
  </main>
</div>

<script>
const DATA = __DATA__;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

const state = { view: 'flow', flowId: DATA.flows[0].id, q: '' };

const badgeClass = value => {
  const v = String(value || '').toLowerCase();
  if (!v || v === '—') return '';
  if (v.includes('cancel')) return 'dead';
  if (v.includes('pending') || v.includes('await')) return 'wait';
  if (v.includes('confirm') || v.includes('complet') || v.includes('paid') || v.includes('active') || v.includes('approv')) return 'ok';
  return '';
};

function renderNav(){
  const q = state.q.trim();
  const items = DATA.flows.filter(f =>
    !q || f.title.includes(q) || f.chain.includes(q) ||
    f.steps.some(s => (s[0]+s[2]+s[3]).includes(q))
  );

  $('navflows').innerHTML = items.map(f => `
    <button class="nav-item ${state.view==='flow' && state.flowId===f.id ? 'active':''}" data-flow="${f.id}">
      <span class="dot"></span>${esc(f.title)}
    </button>`).join('') || `<div class="empty">چیزی پیدا نشد</div>`;

  $('navflows').querySelectorAll('[data-flow]').forEach(btn => {
    btn.onclick = () => { state.view='flow'; state.flowId = btn.dataset.flow; render(); window.scrollTo({top:0,behavior:'smooth'}); };
  });

  $('nav-changes').classList.toggle('active', state.view==='changes');
  $('nav-rules').classList.toggle('active', state.view==='rules');
}

function renderStats(){
  $('stats').innerHTML = `
    <div class="stat"><b>${fa(DATA.stats.flows)}</b><span>فلو</span></div>
    <div class="stat"><b>${fa(DATA.stats.steps)}</b><span>مرحلهٔ ثبت‌شده</span></div>
    <div class="stat"><b>${fa(DATA.stats.changes)}</b><span>اصلاح این دور</span></div>
    <div class="stat"><b>${fa(DATA.verification.length)}</b><span>بررسی موفق</span></div>`;
}

function renderFlow(){
  const f = DATA.flows.find(x => x.id === state.flowId) || DATA.flows[0];
  const roleNames = f.actors.map(a => DATA.roles[a]?.[0] ?? a).join(' · ');
  const chain = f.chain.split('→').map((p,i,arr) =>
    `<b>${esc(p.trim())}</b>${i<arr.length-1 ? '<span>←</span>' : ''}`).join(' ');

  const steps = f.steps.map((s,i) => {
    const [stage, actor, action, api, status, note] = s;
    const cls = badgeClass(status) || (status && status!=='—' ? 'wait' : '');
    return `<div class="step">
      <div class="n">${fa(i+1)}</div>
      <div>
        <h4>${esc(stage)} <span class="tag">${esc(DATA.roles[actor]?.[0] ?? actor)}</span></h4>
        <p>${esc(action)}</p>
        <div class="meta">
          ${api && api!=='—' ? `<span class="tag api">${esc(api)}</span>` : ''}
          ${note ? `<span class="tag">${esc(note)}</span>` : ''}
        </div>
      </div>
      ${status && status!=='—' ? `<span class="status ${cls}">${esc(status)}</span>` : '<span></span>'}
    </div>`;
  }).join('');

  const notes = (f.notes||[]).map(n => `<li>${esc(n)}</li>`).join('');
  const related = DATA.changes.filter(c => c[4].includes(f.id));

  $('view').innerHTML = `
    <section class="panel">
      <h3>${esc(f.title)}</h3>
      <p class="hint">بازیگران: ${esc(roleNames)}</p>
      <div class="chain">${chain}</div>
      ${notes ? `<ul class="notes">${notes}</ul>` : ''}
      ${f.gap ? `<div class="note">این مسیر هنوز به رابط کاربری وصل نیست و به‌عنوان تصمیم محصولی باز مانده است.</div>` : ''}
    </section>

    <section class="panel">
      <h3>مرحله‌ها</h3>
      <p class="hint">وضعیت رزرو در هر مرحله کنار همان مرحله آمده است.</p>
      ${steps}
    </section>

    ${related.length ? `<section class="panel">
      <h3>اصلاح‌های مرتبط با این فلو</h3>
      ${related.map(c => `<div class="change">
        <h4>${esc(c[1])}</h4>
        <div class="ba">
          <div class="box before"><span class="lbl">قبل</span><br>${esc(c[2])}</div>
          <div class="box after"><span class="lbl">بعد</span><br>${esc(c[3])}</div>
        </div>
      </div>`).join('')}
    </section>` : ''}`;

  $('hero-title').textContent = f.title;
  $('hero-sub').textContent = 'زنجیرهٔ وضعیت: ' + f.chain;
}

function renderChanges(){
  $('hero-title').textContent = 'چه چیزهایی در این دور اصلاح شد؟';
  $('hero-sub').textContent = 'هر تغییر یک مشکل واقعی را می‌بندد و اثرش در همان فلو دیده می‌شود.';

  $('view').innerHTML = `
    <section class="panel">
      <h3>وضعیت ساخت و تست</h3>
      <div class="verifygrid">
        ${DATA.verification.map(v => `<div class="verify"><span>${esc(v[0])}</span><b>${esc(v[1])}</b></div>`).join('')}
      </div>
    </section>
    ${DATA.changes.map(c => `
      <div class="change">
        <h4>${esc(c[1])}</h4>
        <div class="ba">
          <div class="box before"><span class="lbl">قبل</span><br>${esc(c[2])}</div>
          <div class="box after"><span class="lbl">بعد</span><br>${esc(c[3])}</div>
        </div>
        <div class="flowlinks">
          ${c[4].map(id => {
            const f = DATA.flows.find(x => x.id === id);
            return f ? `<button class="flowlink" data-flow="${id}">${esc(f.title)}</button>` : '';
          }).join('')}
        </div>
      </div>`).join('')}`;

  $('view').querySelectorAll('[data-flow]').forEach(btn => {
    btn.onclick = () => { state.view='flow'; state.flowId = btn.dataset.flow; render(); window.scrollTo({top:0,behavior:'smooth'}); };
  });
}

function renderRules(){
  $('hero-title').textContent = 'قواعد وضعیت';
  $('hero-sub').textContent = 'تنها منبع حقیقت برای این‌که هر وضعیت چه معنایی دارد.';

  $('view').innerHTML = DATA.stateRules.map(([title, rows]) => `
    <section class="panel">
      <h3>${esc(title)}</h3>
      ${rows.map(([code, desc]) => `<div class="rule"><code>${esc(code)}</code><div>${esc(desc)}</div></div>`).join('')}
    </section>`).join('') + `
    <section class="panel">
      <h3>قاعدهٔ اشغال ساعت</h3>
      <p class="hint">یک ستون (holdsSlot) تعیین می‌کند کدام نوبت ساعت را اشغال کرده است؛ نه وضعیت رزرو.</p>
      <div class="rule"><code>holdsSlot = true</code><div>رزرو پرداخت‌شده (در انتظار تایید یا قطعی)، نوبت دستی و نوبت انجام‌شده.</div></div>
      <div class="rule"><code>holdsSlot = false</code><div>درخواست بدون پرداخت و هر نوبت لغو/رد‌شده؛ ساعت فوراً آزاد می‌شود.</div></div>
      <div class="rule"><code>slot_holds</code><div>نگه‌داشتن موقت هنگام رفتن مشتری به درگاه؛ حداکثر ۳۰ دقیقه.</div></div>
    </section>`;
}

function render(){
  renderNav();
  renderStats();
  if (state.view === 'changes') renderChanges();
  else if (state.view === 'rules') renderRules();
  else renderFlow();
}

$('nav-changes').onclick = () => { state.view='changes'; render(); };
$('nav-rules').onclick = () => { state.view='rules'; render(); };
$('search').oninput = e => { state.q = e.target.value; renderNav(); };

document.addEventListener('keydown', e => {
  if (e.key === '/' ) { e.preventDefault(); $('search').focus(); }
});

render();
</script>
</body>
</html>
"""

out = HTML.replace("__TITLE__", "منشیم — فلوهای محصول (نسخهٔ ۴)") \
          .replace("__DATE__", DATA["meta"]["date"]) \
          .replace("__DATA__", json.dumps(DATA, ensure_ascii=False))

path = "/home/user/monshim-flows-final.html"
open(path, "w", encoding="utf-8").write(out)

spec = {
    "meta": {
        "project": "منشیم",
        "version": "4.0",
        "updatedAt": "2026-10-21",
        "source": "استخراج‌شده از کد بک‌اند NestJS و فرانت Next.js",
        "stats": stats,
    },
    "roles": {k: {"label": v[0], "panel": v[1]} for k, v in ROLES.items()},
    "stateMachine": {
        "booking": {
            "pending": ["confirmed", "rejected", "canceled"],
            "confirmed": ["completed", "canceled"],
            "completed": [],
            "canceled": [],
            "rejected": [],
        },
        "slotHolding": {
            "statuses": ["confirmed", "completed"],
            "temporaryHold": "slot_holds (پیش‌فرض ۳۰ دقیقه)",
        },
        "payment": {
            "PENDING": ["PAID", "FAILED", "CANCELED"],
            "PAID": [],
            "FAILED": [],
            "CANCELED": [],
        },
    },
    "flows": [
        {
            "id": f["id"],
            "title": f["title"],
            "actors": f["actors"],
            "chain": f["chain"],
            "steps": [
                {
                    "n": i + 1,
                    "stage": s[0],
                    "actor": s[1],
                    "action": s[2],
                    "api": s[3],
                    "booking": s[4],
                    "note": s[5],
                }
                for i, s in enumerate(f["steps"])
            ],
            "notes": f.get("notes", []),
        }
        for f in FLOWS
    ],
    "changes": [
        {"id": c[0], "title": c[1], "before": c[2], "after": c[3], "flows": c[4]}
        for c in CHANGES
    ],
    "verification": [{"label": v[0], "value": v[1]} for v in DATA["verification"]],
}
json.dump(spec, open("/home/user/monshim-flows-spec.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)

print("WROTE", os.path.getsize(path), "bytes |", stats)
