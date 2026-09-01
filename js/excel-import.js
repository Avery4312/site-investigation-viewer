// Excel 匯入 MVP：讀取標準範本、檢查資料、在目前頁面即時重建地圖。
let importedWorkbookData = null;
let importedLayerGroup = null;

const excelFileInput = document.getElementById('excel-file');
const excelPreviewButton = document.getElementById('excel-preview-button');
const excelApplyButton = document.getElementById('excel-apply-button');
const excelFileName = document.getElementById('excel-file-name');
const excelStatus = document.getElementById('excel-import-status');

function setExcelStatus(message, type='') {
    excelStatus.textContent = message;
    excelStatus.className = `excel-import-status ${type}`.trim();
}

function sheetRows(workbook, name) {
    const sheet = workbook.Sheets[name];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { defval: null, range: 2 });
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function buildImportedData(workbook) {
    const siteRows = sheetRows(workbook, '場址資訊');
    const siteMap = Object.fromEntries(siteRows.filter(r => r['欄位']).map(r => [r['欄位'], r['值']]));
    const soilPoints = sheetRows(workbook, '土壤點位');
    const soilSamples = sheetRows(workbook, '土壤樣品');
    const wells = sheetRows(workbook, '監測井');
    const gwResults = sheetRows(workbook, '地下水檢測');
    const monitor = sheetRows(workbook, '水位浮油監測');
    const geology = sheetRows(workbook, '地層');

    const errors = [];
    if (!soilPoints.length && !wells.length) errors.push('至少需要一筆「土壤點位」或「監測井」資料。');

    const sampling_points = soilPoints.map(p => {
        const id = String(p.Point_ID || '').trim();
        const lat = numberOrNull(p.Latitude), lng = numberOrNull(p.Longitude);
        if (!id || lat === null || lng === null) errors.push(`土壤點位有缺少 Point_ID / Latitude / Longitude 的資料列。`);
        const samples = soilSamples.filter(s => String(s.Point_ID || '').trim() === id).map(s => {
            const results = {};
            ['TPH','苯','甲苯','TCE'].forEach(name => {
                const v = numberOrNull(s[name]);
                if (v !== null) results[name] = { value:v, unit:s.Unit || 'mg/kg' };
            });
            return { depth_from:numberOrNull(s.Depth_From_m), depth_to:numberOrNull(s.Depth_To_m), results };
        });
        return {
            id, latitude:lat, longitude:lng,
            ground_elevation:numberOrNull(p.Ground_EL_m),
            type:p.Type || '土壤調查點', samples,
            geology: geology.filter(g => String(g.Point_ID || '').trim() === id).map(g => ({depth_from:numberOrNull(g.Depth_From_m),depth_to:numberOrNull(g.Depth_To_m),name:g.Geology,description:g.Description}))
        };
    }).filter(p => p.id && p.latitude !== null && p.longitude !== null);

    const monitoring_wells = wells.map(w => {
        const id = String(w.Well_ID || '').trim();
        const lat = numberOrNull(w.Latitude), lng = numberOrNull(w.Longitude);
        if (!id || lat === null || lng === null) errors.push(`監測井有缺少 Well_ID / Latitude / Longitude 的資料列。`);
        const latestGW = gwResults.filter(r => String(r.Well_ID || '').trim() === id).slice(-1)[0];
        const results = {};
        if (latestGW) ['TPH','苯','甲苯','TCE'].forEach(name => { const v=numberOrNull(latestGW[name]); if(v!==null) results[name]={value:v,unit:latestGW.Unit||'mg/L'}; });
        const historyRows = monitor.filter(r => String(r.Well_ID || '').trim() === id);
        const latestMonitor = historyRows.slice(-1)[0];
        const waterDepth = numberOrNull(latestMonitor?.Water_Depth_m) ?? numberOrNull(w.Water_Depth_m);
        const oilDepth = numberOrNull(latestMonitor?.LNAPL_Depth_m);
        const oilThickness = numberOrNull(latestMonitor?.Apparent_LNAPL_Thickness_m);
        const hasOil = String(w.Has_LNAPL || '').toUpperCase() === 'Y' || oilThickness > 0;
        return {
            id, latitude:lat, longitude:lng, type:'地下水監測井',
            ground_elevation:numberOrNull(w.Ground_EL_m), well_depth:numberOrNull(w.Well_Depth_m),
            screen_from:numberOrNull(w.Screen_From_m), screen_to:numberOrNull(w.Screen_To_m), water_depth:waterDepth,
            has_lnapl:hasOil, lnapl_depth:oilDepth, lnapl_thickness:oilThickness, lnapl_product:latestMonitor?.Product_Type || 'LNAPL',
            results,
            history:historyRows.map(r => ({date:r.Measure_Date,water_depth:numberOrNull(r.Water_Depth_m),lnapl_thickness:numberOrNull(r.Apparent_LNAPL_Thickness_m)||0,tph:null}))
        };
    }).filter(w => w.id && w.latitude !== null && w.longitude !== null);

    return { site:{name:siteMap.site_name || '匯入場址', project:siteMap.project_name || 'Excel 匯入資料'}, sampling_points, monitoring_wells, errors };
}

