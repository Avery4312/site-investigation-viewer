// Demo v2 擴充：MW02 LNAPL、右側分頁、點位狀態與歷時資料
// 在 app.js 後載入，不破壞既有土壤與監測井核心邏輯。

function getWellDemoData(well) {
    if (well.id !== "MW02") return well;
    return {
        ...well,
        well_depth: well.well_depth ?? 9.0,
        has_lnapl: true,
        lnapl_depth: well.lnapl_depth ?? 3.15,
        lnapl_thickness: well.lnapl_thickness ?? 0.25,
        lnapl_product: well.lnapl_product ?? "LNAPL",
        lnapl_note: well.lnapl_note ?? "井內發現浮油",
        history: well.history ?? [
            { date: "2026/03/03", water_depth: 3.42, lnapl_thickness: 0.51, tph: 2.6 },
            { date: "2026/03/23", water_depth: 3.38, lnapl_thickness: 0.60, tph: 2.4 },
            { date: "2026/03/24", water_depth: 3.31, lnapl_thickness: 0.02, tph: 2.0 },
            { date: "2026/05/15", water_depth: 3.26, lnapl_thickness: 0.18, tph: 1.9 },
            { date: "2026/07/08", water_depth: well.water_depth ?? 3.40, lnapl_thickness: 0.25, tph: 1.8 }
        ]
    };
}

function activateDetailTab(container, tabName) {
    container.querySelectorAll(".detail-tab").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    container.querySelectorAll(".detail-tab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.dataset.panel === tabName);
    });
}

function createTabbedShell(container, tabs) {
    container.innerHTML = "";
    const nav = document.createElement("div");
    nav.className = "detail-tabs";
    tabs.forEach((tab, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `detail-tab ${index === 0 ? "active" : ""}`;
        button.dataset.tab = tab.id;
        button.textContent = tab.label;
        button.addEventListener("click", () => activateDetailTab(container, tab.id));
        nav.appendChild(button);
    });
    container.appendChild(nav);

    const panels = {};
    tabs.forEach((tab, index) => {
        const panel = document.createElement("div");
        panel.className = `detail-tab-panel ${index === 0 ? "active" : ""}`;
        panel.dataset.panel = tab.id;
        container.appendChild(panel);
        panels[tab.id] = panel;
    });
    return panels;
}

function createHistoryView(well, container) {
    const history = well.history || [];
    if (!history.length) {
        container.innerHTML = `<div class="empty-tab-message">目前沒有歷次監測資料。</div>`;
        return;
    }
    const title = document.createElement("h3");
    title.textContent = "MW02 歷次水位與浮油變化";
    container.appendChild(title);
    const chart = document.createElement("div");
    chart.className = "history-chart";
    const maxThickness = Math.max(...history.map(d => Number(d.lnapl_thickness || 0)), 0.01);
    history.forEach(item => {
        const col = document.createElement("div");
        col.className = "history-column";
        const barHeight = Math.max((Number(item.lnapl_thickness || 0) / maxThickness) * 150, 4);
        col.innerHTML = `<div class="history-value">${Number(item.lnapl_thickness).toFixed(2)} m</div><div class="history-bar-wrap"><div class="history-bar" style="height:${barHeight}px"></div></div><div class="history-date">${item.date}</div>`;
        chart.appendChild(col);
    });
    container.appendChild(chart);
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrapper";
    const table = document.createElement("table");
    table.className = "result-table groundwater-result-table history-table";
    table.innerHTML = `<thead><tr><th>日期</th><th>地下水位深度 (m)</th><th>表觀浮油厚度 (m)</th><th>TPH (mg/L)</th></tr></thead><tbody>${history.map(item => `<tr><td>${item.date}</td><td>${Number(item.water_depth).toFixed(2)}</td><td class="${Number(item.lnapl_thickness) > 0 ? "history-lnapl-cell" : ""}">${Number(item.lnapl_thickness).toFixed(2)}</td><td>${Number(item.tph).toFixed(2)}</td></tr>`).join("")}</tbody>`;
    wrapper.appendChild(table);
    container.appendChild(wrapper);
    const note = document.createElement("p");
    note.className = "demo-note";
    note.textContent = "※ 本頁歷時資料為 Demo 假設值，用於展示監測趨勢介面。";
    container.appendChild(note);
}

