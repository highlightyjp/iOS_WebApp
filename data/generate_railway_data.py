#!/usr/bin/env python3
"""
鉄道データ生成スクリプト（凍結済み仕様準拠）

国土数値情報 N02 データから、評価器互換の D/LN 形式を生成する。
"""

import json
import math
import re
from collections import defaultdict

# ヘボン式ローマ字変換表
HEPBURN = {
    'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
    'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
    'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
    'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
    'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
    'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
    'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
    'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
    'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
    'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
    'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
    'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
    'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
    'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
    'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
    'ァ': 'a', 'ィ': 'i', 'ゥ': 'u', 'ェ': 'e', 'ォ': 'o',
    'ャ': 'ya', 'ュ': 'yu', 'ョ': 'yo',
    'ッ': '', 'ー': '',
    'ヴ': 'vu',
}

# 拗音
YOON = {
    'キャ': 'kya', 'キュ': 'kyu', 'キョ': 'kyo',
    'シャ': 'sha', 'シュ': 'shu', 'ショ': 'sho',
    'チャ': 'cha', 'チュ': 'chu', 'チョ': 'cho',
    'ニャ': 'nya', 'ニュ': 'nyu', 'ニョ': 'nyo',
    'ヒャ': 'hya', 'ヒュ': 'hyu', 'ヒョ': 'hyo',
    'ミャ': 'mya', 'ミュ': 'myu', 'ミョ': 'myo',
    'リャ': 'rya', 'リュ': 'ryu', 'リョ': 'ryo',
    'ギャ': 'gya', 'ギュ': 'gyu', 'ギョ': 'gyo',
    'ジャ': 'ja', 'ジュ': 'ju', 'ジョ': 'jo',
    'ビャ': 'bya', 'ビュ': 'byu', 'ビョ': 'byo',
    'ピャ': 'pya', 'ピュ': 'pyu', 'ピョ': 'pyo',
    'ティ': 'ti', 'ディ': 'di', 'デュ': 'dyu',
    'ファ': 'fa', 'フィ': 'fi', 'フェ': 'fe', 'フォ': 'fo',
    'ウィ': 'wi', 'ウェ': 'we', 'ウォ': 'wo',
}

# ひらがな→カタカナ変換
def hiragana_to_katakana(text):
    result = []
    for char in text:
        code = ord(char)
        if 0x3041 <= code <= 0x3096:
            result.append(chr(code + 0x60))
        else:
            result.append(char)
    return ''.join(result)

