// Excel 匯入 v2：Excel 套用後，以 Excel 為唯一資料來源重建目前頁面。
let importedWorkbookData = null;
let importedLayerGroup = null;
const originalMapLayers = [];

const excelFileInput = document.getElementById('excel-file');
const excelPreviewButton = document.getElementById('excel-preview-button');
const excelApplyButton = document.getElementById('excel-apply-button');
const excelFileName = document.getElementById('excel-file-name');
const excelStatus = document.getElementById('excel-import-status');

// app.js 會先建立 Demo 點位；載入本檔時記住所有非底圖圖層，套用 Excel 時移除。
map.eachLayer(layer => {
    if (!(layer instanceof L.TileLayer)) originalMapLayers.push(layer);
});

function setExcelStatus(message, type='') {
    excelStatus.textContent = message;
    excelStatus.className = `excel-import-status ${type}`.trim();
}
function sheetRows(workbook, name) {
    const sheet = workbook.Sheets[name];
    return sheet ? XLSX.utils.sheet_to_json(sheet, { defval:null, range:2 }) : [];
}
function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n=Number(value); return Number.isFinite(n) ? n : null;
}
function dateText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
        const d=XLSX.SSF.parse_date_code(value);
        if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    }
    return String(value).slice(0,10);
}
function dynamicResults(row, excluded, defaultUnit) {
    const results={};
    Object.keys(row).forEach(name => {
        if (excluded.includes(name)) return;
        const value=numberOrNull(row[name]);
        if (value !== null) results[name]={value,unit:row.Unit || defaultUnit};
    });
    return results;
}
function buildImportedData(workbook) {
    const siteRows=sheetRows(workbook,'場址資訊');
    const siteMap=Object.fromEntries(siteRows.filter(r=>r['欄位']).map(r=>[r['欄位'],r['值']]));
    const soilPoints=sheetRows(workbook,'土壤點位');
    const soilSamples=sheetRows(workbook,'土壤樣品');
    const wells=sheetRows(workbook,'監測井');
    const gwResults=sheetRows(workbook,'地下水檢測');
    const monitor=sheetRows(workbook,'水位浮油監測');
    const geology=sheetRows(workbook,'地層');
    const standardsRows=sheetRows(workbook,'法規標準');
    const errors=[];
    if (!soilPoints.length && !wells.length) errors.push('至少需要一筆「土壤點位」或「監測井」資料。');

    const sampling_points=soilPoints.map(p=>{
        const id=String(p.Point_ID||'').trim(), lat=numberOrNull(p.Latitude), lng=numberOrNull(p.Longitude);
        if(!id||lat===null||lng===null) errors.push('土壤點位有缺少 Point_ID / Latitude / Longitude 的資料列。');
        const samples=soilSamples.filter(s=>String(s.Point_ID||'').trim()===id).map(s=>({
            sample_id:s.Sample_ID || '', depth_from:numberOrNull(s.Depth_From_m), depth_to:numberOrNull(s.Depth_To_m),
            results:dynamicResults(s,['Point_ID','Sample_ID','Depth_From_m','Depth_To_m','Unit','Note'],'mg/kg')
        }));
        return {id,latitude:lat,longitude:lng,ground_elevation:numberOrNull(p.Ground_EL_m),type:p.Type||'土壤調查點',note:p.Note||'',samples,
            geology:geology.filter(g=>String(g.Point_ID||'').trim()===id).map(g=>({depth_from:numberOrNull(g.Depth_From_m),depth_to:numberOrNull(g.Depth_To_m),name:g.Geology,description:g.Description,note:g.Note||''}))};
    }).filter(p=>p.id&&p.latitude!==null&&p.longitude!==null);

    const monitoring_wells=wells.map(w=>{
        const id=String(w.Well_ID||'').trim(),lat=numberOrNull(w.Latitude),lng=numberOrNull(w.Longitude);
        if(!id||lat===null||lng===null) errors.push('監測井有缺少 Well_ID / Latitude / Longitude 的資料列。');
        const gwRows=gwResults.filter(r=>String(r.Well_ID||'').trim()===id);
        const latestGW=gwRows.slice(-1)[0];
        const results=latestGW ? dynamicResults(latestGW,['Well_ID','Sample_Date','Sample_ID','Unit','Note'],'mg/L') : {};
        const historyRows=monitor.filter(r=>String(r.Well_ID||'').trim()===id);
        const latestMonitor=historyRows.slice(-1)[0];
        const waterDepth=numberOrNull(latestMonitor?.Water_Depth_m) ?? numberOrNull(w.Water_Depth_m);
        const oilDepth=numberOrNull(latestMonitor?.LNAPL_Depth_m), oilThickness=numberOrNull(latestMonitor?.Apparent_LNAPL_Thickness_m);
        const hasOil=String(w.Has_LNAPL||'').toUpperCase()==='Y'||(oilThickness!==null&&oilThickness>0);
        return {id,latitude:lat,longitude:lng,type:'地下水監測井',ground_elevation:numberOrNull(w.Ground_EL_m),well_depth:numberOrNull(w.Well_Depth_m),screen_from:numberOrNull(w.Screen_From_m),screen_to:numberOrNull(w.Screen_To_m),water_depth:waterDepth,has_lnapl:hasOil,lnapl_depth:oilDepth,lnapl_thickness:oilThickness,lnapl_product:latestMonitor?.Product_Type||'LNAPL',lnapl_note:w.Note||'',results,
            groundwater_history:gwRows.map(r=>({date:dateText(r.Sample_Date),sample_id:r.Sample_ID||'',results:dynamicResults(r,['Well_ID','Sample_Date','Sample_ID','Unit','Note'],'mg/L')})),
            history:historyRows.map(r=>{const sameGW=gwRows.find(g=>dateText(g.Sample_Date)===dateText(r.Measure_Date));return {date:dateText(r.Measure_Date),water_depth:numberOrNull(r.Water_Depth_m),lnapl_depth:numberOrNull(r.LNAPL_Depth_m),lnapl_thickness:numberOrNull(r.Apparent_LNAPL_Thickness_m)||0,product:r.Product_Type||'',tph:sameGW?numberOrNull(sameGW.TPH):null};})};
    }).filter(w=>w.id&&w.latitude!==null&&w.longitude!==null);

    const standards={};
    standardsRows.forEach(r=>{const v=numberOrNull(r.Standard_Value);if(v!==null) standards[`${r.Media}:${r.Analyte}`]={value:v,unit:r.Unit,source:r.Source_Note,status:r.Status};});
    return {site:{name:siteMap.site_name||'匯入場址',project:siteMap.project_name||'Excel 匯入資料',coordinate_system:siteMap.coordinate_system,last_update:dateText(siteMap.last_update),data_status:siteMap.data_status},sampling_points,monitoring_wells,standards,errors,
        counts:{soilSamples:soilSamples.length,groundwaterResults:gwResults.length,monitoring:monitor.length,geology:geology.length}};
}

