Attribute VB_Name = "Module1"
'==========================================================
' 在庫管理・自動発注マクロ(架空サンプル・A2サンプル納品物用)
' 本コードは実在の企業・データに基づかない架空のサンプルである。
' Phase 0→1ゲート条件「VBA解析サンプル納品物1件自作完了」対応。
'==========================================================

Option Explicit

' シート名定数
Const SHEET_ITEM_MASTER As String = "商品マスタ"
Const SHEET_SALES_LOG As String = "販売ログ"
Const SHEET_STOCK As String = "在庫状況"
Const SHEET_PO As String = "発注書"
Const SHEET_LOG As String = "処理ログ"

' 発注しきい値(共通設定。品目ごとの個別設定は商品マスタのD列を優先する)
Const DEFAULT_REORDER_THRESHOLD As Long = 20
Const DEFAULT_REORDER_QTY As Long = 50

'----------------------------------------------------------
' メイン処理:CSV取込→在庫更新→しきい値判定→発注書生成 の一連の流れを実行する
'----------------------------------------------------------
Sub Main_UpdateInventory()
    Dim csvPath As String
    csvPath = Application.GetOpenFilename("CSVファイル,*.csv", , "販売実績CSVを選択してください")
    If csvPath = "False" Then
        LogOperation "処理中止:CSVファイルが選択されませんでした"
        Exit Sub
    End If

    Call ImportSalesCSV(csvPath)
    Call RecalculateStockLevels
    Call CheckReorderThreshold
    Call GeneratePurchaseOrder

    LogOperation "Main_UpdateInventory 正常終了"
    MsgBox "在庫更新処理が完了しました。発注書シートを確認してください。", vbInformation
End Sub

'----------------------------------------------------------
' 販売実績CSVを取り込み、販売ログシートに追記する
'----------------------------------------------------------
Sub ImportSalesCSV(filePath As String)
    Dim wbSrc As Workbook
    Dim wsSrc As Worksheet
    Dim wsLog As Worksheet
    Dim srcRow As Long
    Dim destRow As Long
    Dim lastSrcRow As Long

    Application.ScreenUpdating = False

    Set wbSrc = Workbooks.Open(filePath, ReadOnly:=True)
    Set wsSrc = wbSrc.Sheets(1)
    Set wsLog = ThisWorkbook.Sheets(SHEET_SALES_LOG)

    lastSrcRow = wsSrc.Cells(wsSrc.Rows.Count, "A").End(xlUp).Row
    destRow = GetNextEmptyRow(wsLog)

    For srcRow = 2 To lastSrcRow ' 1行目はヘッダー
        wsLog.Cells(destRow, 1).Value = wsSrc.Cells(srcRow, 1).Value ' 販売日
        wsLog.Cells(destRow, 2).Value = wsSrc.Cells(srcRow, 2).Value ' 商品コード
        wsLog.Cells(destRow, 3).Value = wsSrc.Cells(srcRow, 3).Value ' 数量
        wsLog.Cells(destRow, 4).Value = wsSrc.Cells(srcRow, 4).Value ' 単価
        wsLog.Cells(destRow, 5).Value = wsLog.Cells(destRow, 3).Value * wsLog.Cells(destRow, 4).Value ' 金額
        destRow = destRow + 1
    Next srcRow

    wbSrc.Close SaveChanges:=False
    Application.ScreenUpdating = True

    LogOperation "ImportSalesCSV 完了:" & (lastSrcRow - 1) & "件取込 (" & filePath & ")"
End Sub

'----------------------------------------------------------
' 販売ログを集計し、在庫状況シートの在庫数を再計算する
'----------------------------------------------------------
Sub RecalculateStockLevels()
    Dim wsStock As Worksheet
    Dim wsMaster As Worksheet
    Dim lastMasterRow As Long
    Dim r As Long
    Dim itemCode As String
    Dim currentStock As Long

    Set wsMaster = ThisWorkbook.Sheets(SHEET_ITEM_MASTER)
    Set wsStock = ThisWorkbook.Sheets(SHEET_STOCK)

    lastMasterRow = wsMaster.Cells(wsMaster.Rows.Count, "A").End(xlUp).Row

    For r = 2 To lastMasterRow
        itemCode = wsMaster.Cells(r, 1).Value
        currentStock = CalculateStockLevel(itemCode)

        wsStock.Cells(r, 1).Value = itemCode
        wsStock.Cells(r, 2).Value = wsMaster.Cells(r, 2).Value ' 商品名
        wsStock.Cells(r, 3).Value = currentStock
        wsStock.Cells(r, 4).Value = Now
    Next r

    LogOperation "RecalculateStockLevels 完了:" & (lastMasterRow - 1) & "品目更新"