showMonitoringWellDetail = function (rawWell) {
    const well = getWellDemoData(rawWell);
    showDetailPanel();
    document.getElementById("point-id").textContent = well.id;
    document.getElementById("point-type").textContent = well.type;
    const container = document.getElementById("sample-results");
    const tabs = [{ id:"overview",label:"概況" },{ id:"results",label:"分析結果" },{ id:"profile",label:"垂直剖面" },{ id:"history",label:"歷次資料" }];
    const panels = createTabbedShell(container, tabs);
    const waterElevation = typeof well.ground_elevation === "number" && typeof well.water_depth === "number" ? well.ground_elevation - well.water_depth : null;
    const lnaplElevation = well.has_lnapl && typeof well.ground_elevation === "number" && typeof well.lnapl_depth === "number" ? well.ground_elevation - well.lnapl_depth : null;
    const info = document.createElement("div");
    info.className = "well-info-grid";
    const item = (label,value,extraClass="") => `<div class="well-info-item ${extraClass}"><span class="well-info-label">${label}</span><strong>${value}</strong></div>`;
    let html="";
    html += item("地表高程", well.ground_elevation !== undefined ? `EL. ${Number(well.ground_elevation).toFixed(2)} m` : "—");
    html += item("井深", well.well_depth !== undefined ? `${Number(well.well_depth).toFixed(2)} m` : "—");
    html += item("地下水位深度", well.water_depth !== undefined ? `${Number(well.water_depth).toFixed(2)} m` : "—");
    html += item("地下水位高程", waterElevation !== null ? `EL. ${waterElevation.toFixed(2)} m` : "—");
    html += item("篩管深度", well.screen_from !== undefined && well.screen_to !== undefined ? `${formatDepth(well.screen_from)}–${formatDepth(well.screen_to)} m` : "—");
    html += item("浮油狀態", well.has_lnapl ? "● 發現浮油" : "未發現", well.has_lnapl ? "lnapl-info-item" : "");
    if (well.has_lnapl) {
        html += item("浮油面深度", `${Number(well.lnapl_depth).toFixed(2)} m`, "lnapl-info-item");
        html += item("浮油面高程", lnaplElevation !== null ? `EL. ${lnaplElevation.toFixed(2)} m` : "—", "lnapl-info-item");
        html += item("表觀浮油厚度", `${Number(well.lnapl_thickness).toFixed(2)} m`, "lnapl-info-item");
        html += item("浮油類型", well.lnapl_product || "LNAPL", "lnapl-info-item");
    }
    info.innerHTML=html;
    panels.overview.appendChild(info);
    if (well.has_lnapl) {
        const alert=document.createElement("div");
        alert.className="lnapl-alert";
        alert.innerHTML=`<span class="lnapl-alert-icon">◆</span><div><strong>井內發現浮油（LNAPL）</strong><br><span>${well.lnapl_note || ""}</span></div>`;
        panels.overview.appendChild(alert);
    }
    const resultTitle=document.createElement("h3");
    resultTitle.textContent="地下水分析結果";
    panels.results.appendChild(resultTitle);
    const tableWrapper=document.createElement("div");
    tableWrapper.className="table-wrapper";
    const table=document.createElement("table");
    table.className="result-table groundwater-result-table";
    table.innerHTML=`<thead><tr><th>分析項目</th><th>檢測結果</th><th>單位</th></tr></thead><tbody></tbody>`;
    const tbody=table.querySelector("tbody");
    Object.entries(well.results || {}).forEach(([name,result]) => {
        const row=document.createElement("tr");
        row.innerHTML=`<td>${name}</td><td>${typeof result.value === "number" ? result.value.toLocaleString() : result.value}</td><td>${result.unit}</td>`;
        tbody.appendChild(row);
    });
    tableWrapper.appendChild(table);
    panels.results.appendChild(tableWrapper);
    createMonitoringWellProfile(well, panels.profile);
    if (well.id === "MW02") createHistoryView(well, panels.history);
    else panels.history.innerHTML=`<div class="empty-tab-message">此 Demo 僅以 MW02 示範歷次監測資料。</div>`;
};