# 漢字→読み仮名辞書（主要駅）
KANJI_READINGS = {
    '新宿': 'シンジュク', '渋谷': 'シブヤ', '池袋': 'イケブクロ', '東京': 'トウキョウ',
    '品川': 'シナガワ', '上野': 'ウエノ', '秋葉原': 'アキハバラ', '横浜': 'ヨコハマ',
    '川崎': 'カワサキ', '大宮': 'オオミヤ', '浦和': 'ウラワ', '千葉': 'チバ',
    '船橋': 'フナバシ', '立川': 'タチカワ', '八王子': 'ハチオウジ', '町田': 'マチダ',
    '吉祥寺': 'キチジョウジ', '三鷹': 'ミタカ', '国分寺': 'コクブンジ',
    '中野': 'ナカノ', '荻窪': 'オギクボ', '高円寺': 'コウエンジ', '阿佐ヶ谷': 'アサガヤ',
    '目黒': 'メグロ', '恵比寿': 'エビス', '原宿': 'ハラジュク', '代々木': 'ヨヨギ',
    '有楽町': 'ユウラクチョウ', '神田': 'カンダ', '御茶ノ水': 'オチャノミズ',
    '水道橋': 'スイドウバシ', '飯田橋': 'イイダバシ', '市ヶ谷': 'イチガヤ',
    '四ツ谷': 'ヨツヤ', '信濃町': 'シナノマチ', '千駄ヶ谷': 'センダガヤ',
    '大崎': 'オオサキ', '五反田': 'ゴタンダ', '目黒': 'メグロ', '田町': 'タマチ',
    '浜松町': 'ハママツチョウ', '新橋': 'シンバシ', '日暮里': 'ニッポリ',
    '西日暮里': 'ニシニッポリ', '田端': 'タバタ', '駒込': 'コマゴメ', '巣鴨': 'スガモ',
    '大塚': 'オオツカ', '高田馬場': 'タカダノババ', '目白': 'メジロ',
    '鶯谷': 'ウグイスダニ', '御徒町': 'オカチマチ', '赤羽': 'アカバネ',
    '川口': 'カワグチ', '蕨': 'ワラビ', '西川口': 'ニシカワグチ', '戸田': 'トダ',
    '北戸田': 'キタトダ', '武蔵浦和': 'ムサシウラワ', '中浦和': 'ナカウラワ',
    '南浦和': 'ミナミウラワ', '与野': 'ヨノ', '北与野': 'キタヨノ',
    '大船': 'オオフナ', '藤沢': 'フジサワ', '平塚': 'ヒラツカ', '茅ヶ崎': 'チガサキ',
    '辻堂': 'ツジドウ', '小田原': 'オダワラ', '鎌倉': 'カマクラ',
    '戸塚': 'トツカ', '保土ヶ谷': 'ホドガヤ', '桜木町': 'サクラギチョウ',
    '関内': 'カンナイ', '石川町': 'イシカワチョウ', '山手': 'ヤマテ',
    '根岸': 'ネギシ', '磯子': 'イソゴ', '新杉田': 'シンスギタ',
    '金沢文庫': 'カナザワブンコ', '金沢八景': 'カナザワハッケイ',
    '武蔵小杉': 'ムサシコスギ', '自由が丘': 'ジユウガオカ', '田園調布': 'デンエンチョウフ',
    '中目黒': 'ナカメグロ', '祐天寺': 'ユウテンジ', '学芸大学': 'ガクゲイダイガク',
    '都立大学': 'トリツダイガク', '多摩川': 'タマガワ', '新丸子': 'シンマルコ',
    '元住吉': 'モトスミヨシ', '日吉': 'ヒヨシ', '綱島': 'ツナシマ',
    '大倉山': 'オオクラヤマ', '菊名': 'キクナ', '妙蓮寺': 'ミョウレンジ',
    '白楽': 'ハクラク', '東白楽': 'ヒガシハクラク', '反町': 'タンマチ',
    '錦糸町': 'キンシチョウ', '亀戸': 'カメイド', '平井': 'ヒライ',
    '新小岩': 'シンコイワ', '小岩': 'コイワ', '市川': 'イチカワ',
    '本八幡': 'モトヤワタ', '下総中山': 'シモウサナカヤマ', '西船橋': 'ニシフナバシ',
    '津田沼': 'ツダヌマ', '稲毛': 'イナゲ', '蘇我': 'ソガ',
    '調布': 'チョウフ', '府中': 'フチュウ', '分倍河原': 'ブバイガワラ',
    '聖蹟桜ヶ丘': 'セイセキサクラガオカ', '高幡不動': 'タカハタフドウ',
    '多摩動物公園': 'タマドウブツコウエン', '京王八王子': 'ケイオウハチオウジ',
    '高尾': 'タカオ', '高尾山口': 'タカオサングチ',
    '新百合ヶ丘': 'シンユリガオカ', '相模大野': 'サガミオオノ', '海老名': 'エビナ',
    '厚木': 'アツギ', '本厚木': 'ホンアツギ', '伊勢原': 'イセハラ', '秦野': 'ハダノ',
    '表参道': 'オモテサンドウ', '青山一丁目': 'アオヤマイッチョウメ',
    '永田町': 'ナガタチョウ', '溜池山王': 'タメイケサンノウ', '赤坂見附': 'アカサカミツケ',
    '六本木': 'ロッポンギ', '麻布十番': 'アザブジュウバン', '広尾': 'ヒロオ',
    '白金高輪': 'シロカネタカナワ', '白金台': 'シロカネダイ',
    '大門': 'ダイモン', '御成門': 'オナリモン', '虎ノ門': 'トラノモン',
    '霞ヶ関': 'カスミガセキ', '銀座': 'ギンザ', '日本橋': 'ニホンバシ',
    '三越前': 'ミツコシマエ', '大手町': 'オオテマチ', '竹橋': 'タケバシ',
    '九段下': 'クダンシタ', '半蔵門': 'ハンゾウモン', '桜田門': 'サクラダモン',
    '新宿三丁目': 'シンジュクサンチョウメ', '東新宿': 'ヒガシシンジュク',
    '西早稲田': 'ニシワセダ', '雑司が谷': 'ゾウシガヤ', '護国寺': 'ゴコクジ',
    '茗荷谷': 'ミョウガダニ', '後楽園': 'コウラクエン', '本郷三丁目': 'ホンゴウサンチョウメ',
    '湯島': 'ユシマ', '根津': 'ネヅ', '千駄木': 'センダギ', '東大前': 'トウダイマエ',
    '小竹向原': 'コタケムカイハラ', '和光市': 'ワコウシ', '地下鉄成増': 'チカテツナリマス',
    '地下鉄赤塚': 'チカテツアカツカ', '平和台': 'ヘイワダイ', '氷川台': 'ヒカワダイ',
    '桜台': 'サクラダイ', '練馬': 'ネリマ', '豊島園': 'トシマエン', '中村橋': 'ナカムラバシ',
    '富士見台': 'フジミダイ', '石神井公園': 'シャクジイコウエン', '大泉学園': 'オオイズミガクエン',
    '保谷': 'ホウヤ', 'ひばりヶ丘': 'ヒバリガオカ', '東久留米': 'ヒガシクルメ',
    '清瀬': 'キヨセ', '秋津': 'アキツ', '所沢': 'トコロザワ',
}

