#!/usr/bin/env python3
"""
生成した鉄道データをHTMLに埋め込むスクリプト
"""

import json
import re

# 生成したデータを読み込む
with open('D.json', 'r', encoding='utf-8') as f:
    D_entries = json.load(f)

with open('LN.json', 'r', encoding='utf-8') as f:
    LN_entries = json.load(f)

# D形式のJavaScriptコードを生成
def generate_d_code():
    lines = ['const D={};', '[']
    for i, entry in enumerate(D_entries):
        line = json.dumps(entry, ensure_ascii=False, separators=(',', ':'))
        if i < len(D_entries) - 1:
            lines.append(line + ',')
        else:
            lines.append(line)
    lines.append('].forEach(st=>D[st[0]]=st);')
    return '\n'.join(lines)

# LN形式のJavaScriptコードを生成
def generate_ln_code():
    return f'const LN={json.dumps(LN_entries, ensure_ascii=False, separators=(",", ":"))};'

# HTMLファイルを読み込む
with open('/home/user/iOS_WebApp/nexa_v1_0_0_full.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# 新しいD/LNコードを生成
d_code = generate_d_code()
ln_code = generate_ln_code()
idx_code = "Object.keys(LN).forEach(k=>{LN[k].idx={};LN[k].stations.forEach((s,i)=>LN[k].idx[s]=i)});"

# 既存のD定義を探して置き換える
# パターン: const D={};[...]...].forEach(st=>D[st[0]]=st);
d_pattern = r'const D=\{\};[\s\S]*?\].forEach\(st=>D\[st\[0\]\]=st\);'

# 既存のLN定義を探して置き換える
# パターン: const LN={...};Object.keys(LN)...
ln_pattern = r'const LN=\{[^}]+(?:\{[^}]*\}[^}]*)*\};'

# 行66のidxコードパターン
idx_pattern = r"Object\.keys\(LN\)\.forEach\(k=>\{LN\[k\]\.idx=\{\};LN\[k\]\.stations\.forEach\(\(s,i\)=>LN\[k\]\.idx\[s\]=i\)\}\);"

# 置換を実行
new_html = re.sub(d_pattern, d_code, html_content)
new_html = re.sub(ln_pattern, ln_code, new_html)
# idxコードは既存のものを保持（同じなので）

# 出力ファイルに書き込む
with open('/home/user/iOS_WebApp/nexa_v1_0_0_full_generated.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Generated: nexa_v1_0_0_full_generated.html")

# ファイルサイズを表示
import os
original_size = os.path.getsize('/home/user/iOS_WebApp/nexa_v1_0_0_full.html')
new_size = os.path.getsize('/home/user/iOS_WebApp/nexa_v1_0_0_full_generated.html')
print(f"Original: {original_size:,} bytes")
print(f"New: {new_size:,} bytes")
