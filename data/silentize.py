#!/usr/bin/env python3
"""
Phase A-3 沈黙化スクリプト

全ての意味付与・強調・誘導要素を中立化する
"""

import re

# 読み込み
with open('/home/user/iOS_WebApp/nexa_v1_0_0_full.html', 'r', encoding='utf-8') as f:
    content = f.read()

# === CSS沈黙化 ===

# 1. .b の背景色を中立グレーに
content = content.replace(
    '.b{background:#0A84FF;',
    '.b{background:rgba(118,118,128,.4);'
)

# 2. .b:active の変形削除
content = content.replace(
    '.b:active{transform:scale(.98)}',
    '.b:active{}'
)

# 3. .sc の色と巨大フォントを中立化
content = content.replace(
    '.sc{text-align:center;padding:32px 16px;font-size:64px;font-weight:700;color:#0A84FF}',
    '.sc{text-align:center;padding:16px;font-size:14px;font-weight:400;color:rgba(235,235,245,.6)}'
)

# 4. .reach-score の色と強調を中立化
content = content.replace(
    '.reach-score{font-size:28px;font-weight:700;color:#0A84FF;letter-spacing:-.5px}',
    '.reach-score{font-size:14px;font-weight:400;color:rgba(235,235,245,.6)}'
)

# 5. .sort-btn.active の色を中立化
content = content.replace(
    '.sort-btn.active{background:#0A84FF;color:#fff}',
    '.sort-btn.active{background:rgba(118,118,128,.24);color:rgba(235,235,245,.6)}'
)

# 6. .sort-btn:active の変形削除
content = content.replace(
    '.sort-btn:active{transform:scale(.95)}',
    '.sort-btn:active{}'
)

# 7. .slider-value の色と強調を中立化
content = content.replace(
    '.slider-value{font-size:24px;font-weight:600;color:#0A84FF;margin-bottom:12px}',
    '.slider-value{font-size:14px;font-weight:400;color:rgba(235,235,245,.6);margin-bottom:12px}'
)

# 8. .conf-high, .conf-mid, .conf-low を統一色に
content = content.replace(
    '.conf-high{color:#0A84FF}',
    '.conf-high{color:rgba(235,235,245,.6)}'
)
content = content.replace(
    '.conf-mid{color:#FF9F0A}',
    '.conf-mid{color:rgba(235,235,245,.6)}'
)
content = content.replace(
    '.conf-low{color:#FF453A}',
    '.conf-low{color:rgba(235,235,245,.6)}'
)

# 9. .badge-approx を中立化
content = content.replace(
    '.badge-approx{background:rgba(255,159,10,.15);color:#FF9F0A}',
    '.badge-approx{background:rgba(118,118,128,.24);color:rgba(235,235,245,.8)}'
)

# 10. .badge-line を中立化
content = content.replace(
    '.badge-line{background:rgba(10,132,255,.15);color:#0A84FF}',
    '.badge-line{background:rgba(118,118,128,.24);color:rgba(235,235,245,.8)}'
)

# 11. .segment::before を非表示化
content = content.replace(
    ".segment::before{content:'';position:absolute;top:2px;left:2px;width:calc(50% - 2px);height:calc(100% - 4px);background:rgba(255,255,255,.95);border-radius:7px;box-shadow:0 2px 6px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.04);transition:transform .25s cubic-bezier(.4,0,.2,1);z-index:0}",
    ".segment::before{display:none}"
)

# 12. .seg-item.active の色変更を削除
content = content.replace(
    '.seg-item.active{color:#000}',
    '.seg-item.active{color:rgba(235,235,245,.6)}'
)

# 13. .station-card:active の変形削除
content = content.replace(
    '.station-card:active{transform:scale(.98);box-shadow:0 2px 8px rgba(0,0,0,.2)}',
    '.station-card:active{}'
)

# 14. 地図凡例の色を中立化
content = content.replace(
    '.legend-dot.direct{background:#0A84FF}',
    '.legend-dot.direct{background:rgba(118,118,128,.6)}'
)
content = content.replace(
    '.legend-dot.approx{background:#FF9F0A}',
    '.legend-dot.approx{background:rgba(118,118,128,.6)}'
)
content = content.replace(
    '.legend-dot.work{background:#FF453A;width:16px;height:16px}',
    '.legend-dot.work{background:rgba(118,118,128,.6);width:12px;height:12px}'
)

# === JavaScript沈黙化 ===

# 15. confidence表示から色分けと(推定)(低確度)を削除
content = content.replace(
    "const cf=S.outer.f>=.8?'conf-high':S.outer.f>=.6?'conf-mid':'conf-low';const txt=S.outer.f>=.8?'':S.outer.f>=.6?' (推定)':' (低確度)';ns.innerHTML=`<span class=\"${cf}\">${D[S.outer.s][1]}${txt}</span>`",
    "ns.innerHTML=`<span>${D[S.outer.s][1]}</span>`"
)

# 16. 結果表示から(推定)(低確度)を削除
content = content.replace(
    "const cf=result.C>=.8?'':result.C>=.6?' (推定)':' (低確度)';o.innerHTML=`<div class=c><div class=sc>${result.F}</div><div style=\"text-align:center;font-size:15px;color:rgba(235,235,245,.6)\">総合スコア${cf}</div>",
    "o.innerHTML=`<div class=c><div class=sc>${result.F}</div>"
)

# 17. 推定価格の(推定)(低確度)を削除
content = content.replace(
    '<span class=l>推定価格${cf}</span>',
    '<span class=l></span>'
)

# 18. 地図マーカーの色を統一
content = content.replace(
    "fillColor:'#FF453A'",
    "fillColor:'rgba(118,118,128,1)'"
)
content = content.replace(
    "const color=r.approx?'#FF9F0A':'#0A84FF'",
    "const color='rgba(118,118,128,1)'"
)

# 書き込み
with open('/home/user/iOS_WebApp/nexa_v1_0_0_full.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("沈黙化完了")
