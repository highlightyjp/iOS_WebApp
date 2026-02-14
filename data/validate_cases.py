#!/usr/bin/env python3
"""
4ケースapprox回避の検証

仕様で定義された4ケースがLPで判定可能か（共通路線を持つか）を確認する。
- 渋谷 ↔ 表参道
- 新宿 ↔ 新宿三丁目
- 池袋 ↔ 和光市
- 東京 ↔ 大手町
"""

import json

# データ読み込み
with open('stations.json', 'r', encoding='utf-8') as f:
    stations_data = json.load(f)['stations']

with open('lines.json', 'r', encoding='utf-8') as f:
    lines_data = json.load(f)['lines']

# 駅名から駅IDを検索
def find_station_by_name(name):
    matches = []
    for sid, station in stations_data.items():
        if station['name'] == name:
            matches.append(station)
    return matches

# 検証ケース
test_cases = [
    ('渋谷', '表参道'),
    ('新宿', '新宿三丁目'),
    ('池袋', '和光市'),
    ('東京', '大手町'),
]

print("=== 4ケース approx回避 検証 ===\n")

all_pass = True

for from_name, to_name in test_cases:
    print(f"【{from_name} ↔ {to_name}】")

    from_stations = find_station_by_name(from_name)
    to_stations = find_station_by_name(to_name)

    if not from_stations:
        print(f"  ERROR: 駅 '{from_name}' が見つかりません")
        all_pass = False
        continue
    if not to_stations:
        print(f"  ERROR: 駅 '{to_name}' が見つかりません")
        all_pass = False
        continue

    # 駅情報表示
    print(f"  {from_name}: {len(from_stations)}件")
    for s in from_stations:
        print(f"    - {s['id']}")
        print(f"      路線: {s['lines']}")

    print(f"  {to_name}: {len(to_stations)}件")
    for s in to_stations:
        print(f"    - {s['id']}")
        print(f"      路線: {s['lines']}")

    # 共通路線の確認（LP判定）
    common_lines = []
    for fs in from_stations:
        for ts in to_stations:
            for line in fs['lines']:
                if line in ts['lines']:
                    # 両駅が同一路線のstations配列に含まれているか確認
                    if line in lines_data:
                        line_stations = lines_data[line]['stations']
                        from_in_line = fs['id'] in line_stations
                        to_in_line = ts['id'] in line_stations
                        if from_in_line and to_in_line:
                            if line not in common_lines:
                                common_lines.append(line)

    if common_lines:
        print(f"  共通路線: {common_lines}")
        print(f"  → LP判定可能 (approx回避: OK)")
    else:
        print(f"  共通路線: なし")
        print(f"  → approx発生 (FAIL)")
        all_pass = False

    print()

print("=== 総合結果 ===")
if all_pass:
    print("全4ケース: PASS")
else:
    print("一部ケース: FAIL")
