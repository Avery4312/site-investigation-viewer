// 專業化 UI：地圖控制、浮油單一標示、剖面深度／材質／污染深度／高程
(function(){
  function getBaseTileLayer(){let base=null;map.eachLayer(layer=>{if(layer instanceof L.TileLayer&&!base)base=layer;});return base;}

  function addMapOpacityControl(){
    const base=getBaseTileLayer();if(!base)return;
    const opacity=L.control({position:'topright'});
    opacity.onAdd=function(){
      const div=L.DomUtil.create('div','map-opacity-control');
      div.innerHTML='<div class="map-opacity-title">底圖透明度 <strong>100%</strong></div><input type="range" min="20" max="100" step="5" value="100" aria-label="底圖透明度">';
      L.DomEvent.disableClickPropagation(div);L.DomEvent.disableScrollPropagation(div);
      const slider=div.querySelector('input'),value=div.querySelector('strong');
      slider.addEventListener('input',()=>{const n=Number(slider.value);base.setOpacity(n/100);value.textContent=n+'%';});
      return div;
    };
    opacity.addTo(map);
  }

  function addMapEssentials(){
    L.control.scale({position:'bottomright',metric:true,imperial:false,maxWidth:120}).addTo(map);
    const north=L.control({position:'topright'});north.onAdd=function(){const div=L.DomUtil.create('div','north-arrow');div.innerHTML='<div class="north-n">N</div><div class="north-symbol">▲</div>';return div;};north.addTo(map);
  }

  function consolidateLnaplMarkers(){const layers=[];map.eachLayer(layer=>layers.push(layer));let mw02Marker=null;layers.forEach(layer=>{if(!(layer instanceof L.Marker))return;const el=layer.getElement?.();if(el?.classList?.contains('lnapl-map-marker')){map.removeLayer(layer);return;}const tooltip=layer.getTooltip?.();if(tooltip&&String(tooltip.getContent()).trim()==='MW02')mw02Marker=layer;});if(mw02Marker){mw02Marker.setIcon(L.divIcon({className:'lnapl-map-marker',html:'<div class="lnapl-map-icon replacement" title="MW02 具有浮油">◆</div>',iconSize:[28,28],iconAnchor:[14,14],tooltipAnchor:[0,-16]}));mw02Marker.bindTooltip('MW02',{permanent:true,direction:'top',className:'mw-tooltip'});}}

  const originalBorehole=window.createBoreholeProfile;
  if(typeof originalBorehole==='function'){
    window.createBoreholeProfile=function(point,container,standards){
      originalBorehole(point,container,standards);
      const sections=container.querySelectorAll('.borehole-section'),section=sections[sections.length-1];if(!section)return;
      const profile=section.querySelector('.borehole-profile');if(!profile||typeof point.ground_elevation!=='number')return;
      profile.classList.add('professional-profile');
      const maxDepth=Math.max(...(point.geology||[]).map(x=>Number(x.to)||0),...(point.samples||[]).map(x=>Number(x.depth_to)||0));if(!isFinite(maxDepth)||maxDepth<=0)return;
      const axis=document.createElement('div');axis.className='elevation-axis';
      for(let depth=0;depth<=maxDepth+0.001;depth+=0.5){const tick=document.createElement('div');tick.className='elevation-tick';tick.style.top=`${(depth/maxDepth)*100}%`;const el=Number(point.ground_elevation)-depth;tick.innerHTML=`<span>${el.toFixed(2)}</span>`;axis.appendChild(tick);}
      profile.appendChild(axis);
    };
  }

  function normalizeLabels(root=document){root.querySelectorAll('.map-legend-title').forEach(el=>el.textContent='圖例');const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>{if(n.nodeValue?.includes('發現浮油'))n.nodeValue=n.nodeValue.replaceAll('發現浮油','具有浮油');});}

  window.addEventListener('load',()=>{addMapOpacityControl();addMapEssentials();setTimeout(()=>{consolidateLnaplMarkers();normalizeLabels();},100);const target=document.getElementById('point-detail');if(target)new MutationObserver(()=>normalizeLabels(target)).observe(target,{childList:true,subtree:true,characterData:true});});
})();
