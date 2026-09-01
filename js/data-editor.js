// Browser-only data editor. Edits the currently imported workbook and reapplies it live.
let editorWorkbook = null;
let editorActiveSheet = null;

const EDITOR_SHEETS = ['場址資訊','土壤點位','土壤樣品','地層','監測井','地下水檢測','水位浮油監測','法規標準'];
const editorRoot = document.getElementById('data-editor');
const editorTabs = document.getElementById('editor-tabs');
const editorTableWrap = document.getElementById('editor-table-wrap');
const editorApply = document.getElementById('editor-apply');
const editorDownload = document.getElementById('editor-download');
const editorStatus = document.getElementById('editor-status');

function cloneWorkbook(workbook){
  const out=XLSX.utils.book_new();
  workbook.SheetNames.forEach(name=>{
    const rows=XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,defval:null,raw:true});
    XLSX.utils.book_append_sheet(out,XLSX.utils.aoa_to_sheet(rows),name);
  });
  return out;
}
function editorSetStatus(text){editorStatus.textContent=text;}
function editorSheetRows(name){
  if(!editorWorkbook||!editorWorkbook.Sheets[name])return [];
  return XLSX.utils.sheet_to_json(editorWorkbook.Sheets[name],{defval:null,range:2,raw:true});
}
function editorHeaders(name){
  const sheet=editorWorkbook?.Sheets[name];if(!sheet)return [];
  const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:null,raw:true});
  return (matrix[2]||[]).map(v=>String(v??'').trim()).filter(Boolean);
}
function editorWriteRows(name,rows,headers){
  const old=editorWorkbook.Sheets[name];
  const matrix=XLSX.utils.sheet_to_json(old,{header:1,defval:null,raw:true});
  const top=[matrix[0]||[],matrix[1]||[],headers];
  rows.forEach(row=>top.push(headers.map(h=>row[h]??null)));
  editorWorkbook.Sheets[name]=XLSX.utils.aoa_to_sheet(top);
}
function parseEditorValue(value,original){
  if(typeof original==='number'){const n=Number(value);return Number.isFinite(n)?n:null;}
  return value;
}
function renderEditorSheet(name){
  editorActiveSheet=name;
  editorTabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.sheet===name));
  const rows=editorSheetRows(name),headers=editorHeaders(name);
  if(!headers.length){editorTableWrap.innerHTML='<div class="editor-empty">此工作表沒有可編輯欄位。</div>';return;}
  const table=document.createElement('table');table.className='editor-table';
  table.innerHTML=`<thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody></tbody>`;
  const tbody=table.querySelector('tbody');
  rows.forEach((row,rowIndex)=>{
    const tr=document.createElement('tr');
    headers.forEach(header=>{
      const td=document.createElement('td'),input=document.createElement('input');
      const original=row[header];
      input.value=original??'';input.dataset.row=String(rowIndex);input.dataset.header=header;
      input.dataset.originalType=typeof original;
      if(typeof original==='number'){input.type='number';input.step='any';}else input.type='text';
      input.addEventListener('change',()=>{
        const current=editorSheetRows(name),r=current[rowIndex]||{};
        r[header]=input.dataset.originalType==='number'?parseEditorValue(input.value,0):input.value;
        current[rowIndex]=r;editorWriteRows(name,current,headers);editorSetStatus('有尚未套用的修改。');
      });
      td.appendChild(input);tr.appendChild(td);
    });tbody.appendChild(tr);
  });
  editorTableWrap.innerHTML='';editorTableWrap.appendChild(table);
}
function openEditor(workbook){
  editorWorkbook=cloneWorkbook(workbook);editorRoot.hidden=false;editorApply.disabled=false;editorDownload.disabled=false;
  editorTabs.innerHTML='';
  EDITOR_SHEETS.filter(name=>editorWorkbook.Sheets[name]).forEach((name,index)=>{
    const b=document.createElement('button');b.type='button';b.className=`editor-tab ${index===0?'active':''}`;b.dataset.sheet=name;b.textContent=name;b.addEventListener('click',()=>renderEditorSheet(name));editorTabs.appendChild(b);
  });
  const first=EDITOR_SHEETS.find(name=>editorWorkbook.Sheets[name]);if(first)renderEditorSheet(first);
  editorSetStatus('可直接修改欄位；按「套用到畫面」即時重建地圖與剖面。');
}
editorApply.addEventListener('click',()=>{
  if(!editorWorkbook)return;
  const data=buildImportedData(editorWorkbook);
  if(data.errors.length){editorSetStatus(`無法套用：${[...new Set(data.errors)].join('；')}`);return;}
  importedWorkbookData=data;applyImportedData(data);editorSetStatus('已套用到目前畫面。重新整理網站仍會回到 GitHub Demo。');
});
editorDownload.addEventListener('click',()=>{
  if(!editorWorkbook)return;
  const stamp=new Date().toISOString().slice(0,10).replaceAll('-','');
  XLSX.writeFile(editorWorkbook,`環境場址調查資料_網頁調整_${stamp}.xlsx`);
  editorSetStatus('已下載目前網頁編輯器中的 XLSX。');
});

// Hook into the existing Excel chooser without changing its validation workflow.
excelFileInput.addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});openEditor(wb);}catch(error){console.error(error);}
});