// Keep the same dashboard renderer while allowing the FOR_WEB workbook to replace its data in this browser session.
(()=>{
const key='site-investigation-import-v2',nameKey=key+'-name';
try{const saved=sessionStorage.getItem(key);if(saved)window.siteData=JSON.parse(saved)}catch(e){console.warn('無法讀取已匯入資料',e)}
const $=id=>document.getElementById(id),status=$('excel-import-status');
if(sessionStorage.getItem(nameKey)){status.textContent='已載入：'+sessionStorage.getItem(nameKey);$('demo-banner').hidden=true}
const val=(row,...names)=>{for(const name of names){if(row[name]!==undefined&&row[name]!==null&&row[name]!=='')return row[name]}return null};
const text=v=>v===null||v===undefined?'':String(v).trim();
const number=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
const labValue=v=>{if(v===null||v===undefined||v==='')return null;const t=text(v);return /^SND$/i.test(t)?'SND':number(v)};
const when=v=>{if(v instanceof Date&&!Number.isNaN(v.getTime()))return v; if(typeof v==='number'){const p=XLSX.SSF.parse_date_code(v);if(p)return new Date(p.y,p.m-1,p.d,p.H||0,p.M||0,p.S||0)}const d=new Date(String(v).replace(/\//g,'-'));return Number.isNaN(d.getTime())?null:d};
const pad=n=>String(n).padStart(2,'0');
function convert(workbook){const rows=sheet=>{const ws=workbook.Sheets[sheet];return ws?XLSX.utils.sheet_to_json(ws,{defval:null,raw:true}):[]};
const soilPoints=rows('土壤點位').map(r=>({id:text(val(r,'點位編號','Point_ID')),east:number(val(r,'TWD97_X')),north:number(val(r,'TWD97_Y')),ground:number(val(r,'地表高程_EL_m'))})).filter(r=>r.id&&r.east!==null&&r.north!==null);
const wells=rows('地下水點位').map(r=>({id:text(val(r,'井名','Well_ID')),east:number(val(r,'TWD97_X')),north:number(val(r,'TWD97_Y')),toc:number(val(r,'井頂高程 (m, msl)','井頂高程')),diameter:number(val(r,'井徑 (吋)','井徑')),depth:number(val(r,'井深 (公尺)','井深')),screenTop:number(val(r,'井篩上緣 (m, bgs)')),screenBottom:number(val(r,'井篩下緣 (m, bgs)')),k:number(val(r,'K值(cm/s)'))})).filter(r=>r.id&&r.east!==null&&r.north!==null);
if(!soilPoints.length&&!wells.length)throw new Error('找不到有效的「土壤點位」或「地下水點位」座標');
const strata=rows('地層').map(r=>({id:text(val(r,'點位編號','Point_ID')),from:number(val(r,'深度_from_m','Depth_From_m')),to:number(val(r,'深度_to_m','Depth_To_m')),material:text(val(r,'材質','Geology'))})).filter(r=>r.id&&r.from!==null&&r.to>r.from);
const soilResults=rows('土壤數據').map(r=>({id:text(val(r,'點位編號','Point_ID')),from:number(val(r,'深度_from_m','Depth_From_m')),to:number(val(r,'深度_to_m','Depth_To_m')),pid:number(val(r,'PID_ppmV')),fid:number(val(r,'FID_ppmV')),diesel:number(val(r,'TPH TEST KIT(柴)_mgkg')),aviation:number(val(r,'TPH TEST KIT(航)_mgkg')),lab:labValue(val(r,'TPH實驗室分析結果_mgkg')),interpolated:number(val(r,'內插採用值_mgkg'))})).filter(r=>r.id&&r.from!==null&&r.to>r.from);
const records=rows('浮油數據').map(r=>{const dt=when(val(r,'Date & Time','Date&Time','量測時間')),oilDepth=number(val(r,'油位_m, TOC','油位_m,TOC')),waterDepth=number(val(r,'水位_m, TOC','水位_m,TOC'));return {well:text(val(r,'井名','Well_ID')),date:dt?`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`:'',time:dt?`${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`:'',oilDepth,waterDepth,thickness:number(val(r,'浮油厚度_m'))??(oilDepth!==null&&waterDepth!==null?waterDepth-oilDepth:null),note:text(val(r,'備註','Note'))}}).filter(r=>r.well&&r.date);
return {soilPoints,wells,strata,soilResults,records}}
$('excel-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;status.textContent='正在讀取 '+file.name+'…';try{if(!window.XLSX)throw new Error('Excel 讀取元件尚未載入，請重新整理後再試');const data=convert(XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}));sessionStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem(nameKey,file.name);location.reload()}catch(error){status.textContent='匯入失敗：'+error.message;status.classList.add('error');e.target.value=''}});
$('excel-reset').onclick=()=>{sessionStorage.removeItem(key);sessionStorage.removeItem(nameKey);location.reload()};
window.convertInvestigationWorkbook=convert;
})();