End Sub

'----------------------------------------------------------
' 商品コードを指定して、初期在庫数から出荷済み数量を差し引いた現在庫を返す
'----------------------------------------------------------
Function CalculateStockLevel(itemCode As String) As Long
    Dim wsMaster As Worksheet
    Dim wsSalesLog As Worksheet
    Dim initialStock As Long
    Dim shippedTotal As Long
    Dim r As Long
    Dim lastSalesRow As Long
    Dim masterRow As Long

    Set wsMaster = ThisWorkbook.Sheets(SHEET_ITEM_MASTER)
    Set wsSalesLog = ThisWorkbook.Sheets(SHEET_SALES_LOG)

    masterRow = FindRowByItemCode(wsMaster, itemCode)
    If masterRow = 0 Then
        CalculateStockLevel = 0
        Exit Function
    End If
    initialStock = wsMaster.Cells(masterRow, 3).Value ' C列:初期在庫数

    shippedTotal = 0
    lastSalesRow = wsSalesLog.Cells(wsSalesLog.Rows.Count, "B").End(xlUp).Row
    For r = 2 To lastSalesRow
        If wsSalesLog.Cells(r, 2).Value = itemCode Then
            shippedTotal = shippedTotal + wsSalesLog.Cells(r, 3).Value
        End If
    Next r

    CalculateStockLevel = initialStock - shippedTotal
End Function

'----------------------------------------------------------
' 商品マスタから商品コードに一致する行番号を返す(見つからない場合は0)
'----------------------------------------------------------
Function FindRowByItemCode(ws As Worksheet, itemCode As String) As Long
    Dim r As Long
    Dim lastRow As Long

    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    For r = 2 To lastRow
        If ws.Cells(r, 1).Value = itemCode Then
            FindRowByItemCode = r
            Exit Function
        End If
    Next r
    FindRowByItemCode = 0
End Function

'----------------------------------------------------------
' 在庫状況シートを確認し、しきい値を下回った品目を発注対象として抽出する
'----------------------------------------------------------
Sub CheckReorderThreshold()
    Dim wsStock As Worksheet
    Dim wsMaster As Worksheet
    Dim r As Long
    Dim lastRow As Long
    Dim threshold As Long
    Dim itemCode As String
    Dim masterRow As Long

    Set wsStock = ThisWorkbook.Sheets(SHEET_STOCK)
    Set wsMaster = ThisWorkbook.Sheets(SHEET_ITEM_MASTER)

    lastRow = wsStock.Cells(wsStock.Rows.Count, "A").End(xlUp).Row

    For r = 2 To lastRow
        itemCode = wsStock.Cells(r, 1).Value
        masterRow = FindRowByItemCode(wsMaster, itemCode)

        threshold = DEFAULT_REORDER_THRESHOLD
        If masterRow > 0 Then
            If wsMaster.Cells(masterRow, 4).Value <> "" Then
                threshold = wsMaster.Cells(masterRow, 4).Value ' D列:個別しきい値(任意設定)
            End If
        End If

        If wsStock.Cells(r, 3).Value < threshold Then
            wsStock.Cells(r, 5).Value = "要発注"
        Else
            wsStock.Cells(r, 5).Value = ""
        End If
    Next r

    LogOperation "CheckReorderThreshold 完了"
End Sub