def get_reading(name):
    """駅名から読み仮名を取得"""
    # 完全一致
    if name in KANJI_READINGS:
        return KANJI_READINGS[name]

    # 部分一致で置換
    result = name
    for kanji, reading in sorted(KANJI_READINGS.items(), key=lambda x: -len(x[0])):
        result = result.replace(kanji, reading)

    # 残った漢字がある場合はそのまま（後でローマ字化できない）
    return result

def to_romaji(text):
    """テキストをローマ字に変換"""
    # ひらがな→カタカナ
    text = hiragana_to_katakana(text)

    # 漢字→カタカナ（読み仮名辞書使用）
    text = get_reading(text)

    # 全角→半角
    text = text.translate(str.maketrans(
        '０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ',
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    ))

    # 拗音を先に処理
    for kana, romaji in YOON.items():
        text = text.replace(kana, romaji)

    # カタカナ→ローマ字
    result = []
    i = 0
    while i < len(text):
        char = text[i]
        if char in HEPBURN:
            result.append(HEPBURN[char])
        elif char.isalnum():
            result.append(char.lower())
        # その他の文字は無視（記号・空白除去）
        i += 1

    return ''.join(result)

def normalize_line_name(name, operator):
    """路線名を正規化してIDを生成"""
    # 路線名から不要な文字を除去
    name = re.sub(r'線$', '', name)
    name = re.sub(r'本線$', '', name)

    return to_romaji(name)

def get_operator_code(operator_code, operator_name):
    """事業者コードを取得"""
    # N02_001 事業者種別コード
    # 11: JR（旧国鉄）
    # 12: JR以外の普通鉄道（地方鉄道）
    # 13: 軌道
    # 21: 地下鉄（都営）
    # 22: 地下鉄（東京メトロ等）
    # 23: モノレール等
    # 24: 新交通システム

    if operator_code == '11':
        return 'jr'

    # 事業者名から判定
    if '東京地下鉄' in operator_name or 'メトロ' in operator_name:
        return 'metro'
    if '東京都交通局' in operator_name or '都営' in operator_name:
        return 'toei'

    return 'private'

def haversine(lat1, lng1, lat2, lng2):
    """Haversine距離（メートル）"""
    R = 6371000  # 地球の半径（メートル）
    p = math.pi / 180
    a = math.sin((lat2 - lat1) * p / 2) ** 2 + \
        math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lng2 - lng1) * p / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def get_centroid(coords):
    """LineStringの中心座標を取得"""
    lngs = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return sum(lats) / len(lats), sum(lngs) / len(lngs)

def format_coord(val):
    """座標を6桁に整形"""
    return f"{val:.6f}".replace('.', '').replace('-', 'm')[:9]

def generate_station_id(name_romaji, lat, lng):
    """駅IDを生成"""
    lat_str = format_coord(lat)
    lng_str = format_coord(lng)
    return f"station_{name_romaji}_{lat_str}_{lng_str}"

def generate_line_id(operator_code, line_name_romaji):
    """路線IDを生成"""
    return f"{operator_code}_{line_name_romaji}"

