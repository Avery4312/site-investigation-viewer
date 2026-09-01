// MW02 LNAPL / 浮油 Demo 擴充
// 此檔案在 app.js 後載入，覆寫監測井顯示函式；不影響既有土壤功能。

function getWellDemoData(well) {
    if (well.id !== "MW02") return well;

    return {
        ...well,
        well_depth: well.well_depth ?? 9.0,
        has_lnapl: true,
        lnapl_depth: well.lnapl_depth ?? 3.15,
        lnapl_thickness: well.lnapl_thickness ?? 0.25,
        lnapl_product: well.lnapl_product ?? "LNAPL",
        lnapl_note: well.lnapl_note ?? "井內發現浮油"
    };
}

showMonitoringWellDetail = function (rawWell) {
    const well = getWellDemoData(rawWell);
    showDetailPanel();

    document.getElementById("point-id").textContent = well.id;
    document.getElementById("point-type").textContent = well.type;

    const container = document.getElementById("sample-results");
    container.innerHTML = "";

    const waterElevation =
        typeof well.ground_elevation === "number" && typeof well.water_depth === "number"
            ? well.ground_elevation - well.water_depth
            : null;

    const lnaplElevation =
        well.has_lnapl && typeof well.ground_elevation === "number" && typeof well.lnapl_depth === "number"
            ? well.ground_elevation - well.lnapl_depth
            : null;

    const info = document.createElement("div");
    info.className = "well-info-grid";

    const item = (label, value, extraClass = "") => `
        <div class="well-info-item ${extraClass}">
            <span class="well-info-label">${label}</span>
            <strong>${value}</strong>
        </div>`;

    let infoHtml = "";
    infoHtml += item("地表高程", well.ground_elevation !== undefined ? `EL. ${Number(well.ground_elevation).toFixed(2)} m` : "—");
    infoHtml += item("井深", well.well_depth !== undefined ? `${Number(well.well_depth).toFixed(2)} m` : "—");
    infoHtml += item("地下水位深度", well.water_depth !== undefined ? `${Number(well.water_depth).toFixed(2)} m` : "—");
    infoHtml += item("地下水位高程", waterElevation !== null ? `EL. ${waterElevation.toFixed(2)} m` : "—");
    infoHtml += item("篩管深度", well.screen_from !== undefined && well.screen_to !== undefined ? `${formatDepth(well.screen_from)}–${formatDepth(well.screen_to)} m` : "—");
    infoHtml += item("浮油狀態", well.has_lnapl ? "● 發現浮油" : "未發現", well.has_lnapl ? "lnapl-info-item" : "");

    if (well.has_lnapl) {
        infoHtml += item("浮油面深度", `${Number(well.lnapl_depth).toFixed(2)} m`, "lnapl-info-item");
        infoHtml += item("浮油面高程", lnaplElevation !== null ? `EL. ${lnaplElevation.toFixed(2)} m` : "—", "lnapl-info-item");
        infoHtml += item("表觀浮油厚度", `${Number(well.lnapl_thickness).toFixed(2)} m`, "lnapl-info-item");
        infoHtml += item("浮油類型", well.lnapl_product || "LNAPL", "lnapl-info-item");
    }

    info.innerHTML = infoHtml;
    container.appendChild(info);

    const title = document.createElement("h3");
    title.className = "groundwater-result-title";
    title.textContent = "地下水分析結果";
    container.appendChild(title);

    const tableWrapper = document.createElement("div");
    tableWrapper.className = "table-wrapper";
    const table = document.createElement("table");
    table.className = "result-table groundwater-result-table";
    table.innerHTML = `
        <thead><tr><th>分析項目</th><th>檢測結果</th><th>單位</th></tr></thead>
        <tbody></tbody>`;

    const tbody = table.querySelector("tbody");
    Object.entries(well.results || {}).forEach(([name, result]) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${name}</td><td>${typeof result.value === "number" ? result.value.toLocaleString() : result.value}</td><td>${result.unit}</td>`;
        tbody.appendChild(row);
    });

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
    createMonitoringWellProfile(well, container);
};

createMonitoringWellProfile = function (rawWell, container) {
    const well = getWellDemoData(rawWell);
    const section = document.createElement("section");
    section.className = "well-profile-section";

    const title = document.createElement("h3");
    title.textContent = "監測井垂直構造";
    section.appendChild(title);

    const wellDepth = Number(well.well_depth ?? well.screen_to ?? 10);
    const maxDepth = wellDepth + 0.5;
    const pixelsPerMeter = 55;

    const profile = document.createElement("div");
    profile.className = "well-profile";
    profile.style.height = `${maxDepth * pixelsPerMeter}px`;

    for (let depth = 0; depth <= Math.ceil(wellDepth); depth += 1) {
        const line = document.createElement("div");
        line.className = "well-depth-line";
        line.style.top = `${depth * pixelsPerMeter}px`;
        line.innerHTML = `<span>${depth} m</span>`;
        profile.appendChild(line);
    }

    const casing = document.createElement("div");
    casing.className = "well-casing";
    casing.style.height = `${wellDepth * pixelsPerMeter}px`;
    profile.appendChild(casing);

    if (well.screen_from !== undefined && well.screen_to !== undefined) {
        const screen = document.createElement("div");
        screen.className = "well-screen";
        screen.style.top = `${Number(well.screen_from) * pixelsPerMeter}px`;
        screen.style.height = `${(Number(well.screen_to) - Number(well.screen_from)) * pixelsPerMeter}px`;
        screen.innerHTML = `<span>篩管 ${formatDepth(well.screen_from)}–${formatDepth(well.screen_to)} m</span>`;
        profile.appendChild(screen);
    }

    if (well.water_depth !== undefined) {
        const water = document.createElement("div");
        water.className = "groundwater-level";
        water.style.top = `${Number(well.water_depth) * pixelsPerMeter}px`;
        water.innerHTML = `<span>地下水位 ${Number(well.water_depth).toFixed(2)} m</span>`;
        profile.appendChild(water);
    }

    if (well.has_lnapl && well.lnapl_depth !== undefined) {
        const thickness = Number(well.lnapl_thickness ?? 0);
        const lnapl = document.createElement("div");
        lnapl.className = "lnapl-layer";
        lnapl.style.top = `${Number(well.lnapl_depth) * pixelsPerMeter}px`;
        lnapl.style.height = `${Math.max(thickness * pixelsPerMeter, 12)}px`;
        lnapl.innerHTML = `
            <div class="lnapl-icon" title="浮油 / LNAPL">◆</div>
            <span class="lnapl-label">浮油（LNAPL） <strong>${thickness.toFixed(2)} m</strong></span>`;
        profile.appendChild(lnapl);
    }

    const bottom = document.createElement("div");
    bottom.className = "well-bottom";
    bottom.style.top = `${wellDepth * pixelsPerMeter}px`;
    bottom.innerHTML = `<span>井底 ${wellDepth.toFixed(2)} m</span>`;
    profile.appendChild(bottom);

    section.appendChild(profile);
    container.appendChild(section);
};