excelFileInput.addEventListener('change', async event => {
    importedWorkbookData = null;
    excelApplyButton.disabled = true;
    const file = event.target.files[0];
    if (!file) { excelPreviewButton.disabled = true; excelFileName.textContent='尚未選擇檔案'; return; }
    excelFileName.textContent = file.name;
    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type:'array' });
        importedWorkbookData = buildImportedData(workbook);
        excelPreviewButton.disabled = false;
        setExcelStatus('Excel 已讀取。按「檢查資料」查看匯入摘要。');
    } catch (error) {
        console.error(error); excelPreviewButton.disabled = true; setExcelStatus(`Excel 讀取失敗：${error.message}`, 'error');
    }
});

excelPreviewButton.addEventListener('click', () => {
    if (!importedWorkbookData) return;
    const d = importedWorkbookData;
    if (d.errors.length) {
        excelApplyButton.disabled = true;
        setExcelStatus(`資料檢查未通過：${[...new Set(d.errors)].join('；')}`, 'error');
        return;
    }
    excelApplyButton.disabled = false;
    setExcelStatus(`檢查完成｜土壤點位 ${d.sampling_points.length} 個｜監測井 ${d.monitoring_wells.length} 口。確認後按「套用更新」。`, 'success');
});

function applyImportedData(data) {
    if (importedLayerGroup) map.removeLayer(importedLayerGroup);
    importedLayerGroup = L.layerGroup().addTo(map);
    const coords = [];
    data.sampling_points.forEach(point => {
        const c=[point.latitude,point.longitude]; coords.push(c);
        const marker=L.marker(c).addTo(importedLayerGroup).bindTooltip(point.id,{permanent:true,direction:'top'});
        marker.on('click',()=>showSoilPointDetail(point));
    });
    data.monitoring_wells.forEach(well => {
        const c=[well.latitude,well.longitude]; coords.push(c);
        const marker=L.marker(c,{icon:monitoringWellIcon}).addTo(importedLayerGroup).bindTooltip(well.id,{permanent:true,direction:'top',className:'mw-tooltip'});
        marker.on('click',()=>showMonitoringWellDetail(well));
        if (well.has_lnapl) L.marker(c,{icon:L.divIcon({className:'lnapl-map-marker',html:'<div class="lnapl-map-icon">◆</div>',iconSize:[18,18],iconAnchor:[-10,18]}),interactive:false}).addTo(importedLayerGroup);
    });
    document.getElementById('site-description').textContent=`${data.site.name}｜${data.site.project}`;
    document.getElementById('point-detail').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
    if (coords.length) map.fitBounds(coords,{padding:[50,50],maxZoom:18});
}

excelApplyButton.addEventListener('click', () => {
    if (!importedWorkbookData || importedWorkbookData.errors.length) return;
    applyImportedData(importedWorkbookData);
    setExcelStatus(`已套用 Excel 資料｜${importedWorkbookData.site.name}。重新整理頁面即可回到 GitHub 內建 Demo 資料。`, 'success');
});