excelFileInput.addEventListener('change',async event=>{
    importedWorkbookData=null;excelApplyButton.disabled=true;const file=event.target.files[0];
    if(!file){excelPreviewButton.disabled=true;excelFileName.textContent='尚未選擇檔案';return;}
    excelFileName.textContent=file.name;
    try{const workbook=XLSX.read(await file.arrayBuffer(),{type:'array'});importedWorkbookData=buildImportedData(workbook);excelPreviewButton.disabled=false;setExcelStatus('Excel 已讀取。按「檢查資料」查看匯入摘要。');}
    catch(error){console.error(error);excelPreviewButton.disabled=true;setExcelStatus(`Excel 讀取失敗：${error.message}`,'error');}
});
excelPreviewButton.addEventListener('click',()=>{
    if(!importedWorkbookData)return;const d=importedWorkbookData;
    if(d.errors.length){excelApplyButton.disabled=true;setExcelStatus(`資料檢查未通過：${[...new Set(d.errors)].join('；')}`,'error');return;}
    excelApplyButton.disabled=false;setExcelStatus(`檢查完成｜土壤點 ${d.sampling_points.length}｜土壤樣品 ${d.counts.soilSamples}｜監測井 ${d.monitoring_wells.length}｜地下水檢測 ${d.counts.groundwaterResults}｜水位/浮油 ${d.counts.monitoring}｜地層 ${d.counts.geology}。`,'success');
});
function clearOldDataLayers(){
    originalMapLayers.forEach(layer=>{if(map.hasLayer(layer))map.removeLayer(layer);});
    if(importedLayerGroup&&map.hasLayer(importedLayerGroup))map.removeLayer(importedLayerGroup);
    // 清掉 app.js / lnapl.js 之後才加入的 Marker；保留底圖與控制元件。
    const remove=[];map.eachLayer(layer=>{if(layer instanceof L.Marker)remove.push(layer);});remove.forEach(layer=>map.removeLayer(layer));
}
function applyImportedData(data){
    clearOldDataLayers();importedLayerGroup=L.layerGroup().addTo(map);const coords=[];
    data.sampling_points.forEach(point=>{const c=[point.latitude,point.longitude];coords.push(c);const marker=L.marker(c).addTo(importedLayerGroup).bindTooltip(point.id,{permanent:true,direction:'top'});marker.on('click',()=>showSoilPointDetail(point));});
    data.monitoring_wells.forEach(well=>{const c=[well.latitude,well.longitude];coords.push(c);const marker=L.marker(c,{icon:monitoringWellIcon}).addTo(importedLayerGroup).bindTooltip(well.id,{permanent:true,direction:'top',className:'mw-tooltip'});marker.on('click',()=>showMonitoringWellDetail(well));if(well.has_lnapl)L.marker(c,{icon:L.divIcon({className:'lnapl-map-marker',html:'<div class="lnapl-map-icon">◆</div>',iconSize:[18,18],iconAnchor:[-10,18]}),interactive:false}).addTo(importedLayerGroup);});
    document.getElementById('site-description').textContent=`${data.site.name}｜${data.site.project}`;document.getElementById('point-detail').classList.add('hidden');document.getElementById('empty-state').classList.remove('hidden');if(coords.length)map.fitBounds(coords,{padding:[50,50],maxZoom:18});
}
excelApplyButton.addEventListener('click',()=>{if(!importedWorkbookData||importedWorkbookData.errors.length)return;applyImportedData(importedWorkbookData);setExcelStatus(`已完全切換為 Excel 資料｜${importedWorkbookData.site.name}。目前畫面不再混用原本 Demo 點位；重新整理頁面才會回到 GitHub Demo。`,'success');});