createMonitoringWellProfile = function (rawWell, container) {
    const well = getWellDemoData(rawWell);
    const section=document.createElement("section");
    section.className="well-profile-section compact-profile-section";
    const title=document.createElement("h3");
    title.textContent="監測井垂直構造";
    section.appendChild(title);
    const wellDepth=Number(well.well_depth ?? well.screen_to ?? 10);
    const maxDepth=wellDepth + 0.5;
    const pixelsPerMeter=55;
    const profile=document.createElement("div");
    profile.className="well-profile";
    profile.style.height=`${maxDepth * pixelsPerMeter}px`;
    for (let depth=0; depth<=Math.ceil(wellDepth); depth += 1) {
        const line=document.createElement("div");
        line.className="well-depth-line";
        line.style.top=`${depth * pixelsPerMeter}px`;
        line.innerHTML=`<span>${depth} m</span>`;
        profile.appendChild(line);
    }
    const casing=document.createElement("div");
    casing.className="well-casing";
    casing.style.height=`${wellDepth * pixelsPerMeter}px`;
    profile.appendChild(casing);
    if (well.screen_from !== undefined && well.screen_to !== undefined) {
        const screen=document.createElement("div");
        screen.className="well-screen";
        screen.style.top=`${Number(well.screen_from) * pixelsPerMeter}px`;
        screen.style.height=`${(Number(well.screen_to)-Number(well.screen_from))*pixelsPerMeter}px`;
        screen.innerHTML=`<span>篩管 ${formatDepth(well.screen_from)}–${formatDepth(well.screen_to)} m</span>`;
        profile.appendChild(screen);
    }
    if (well.water_depth !== undefined) {
        const water=document.createElement("div");
        water.className="groundwater-level";
        water.style.top=`${Number(well.water_depth)*pixelsPerMeter}px`;
        profile.appendChild(water);

        // Label is a sibling of the water line, so it is no longer constrained by
        // the line's width/position. CSS can now place it responsively inside profile.
        const waterLabel=document.createElement("div");
        waterLabel.className="groundwater-level-label";
        waterLabel.style.top=`${Number(well.water_depth)*pixelsPerMeter}px`;
        waterLabel.textContent=`地下水位 ${Number(well.water_depth).toFixed(2)} m`;
        profile.appendChild(waterLabel);
    }
    if (well.has_lnapl && well.lnapl_depth !== undefined) {
        const thickness=Number(well.lnapl_thickness ?? 0);
        const lnapl=document.createElement("div");
        lnapl.className="lnapl-layer";
        lnapl.style.top=`${Number(well.lnapl_depth)*pixelsPerMeter}px`;
        lnapl.style.height=`${Math.max(thickness*pixelsPerMeter,12)}px`;
        lnapl.innerHTML=`<div class="lnapl-icon" title="浮油 / LNAPL">◆</div><span class="lnapl-label">浮油（LNAPL） <strong>${thickness.toFixed(2)} m</strong></span>`;
        profile.appendChild(lnapl);
    }
    const bottom=document.createElement("div");
    bottom.className="well-bottom";
    bottom.style.top=`${wellDepth*pixelsPerMeter}px`;
    bottom.innerHTML=`<span>井底 ${wellDepth.toFixed(2)} m</span>`;
    profile.appendChild(bottom);
    section.appendChild(profile);
    container.appendChild(section);
};

window.addEventListener("load", () => {
    const legend=L.control({ position:"bottomleft" });
    legend.onAdd=function(){
        const div=L.DomUtil.create("div","map-status-legend");
        div.innerHTML=`<div class="map-legend-title">調查點圖例</div><div><span class="legend-symbol soil"></span>土壤調查點</div><div><span class="legend-symbol well"></span>地下水監測井</div><div><span class="legend-symbol oil">◆</span>發現浮油</div>`;
        return div;
    };
    legend.addTo(map);
    fetch("data/samples.json").then(r=>r.json()).then(data=>{
        const mw02=(data.monitoring_wells || []).find(w=>w.id === "MW02");
        if (!mw02) return;
        L.marker([mw02.latitude,mw02.longitude],{icon:L.divIcon({className:"lnapl-map-marker",html:`<div class="lnapl-map-icon" title="MW02 發現浮油">◆</div>`,iconSize:[18,18],iconAnchor:[-10,18]}),interactive:false}).addTo(map);
    });
});