'----------------------------------------------------------
' 「要発注」となった品目を発注書シートに転記する
'----------------------------------------------------------
Sub GeneratePurchaseOrder()
    Dim wsStock As Worksheet
    Dim wsPO As Worksheet
    Dim wsMaster As Worksheet
    Dim r As Long
    Dim lastRow As Long
    Dim poRow As Long
    Dim itemCode As String
    Dim masterRow As Long
    Dim reorderQty As Long

    Set wsStock = ThisWorkbook.Sheets(SHEET_STOCK)
    Set wsPO = ThisWorkbook.Sheets(SHEET_PO)
    Set wsMaster = ThisWorkbook.Sheets(SHEET_ITEM_MASTER)

    ' 発注書シートを初期化(ヘッダー行を残してクリア)
    Dim clearLastRow As Long
    clearLastRow = wsPO.Cells(wsPO.Rows.Count, "A").End(xlUp).Row
    If clearLastRow > 1 Then
        wsPO.Range("A2:E" & clearLastRow).ClearContents
    End If

    lastRow = wsStock.Cells(wsStock.Rows.Count, "A").End(xlUp).Row
    poRow = 2

    For r = 2 To lastRow
        If wsStock.Cells(r, 5).Value = "要発注" Then
            itemCode = wsStock.Cells(r, 1).Value
            masterRow = FindRowByItemCode(wsMaster, itemCode)

            reorderQty = DEFAULT_REORDER_QTY
            If masterRow > 0 And wsMaster.Cells(masterRow, 5).Value <> "" Then
                reorderQty = wsMaster.Cells(masterRow, 5).Value ' E列:個別発注数(任意設定)
            End If

            wsPO.Cells(poRow, 1).Value = itemCode
            wsPO.Cells(poRow, 2).Value = wsStock.Cells(r, 2).Value ' 商品名
            wsPO.Cells(poRow, 3).Value = wsStock.Cells(r, 3).Value ' 現在庫数
            wsPO.Cells(poRow, 4).Value = reorderQty
            wsPO.Cells(poRow, 5).Value = Date

            poRow = poRow + 1
        End If
    Next r

    LogOperation "GeneratePurchaseOrder 完了:" & (poRow - 2) & "品目を発注対象として抽出"
End Sub

'----------------------------------------------------------
' 販売ログから当月分の請求データをCSVとして書き出す(簡易実装)
'----------------------------------------------------------
Sub ExportInvoiceData()
    Dim wsSalesLog As Worksheet
    Dim fso As Object
    Dim ts As Object
    Dim outputPath As String
    Dim r As Long
    Dim lastRow As Long
    Dim targetMonth As Integer
    Dim targetYear As Integer

    Set wsSalesLog = ThisWorkbook.Sheets(SHEET_SALES_LOG)
    Set fso = CreateObject("Scripting.FileSystemObject")

    targetMonth = Month(Date)
    targetYear = Year(Date)
    outputPath = ThisWorkbook.Path & "\invoice_" & targetYear & Format(targetMonth, "00") & ".csv"

    Set ts = fso.CreateTextFile(outputPath, True)
    ts.WriteLine "販売日,商品コード,数量,単価,金額"

    lastRow = wsSalesLog.Cells(wsSalesLog.Rows.Count, "A").End(xlUp).Row
    For r = 2 To lastRow
        If Month(wsSalesLog.Cells(r, 1).Value) = targetMonth And _
           Year(wsSalesLog.Cells(r, 1).Value) = targetYear Then
            ts.WriteLine wsSalesLog.Cells(r, 1).Value & "," & _
                         wsSalesLog.Cells(r, 2).Value & "," & _
                         wsSalesLog.Cells(r, 3).Value & "," & _
                         wsSalesLog.Cells(r, 4).Value & "," & _
                         wsSalesLog.Cells(r, 5).Value
        End If
    Next r

    ts.Close

    LogOperation "ExportInvoiceData 完了:" & outputPath
End Sub

'----------------------------------------------------------
' 販売ログシートの最終行の次の空き行番号を返す
'----------------------------------------------------------
Function GetNextEmptyRow(ws As Worksheet) As Long
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    If lastRow = 1 And ws.Cells(1, 1).Value = "" Then
        GetNextEmptyRow = 1
    Else
        GetNextEmptyRow = lastRow + 1
    End If
End Function

'----------------------------------------------------------
' 処理ログシートに実行記録を1行追記する(簡易ロガー)
'----------------------------------------------------------
Sub LogOperation(message As String)
    Dim wsLog As Worksheet
    Dim nextRow As Long

    On Error Resume Next
    Set wsLog = ThisWorkbook.Sheets(SHEET_LOG)
    On Error GoTo 0

    If wsLog Is Nothing Then Exit Sub

    nextRow = GetNextEmptyRow(wsLog)
    wsLog.Cells(nextRow, 1).Value = Now
    wsLog.Cells(nextRow, 2).Value = message
End Sub
