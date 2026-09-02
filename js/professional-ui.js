// 專業化 UI：地圖控制、剖面資料勾選、深度／材質／高程
(function(){
  function getBaseTileLayer(){let base=null;map.eachLayer(layer=>{if(layer instanceof L.TileLayer&&!base)base=layer;});return base;}
  function addMapOpacityControl(){const base=getBaseTileLayer();if(!base)return;const panel=document.querySelector('.map-panel'),title=panel?.querySelector('h2');if(!panel||!title)return;const row=document.createElement('div');row.className='map-title-row';title.parentNode.insertBefore(row,title);row.appendChild(title);const control=document.createElement('div');control.className='map-opacity-title-control';control.innerHTML='<span>底圖透明度</span><input type="range" min="0" max="100" step="5" value="100"><strong>100%</strong>';row.appendChild(control);const slider=control.querySelector('input'),value=control.querySelector('strong');slider.addEventListener('input',()=>{const n=Number(slider.value);base.setOpacity(n/100);value.textContent=n+'%';});}
  function addMapEssentials(){L.control.scale({position:'bottomright',metric:true,imperial:false,maxWidth:120}).addTo(map);const north=L.control({position:'topright'});north.onAdd=function(){const div=L.DomUtil.create('div','north-arrow');div.innerHTML='<div class="north-n">N</div><div class="north-symbol">▲</div>';return div;};north.addTo(map);}
  function displayValue(v){if(v===null||v===undefined||v==='')return '—';return typeof v==='number'?v.toLocaleString():String(v);}
  function addProfileSelector(point,section,profile){
    const sampleColumn=profile.querySelector('.sample-column');if(!sampleColumn)return;
    const metrics=[
      {key:'lab',label:'TPH 實驗室分析結果',unit:'mg/kg',checked:true},
      {key:'pid',label:'PID',unit:'ppmV'},
      {key:'fid',label:'FID',unit:'ppmV'},
      {key:'kit',label:'TPH Test Kit（柴）',unit:'mg/kg'},
      {key:'interp',label:'統計推估值（內插採用值）',unit:'mg/kg'}
    ];
    const selector=document.createElement('div');selector.className='profile-metric-selector';selector.innerHTML='<span class="profile-selector-title">剖面呈現項目</span>'+metrics.map(m=>`<label><input type="checkbox" value="${m.key}" ${m.checked?'checked':''}>${m.label}</label>`).join('');section.insertBefore(selector,profile);
    const ppm=95;
    function labFor(from,to){return (point.samples||[]).find(s=>Math.abs(Number(s.depth_from)-from)<0.0001&&Math.abs(Number(s.depth_to)-to)<0.0001);}
    function render(){
      const selected=new Set([...selector.querySelectorAll('input:checked')].map(x=>x.value));sampleColumn.innerHTML='';
      const screening=point.field_screening||[];
      if(screening.length){screening.forEach(r=>{const from=Number(r.depth_from),to=Number(r.depth_to);if(!isFinite(from)||!isFinite(to)||to<=from)return;const lab=labFor(from,to);const lines=[];
        if(selected.has('lab')&&lab?.results?.TPH)lines.push(`<span><b>Lab TPH</b> ${displayValue(lab.results.TPH.value)} mg/kg</span>`);
        if(selected.has('pid')&&r.pid!==null&&r.pid!==undefined)lines.push(`<span><b>PID</b> ${displayValue(r.pid)} ppmV</span>`);
        if(selected.has('fid')&&r.fid!==null&&r.fid!==undefined)lines.push(`<span><b>FID</b> ${displayValue(r.fid)} ppmV</span>`);
        if(selected.has('kit')&&r.tph_test_kit_diesel!==null&&r.tph_test_kit_diesel!==undefined)lines.push(`<span><b>Test Kit 柴</b> ${displayValue(r.tph_test_kit_diesel)} mg/kg</span>`);
        if(selected.has('interp')&&r.interpolation_value!==null&&r.interpolation_value!==undefined)lines.push(`<span><b>統計推估</b> ${displayValue(r.interpolation_value)} mg/kg</span>`);
        if(!lines.length)return;const block=document.createElement('div');block.className='sample-depth-block profile-multi-result';block.style.top=`${from*ppm}px`;block.style.height=`${(to-from)*ppm}px`;block.innerHTML=`<div class="sample-name">${point.id}(${formatDepth(from)}–${formatDepth(to)})</div><div class="profile-metric-lines">${lines.join('')}</div>`;sampleColumn.appendChild(block);
      });}else if(selected.has('lab')){(point.samples||[]).forEach(s=>{const tph=s.results?.TPH;if(!tph)return;const block=document.createElement('div');block.className='sample-depth-block profile-multi-result';block.style.top=`${Number(s.depth_from)*ppm}px`;block.style.height=`${(Number(s.depth_to)-Number(s.depth_from))*ppm}px`;block.innerHTML=`<div class="sample-name">${point.id}(${formatDepth(s.depth_from)}–${formatDepth(s.depth_to)})</div><div class="profile-metric-lines"><span><b>Lab TPH</b> ${displayValue(tph.value)} mg/kg</span></div>`;sampleColumn.appendChild(block);});}
    }
    selector.addEventListener('change',render);render();
  }
  const originalBorehole=window.createBoreholeProfile;if(typeof originalBorehole==='function'){window.createBoreholeProfile=function(point,container,standards){originalBorehole(point,container,standards);const sections=container.querySelectorAll('.borehole-section'),section=sections[sections.length-1];if(!section)return;const profile=section.querySelector('.borehole-profile');if(!profile)return;profile.classList.add('professional-profile');addProfileSelector(point,section,profile);const depths=[...(point.geology||[]).map(x=>Number(x.to)||0),...(point.samples||[]).map(x=>Number(x.depth_to)||0),...(point.field_screening||[]).map(x=>Number(x.depth_to)||0)];const maxDepth=Math.max(...depths,0);if(!isFinite(maxDepth)||maxDepth<=0)return;const grid=document.createElement('div');grid.className='profile-grid';for(let depth=0;depth<=maxDepth+0.001;depth+=0.5){const line=document.createElement('div');line.className='profile-grid-line';line.style.top=`${(depth/maxDepth)*100}%`;grid.appendChild(line);}profile.insertBefore(grid,profile.firstChild);if(typeof point.ground_elevation==='number'){const axis=document.createElement('div');axis.className='elevation-axis';for(let depth=0;depth<=maxDepth+0.001;depth+=0.5){const tick=document.createElement('div');tick.className='elevation-tick';tick.style.top=`${(depth/maxDepth)*100}%`;tick.innerHTML=`<span>${(Number(point.ground_elevation)-depth).toFixed(1)} m</span>`;axis.appendChild(tick);}profile.appendChild(axis);}const legend=section.querySelector('.profile-legend');if(legend){legend.classList.add('profile-legend-overlay');profile.appendChild(legend);}};}
  function normalizeLabels(root=document){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>{if(n.nodeValue?.includes('發現浮油'))n.nodeValue=n.nodeValue.replaceAll('發現浮油','具有浮油');});}
  window.addEventListener('load',()=>{addMapOpacityControl();addMapEssentials();normalizeLabels();const target=document.getElementById('point-detail');if(target)new MutationObserver(()=>normalizeLabels(target)).observe(target,{childList:true,subtree:true,characterData:true});});
})();