# 環境場址調查成果平台

本專案為單頁調查總覽，包含衛星地圖、土壤剖面、監測井資料及六井浮油時間滑桿。根目錄的 `index.html` 可由 GitHub Pages 直接提供。

## Excel 上傳

按頁首「上傳 Excel」，選取 `FOR_WEB_網頁匯入轉換版.xlsx` 格式的活頁簿。支援「土壤點位」「地層」「土壤數據」「地下水點位」「浮油數據」工作表。檔案在瀏覽器內轉換並存於目前分頁的 sessionStorage；重新整理仍會顯示剛匯入的資料，關閉分頁後不會把檔案寫入 GitHub。按「清除已上傳資料」清除目前分頁的資料。GitHub 版本預設顯示完全虛構、標明為示範的點位與數值。

網頁讀取 Excel 使用 SheetJS CDN。地圖影像使用 Esri World Imagery，需網路連線。`site-data.js` 僅包含虛構示範資料；真正的調查 Excel 不會被提交到 GitHub。