def main():
    print("Loading station data...")
    with open('UTF-8/N02-21_Station.geojson', 'r', encoding='utf-8') as f:
        station_data = json.load(f)

    print("Loading railroad section data...")
    with open('UTF-8/N02-21_RailroadSection.geojson', 'r', encoding='utf-8') as f:
        section_data = json.load(f)

    # ステップ1: 全駅を読み込み、座標と路線情報を取得
    print("Processing stations...")
    raw_stations = []
    for feature in station_data['features']:
        props = feature['properties']
        coords = feature['geometry']['coordinates']
        lat, lng = get_centroid(coords)

        station_name = props.get('N02_005', '')
        if not station_name:
            continue

        line_name = props.get('N02_003', '')
        operator_name = props.get('N02_004', '')
        operator_code = props.get('N02_001', '')

        raw_stations.append({
            'name': station_name,
            'lat': lat,
            'lng': lng,
            'line_name': line_name,
            'operator_name': operator_name,
            'operator_code': operator_code,
        })

    print(f"Raw stations: {len(raw_stations)}")

    # ステップ2: 駅の統合（50m以内 + 同名）
    print("Merging nearby stations...")
    merged_stations = {}  # name -> list of station groups

    for station in raw_stations:
        name = station['name']
        if name not in merged_stations:
            merged_stations[name] = []

        # 既存グループとの距離チェック
        found_group = None
        for group in merged_stations[name]:
            rep_lat = group['lat']
            rep_lng = group['lng']
            dist = haversine(station['lat'], station['lng'], rep_lat, rep_lng)
            if dist <= 50:
                found_group = group
                break

        if found_group:
            # グループに追加
            found_group['lat_sum'] += station['lat']
            found_group['lng_sum'] += station['lng']
            found_group['count'] += 1
            found_group['lat'] = found_group['lat_sum'] / found_group['count']
            found_group['lng'] = found_group['lng_sum'] / found_group['count']

            # 路線情報追加
            op_code = get_operator_code(station['operator_code'], station['operator_name'])
            line_romaji = normalize_line_name(station['line_name'], station['operator_name'])
            line_id = generate_line_id(op_code, line_romaji)
            if line_id not in found_group['lines']:
                found_group['lines'].append(line_id)
                found_group['line_details'].append({
                    'line_id': line_id,
                    'line_name': station['line_name'],
                    'operator': station['operator_name'],
                })
        else:
            # 新グループ作成
            op_code = get_operator_code(station['operator_code'], station['operator_name'])
            line_romaji = normalize_line_name(station['line_name'], station['operator_name'])
            line_id = generate_line_id(op_code, line_romaji)

            merged_stations[name].append({
                'name': name,
                'lat': station['lat'],
                'lng': station['lng'],
                'lat_sum': station['lat'],
                'lng_sum': station['lng'],
                'count': 1,
                'lines': [line_id],
                'line_details': [{
                    'line_id': line_id,
                    'line_name': station['line_name'],
                    'operator': station['operator_name'],
                }],
            })

    # ステップ3: 駅IDを生成
    print("Generating station IDs...")
    stations = {}
    station_by_line = defaultdict(list)  # line_id -> [(station_id, lat, lng)]

    for name, groups in merged_stations.items():
        for group in groups:
            name_romaji = to_romaji(name)
            station_id = generate_station_id(name_romaji, group['lat'], group['lng'])

            stations[station_id] = {
                'id': station_id,
                'name': name,
                'lat': round(group['lat'], 6),
                'lng': round(group['lng'], 6),
                'lines': group['lines'],
            }

            # 路線別に駅を記録
            for line_id in group['lines']:
                station_by_line[line_id].append({
                    'id': station_id,
                    'lat': group['lat'],
                    'lng': group['lng'],
                })

    print(f"Merged stations: {len(stations)}")

    # ステップ4: 路線データを処理（駅順序）
    print("Processing lines...")

    # 路線ジオメトリを収集
    line_geometries = defaultdict(list)
    for feature in section_data['features']:
        props = feature['properties']
        line_name = props.get('N02_003', '')
        operator_name = props.get('N02_004', '')
        operator_code = props.get('N02_001', '')
        coords = feature['geometry']['coordinates']

        op_code = get_operator_code(operator_code, operator_name)
        line_romaji = normalize_line_name(line_name, operator_name)
        line_id = generate_line_id(op_code, line_romaji)

        line_geometries[line_id].append(coords)

    # 各路線の駅を並べ替え
    lines = {}
    for line_id, station_list in station_by_line.items():
        if len(station_list) == 0:
            continue

        # 路線ジオメトリがない場合は緯度経度でソート
        if line_id not in line_geometries or len(line_geometries[line_id]) == 0:
            sorted_stations = sorted(station_list, key=lambda s: (s['lat'], s['lng']))
        else:
            # 路線ジオメトリを連結
            all_coords = []
            for coords in line_geometries[line_id]:
                all_coords.extend(coords)

            if len(all_coords) < 2:
                sorted_stations = sorted(station_list, key=lambda s: (s['lat'], s['lng']))
            else:
                # 各駅の最近接点を計算
                def get_nearest_ratio(station):
                    min_dist = float('inf')
                    best_ratio = 0
                    total_len = 0

                    for i in range(len(all_coords) - 1):
                        c1 = all_coords[i]
                        c2 = all_coords[i + 1]
                        seg_len = haversine(c1[1], c1[0], c2[1], c2[0])

                        # 駅から線分への最短距離
                        dist = haversine(station['lat'], station['lng'], c1[1], c1[0])
                        if dist < min_dist:
                            min_dist = dist
                            best_ratio = total_len

                        total_len += seg_len

                    return best_ratio

                for s in station_list:
                    s['ratio'] = get_nearest_ratio(s)

                sorted_stations = sorted(station_list, key=lambda s: s['ratio'])

        station_ids = [s['id'] for s in sorted_stations]
        station_index = {sid: idx for idx, sid in enumerate(station_ids)}

        lines[line_id] = {
            'id': line_id,
            'stations': station_ids,
            'stationIndex': station_index,
        }

    print(f"Lines: {len(lines)}")

    # ステップ5: D/LN互換形式に変換
    print("Converting to D/LN format...")

    # D形式: [id, name, lat, lng, lines, 0, [0,0,0,0], [0.5,50,0], 50, 0]
    D_entries = []
    for sid, station in stations.items():
        # lines配列から実際に存在する路線のみフィルタ
        valid_lines = [ln for ln in station['lines'] if ln in lines]
        D_entries.append([
            sid,
            station['name'],
            station['lat'],
            station['lng'],
            valid_lines,
            0,
            [0, 0, 0, 0],
            [0.5, 50, 0],
            50,
            0
        ])

    # LN形式
    LN_entries = {}
    for line_id, line in lines.items():
        LN_entries[line_id] = {
            'stations': line['stations'],
            'idx': line['stationIndex'],
            'v': [],
            'sp': 1.2,
            'ap': 0.6,
            'mode': 'local',
            'skipFactor': 1.0,
        }

    # ステップ6: 検証
    print("\n=== Validation ===")
    print(f"Station count: {len(stations)} (requirement: > 9000)")

    # D[sid][4] ⊆ LN.keys を検証
    orphan_lines = set()
    for sid, station in stations.items():
        for line_id in station['lines']:
            if line_id not in lines:
                orphan_lines.add(line_id)

    if orphan_lines:
        print(f"WARNING: Orphan lines (in D but not in LN): {len(orphan_lines)}")
    else:
        print("OK: All lines in D[sid][4] exist in LN")

    # 出力
    print("\nWriting output files...")

    with open('stations.json', 'w', encoding='utf-8') as f:
        json.dump({'stations': stations}, f, ensure_ascii=False, indent=2)

    with open('lines.json', 'w', encoding='utf-8') as f:
        json.dump({'lines': {k: {'id': v['id'], 'stations': v['stations'], 'stationIndex': v['stationIndex']} for k, v in lines.items()}}, f, ensure_ascii=False, indent=2)

    with open('D.json', 'w', encoding='utf-8') as f:
        json.dump(D_entries, f, ensure_ascii=False)

    with open('LN.json', 'w', encoding='utf-8') as f:
        json.dump(LN_entries, f, ensure_ascii=False)

    # JavaScript埋め込み用
    with open('railway_data.js', 'w', encoding='utf-8') as f:
        f.write('const D={};\n')
        f.write('[\n')
        for i, entry in enumerate(D_entries):
            line = json.dumps(entry, ensure_ascii=False)
            if i < len(D_entries) - 1:
                f.write(f'{line},\n')
            else:
                f.write(f'{line}\n')
        f.write('].forEach(st=>D[st[0]]=st);\n')
        f.write(f'const LN={json.dumps(LN_entries, ensure_ascii=False)};\n')
        f.write("Object.keys(LN).forEach(k=>{LN[k].idx={};LN[k].stations.forEach((s,i)=>LN[k].idx[s]=i)});\n")

    print(f"\nOutput files:")
    print(f"  - stations.json")
    print(f"  - lines.json")
    print(f"  - D.json")
    print(f"  - LN.json")
    print(f"  - railway_data.js (for HTML embedding)")

    print(f"\nFinal statistics:")
    print(f"  Stations: {len(stations)}")
    print(f"  Lines: {len(lines)}")

if __name__ == '__main__':
    main()
