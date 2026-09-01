// ============================================================
// 環境場址調查成果平台 Demo v1
// ============================================================


// ============================================================
// 1. 建立 Leaflet 地圖
// ============================================================

const map = L.map("map").setView(
    [25.0330, 121.5654],
    16
);


// ============================================================
// 2. 加入 OpenStreetMap
// ============================================================

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 20,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);


// ============================================================
// 3. 建立地下水監測井圖示
// ============================================================

const monitoringWellIcon = L.divIcon({

    className: "monitoring-well-marker",

    html: `
        <div class="mw-symbol">
            <div class="mw-inner"></div>
        </div>
    `,

    iconSize: [24, 24],

    iconAnchor: [12, 12],

    tooltipAnchor: [0, -14]

});


// ============================================================
// 4. 讀取調查資料
// ============================================================

fetch("data/samples.json")

    .then(response => {

        if (!response.ok) {

            throw new Error(
                "無法讀取 samples.json"
            );

        }

        return response.json();

    })

    .then(data => {

        // ----------------------------------------------------
        // 顯示場址名稱
        // ----------------------------------------------------

        document
            .getElementById("site-description")
            .textContent =
            `${data.site.name}｜${data.site.project}`;


        // 用來自動縮放地圖
        const allCoordinates = [];


        // ====================================================
        // 5. 建立土壤調查點 S01～S05
        // ====================================================

        data.sampling_points.forEach(point => {

            const coordinate = [
                point.latitude,
                point.longitude
            ];


            allCoordinates.push(
                coordinate
            );


            const marker =
                L.marker(coordinate)
                    .addTo(map);


            // 平面只顯示 S01、S02...
            marker.bindTooltip(

                point.id,

                {
                    permanent: true,
                    direction: "top"
                }

            );


            // 點擊後顯示土壤資料
            marker.on(
                "click",
                () => {

                    showSoilPointDetail(
                        point
                    );

                }
            );

        });


        // ====================================================
        // 6. 建立地下水監測井 MW01～MW03
        // ====================================================

        if (data.monitoring_wells) {

            data.monitoring_wells.forEach(well => {

                const coordinate = [
                    well.latitude,
                    well.longitude
                ];


                allCoordinates.push(
                    coordinate
                );


                const marker =
                    L.marker(
                        coordinate,
                        {
                            icon: monitoringWellIcon
                        }
                    )
                    .addTo(map);


                marker.bindTooltip(

                    well.id,

                    {
                        permanent: true,
                        direction: "top",
                        className: "mw-tooltip"
                    }

                );


                // 點擊監測井
                marker.on(
                    "click",
                    () => {

                        showMonitoringWellDetail(
                            well
                        );

                    }
                );

            });

        }


        // ====================================================
        // 7. 自動調整地圖範圍
        // ====================================================

        if (allCoordinates.length > 0) {

            map.fitBounds(
                allCoordinates,
                {
                    padding: [50, 50],
                    maxZoom: 18
                }
            );

        }

    })

    .catch(error => {

        console.error(
            "讀取調查資料失敗：",
            error
        );

    });


// ============================================================
// 8. 顯示土壤調查點資料
// ============================================================

function showSoilPointDetail(point) {

    showDetailPanel();


    // --------------------------------------------------------
    // 基本資料
    // --------------------------------------------------------

    document
        .getElementById("point-id")
        .textContent =
        point.id;


    document
        .getElementById("point-type")
        .textContent =
        `${point.type}｜地表高程 EL. ${point.ground_elevation ?? "—"} m`;


    const container =
        document.getElementById(
            "sample-results"
        );


    container.innerHTML = "";


    // --------------------------------------------------------
    // 台灣土壤污染管制標準
    // mg/kg（乾基）
    // --------------------------------------------------------

    const standards = {

        "TPH": 1000,

        "苯": 5,

        "甲苯": 500,

        "TCE": 60

    };


    // --------------------------------------------------------
    // 取得所有分析項目
    // --------------------------------------------------------

    const analytes = [];


    point.samples.forEach(sample => {

        Object
            .keys(sample.results)
            .forEach(name => {

                if (
                    !analytes.includes(name)
                ) {

                    analytes.push(name);

                }

            });

    });


    // --------------------------------------------------------
    // 標題
    // --------------------------------------------------------

    const title =
        document.createElement("h3");


    title.textContent =
        "土壤分析結果（mg/kg）";


    container.appendChild(
        title
    );


    // --------------------------------------------------------
    // 大型分析表
    // --------------------------------------------------------

    const tableWrapper =
        document.createElement("div");


    tableWrapper.className =
        "table-wrapper";


    const table =
        document.createElement("table");


    table.className =
        "result-table large-result-table";


    // --------------------------------------------------------
    // 表頭
    // --------------------------------------------------------

    const thead =
        document.createElement("thead");


    const headerRow =
        document.createElement("tr");


    headerRow.innerHTML =
        `<th>樣品編號</th>` +

        analytes
            .map(
                name =>
                    `<th>${name}</th>`
            )
            .join("");


    thead.appendChild(
        headerRow
    );


    // --------------------------------------------------------
    // 管制標準列
    // --------------------------------------------------------

    const standardRow =
        document.createElement("tr");


    standardRow.className =
        "standard-row";


    standardRow.innerHTML =
        `<th>土壤污染<br>管制標準</th>` +

        analytes
            .map(name => {

                const standard =
                    standards[name];


                return `
                    <th>
                        ${
                            standard !== undefined
                                ? standard.toLocaleString()
                                : "—"
                        }
                    </th>
                `;

            })
            .join("");


    thead.appendChild(
        standardRow
    );


    table.appendChild(
        thead
    );


    // --------------------------------------------------------
    // 樣品資料
    // --------------------------------------------------------

    const tbody =
        document.createElement("tbody");


    point.samples.forEach(sample => {

        const row =
            document.createElement("tr");


        const sampleName =
            `${point.id}(${formatDepth(sample.depth_from)}–${formatDepth(sample.depth_to)})`;


        let html = `
            <td class="depth-cell">
                ${sampleName}
            </td>
        `;


        analytes.forEach(name => {

            const result =
                sample.results[name];


            if (!result) {

                html += `
                    <td class="no-data">
                        —
                    </td>
                `;

                return;

            }


            const value =
                result.value;


            const standard =
                standards[name];


            const exceed =

                standard !== undefined &&

                typeof value === "number" &&

                value > standard;


            if (exceed) {

                const ratio =
                    value / standard;


                html += `
                    <td class="exceed">

                        <strong>
                            ${value.toLocaleString()}
                        </strong>

                        <div class="exceed-label">
                            超標 ${ratio.toFixed(1)} 倍
                        </div>

                    </td>
                `;

            }

            else {

                html += `
                    <td>

                        ${
                            typeof value === "number"
                                ? value.toLocaleString()
                                : value
                        }

                    </td>
                `;

            }

        });


        row.innerHTML =
            html;


        tbody.appendChild(
            row
        );

    });


    table.appendChild(
        tbody
    );


    tableWrapper.appendChild(
        table
    );


    container.appendChild(
        tableWrapper
    );


    // --------------------------------------------------------
    // 表格說明
    // --------------------------------------------------------

    const note =
        document.createElement("div");


    note.className =
        "result-note";


    note.innerHTML = `

        <span class="exceed-example">
            超過管制標準
        </span>

        <span>
            數值單位：mg/kg（乾基）
        </span>

    `;


    container.appendChild(
        note
    );


    // --------------------------------------------------------
    // 垂直調查剖面
    // --------------------------------------------------------

    createBoreholeProfile(
        point,
        container,
        standards
    );

}


// ============================================================
// 9. 顯示地下水監測井資料
// ============================================================

function showMonitoringWellDetail(well) {

    showDetailPanel();


    // --------------------------------------------------------
    // 標題
    // --------------------------------------------------------

    document
        .getElementById("point-id")
        .textContent =
        well.id;


    document
        .getElementById("point-type")
        .textContent =
        well.type;


    const container =
        document.getElementById(
            "sample-results"
        );


    container.innerHTML = "";


    // --------------------------------------------------------
    // 計算地下水位高程
    //
    // 地下水位高程 =
    // 地表高程 - 地下水位深度
    // --------------------------------------------------------

    const waterElevation =

        typeof well.ground_elevation === "number" &&

        typeof well.water_depth === "number"

            ? well.ground_elevation -
              well.water_depth

            : null;


    // --------------------------------------------------------
    // 監測井基本資料
    // --------------------------------------------------------

    const info =
        document.createElement("div");


    info.className =
        "well-info-grid";


    info.innerHTML = `

        <div class="well-info-item">

            <span class="well-info-label">
                地表高程
            </span>

            <strong>
                ${
                    well.ground_elevation !== undefined
                        ? `EL. ${well.ground_elevation.toFixed(2)} m`
                        : "—"
                }
            </strong>

        </div>


        <div class="well-info-item">

            <span class="well-info-label">
                地下水位深度
            </span>

            <strong>
                ${
                    well.water_depth !== undefined
                        ? `${well.water_depth.toFixed(2)} m`
                        : "—"
                }
            </strong>

        </div>


        <div class="well-info-item">

            <span class="well-info-label">
                地下水位高程
            </span>

            <strong>
                ${
                    waterElevation !== null
                        ? `EL. ${waterElevation.toFixed(2)} m`
                        : "—"
                }
            </strong>

        </div>


        <div class="well-info-item">

            <span class="well-info-label">
                篩管深度
            </span>

            <strong>
                ${
                    well.screen_from !== undefined &&
                    well.screen_to !== undefined

                        ? `${formatDepth(well.screen_from)}–${formatDepth(well.screen_to)} m`

                        : "—"
                }
            </strong>

        </div>

    `;


    container.appendChild(
        info
    );


    // --------------------------------------------------------
    // 地下水分析結果
    // --------------------------------------------------------

    const title =
        document.createElement("h3");


    title.className =
        "groundwater-result-title";


    title.textContent =
        "地下水分析結果";


    container.appendChild(
        title
    );


    const tableWrapper =
        document.createElement("div");


    tableWrapper.className =
        "table-wrapper";


    const table =
        document.createElement("table");


    table.className =
        "result-table groundwater-result-table";


    table.innerHTML = `

        <thead>

            <tr>
                <th>分析項目</th>
                <th>檢測結果</th>
                <th>單位</th>
            </tr>

        </thead>

        <tbody></tbody>

    `;


    const tbody =
        table.querySelector(
            "tbody"
        );


    Object
        .entries(well.results)
        .forEach(
            ([name, result]) => {

                const row =
                    document.createElement("tr");


                row.innerHTML = `

                    <td>
                        ${name}
                    </td>

                    <td>
                        ${
                            typeof result.value === "number"
                                ? result.value.toLocaleString()
                                : result.value
                        }
                    </td>

                    <td>
                        ${result.unit}
                    </td>

                `;


                tbody.appendChild(
                    row
                );

            }
        );


    tableWrapper.appendChild(
        table
    );


    container.appendChild(
        tableWrapper
    );


    // --------------------------------------------------------
    // 監測井垂直構造
    // --------------------------------------------------------

    createMonitoringWellProfile(
        well,
        container
    );

}


// ============================================================
// 10. 建立土壤垂直調查剖面
// ============================================================

function createBoreholeProfile(
    point,
    container,
    standards
) {

    const section =
        document.createElement(
            "section"
        );


    section.className =
        "borehole-section";


    const title =
        document.createElement("h3");


    title.textContent =
        "垂直調查剖面";


    section.appendChild(
        title
    );


    // --------------------------------------------------------
    // 最大深度
    // --------------------------------------------------------

    const sampleMaxDepth =
        Math.max(
            ...point.samples.map(
                sample =>
                    Number(
                        sample.depth_to
                    )
            )
        );


    const geologyMaxDepth =

        point.geology &&
        point.geology.length > 0

            ? Math.max(
                ...point.geology.map(
                    layer =>
                        Number(
                            layer.to
                        )
                )
            )

            : sampleMaxDepth;


    const maxDepth =
        Math.max(
            sampleMaxDepth,
            geologyMaxDepth
        );


    // 1 m = 100 px
    const pixelsPerMeter =
        100;


    const profileHeight =
        maxDepth *
        pixelsPerMeter;


    // --------------------------------------------------------
    // 剖面
    // --------------------------------------------------------

    const profile =
        document.createElement("div");


    profile.className =
        "borehole-profile";


    profile.style.height =
        `${profileHeight}px`;


    // --------------------------------------------------------
    // 深度刻度
    // --------------------------------------------------------

    const scale =
        document.createElement("div");


    scale.className =
        "depth-scale";


    for (
        let depth = 0;
        depth <= maxDepth;
        depth += 0.5
    ) {

        const tick =
            document.createElement("div");


        tick.className =
            "depth-tick";


        tick.style.top =
            `${
                depth *
                pixelsPerMeter
            }px`;


        tick.innerHTML = `
            <span>
                ${formatDepth(depth)} m
            </span>
        `;


        scale.appendChild(
            tick
        );

    }


    profile.appendChild(
        scale
    );


    // --------------------------------------------------------
    // 地層柱
    // --------------------------------------------------------

    const geologyColumn =
        document.createElement("div");


    geologyColumn.className =
        "geology-column";


    if (point.geology) {

        point.geology.forEach(
            layer => {

                const block =
                    document.createElement(
                        "div"
                    );


                block.className =
                    "geology-layer";


                block.style.top =
                    `${
                        layer.from *
                        pixelsPerMeter
                    }px`;


                block.style.height =
                    `${
                        (
                            layer.to -
                            layer.from
                        ) *
                        pixelsPerMeter
                    }px`;


                block.innerHTML = `

                    <span class="geology-name">
                        ${layer.material}
                    </span>

                    <span class="geology-depth">

                        ${formatDepth(layer.from)}
                        –
                        ${formatDepth(layer.to)} m

                    </span>

                `;


                geologyColumn.appendChild(
                    block
                );

            }
        );

    }


    profile.appendChild(
        geologyColumn
    );


    // --------------------------------------------------------
    // 採樣柱
    // --------------------------------------------------------

    const sampleColumn =
        document.createElement("div");


    sampleColumn.className =
        "sample-column";


    point.samples.forEach(
        sample => {

            const sampleBlock =
                document.createElement(
                    "div"
                );


            const sampleName =
                `${point.id}(${formatDepth(sample.depth_from)}–${formatDepth(sample.depth_to)})`;


            const top =
                sample.depth_from *
                pixelsPerMeter;


            const height =
                (
                    sample.depth_to -
                    sample.depth_from
                ) *
                pixelsPerMeter;


            sampleBlock.style.top =
                `${top}px`;


            sampleBlock.style.height =
                `${height}px`;


            // TPH
            const tph =
                sample.results["TPH"];


            let isExceed =
                false;


            if (
                tph &&
                typeof tph.value === "number" &&
                standards["TPH"] !== undefined
            ) {

                isExceed =
                    tph.value >
                    standards["TPH"];

            }


            sampleBlock.className =

                isExceed

                    ? "sample-depth-block sample-exceed"

                    : "sample-depth-block";


            sampleBlock.innerHTML = `

                <div class="sample-name">

                    ${sampleName}

                </div>


                <div class="sample-concentration">

                    ${
                        tph

                            ? `TPH ${tph.value.toLocaleString()} mg/kg`

                            : "TPH —"
                    }


                    ${
                        isExceed

                            ? `
                                <span class="profile-warning">
                                    超標
                                </span>
                              `

                            : ""
                    }

                </div>

            `;


            sampleColumn.appendChild(
                sampleBlock
            );

        }
    );


    profile.appendChild(
        sampleColumn
    );


    section.appendChild(
        profile
    );


    // --------------------------------------------------------
    // 圖例
    // --------------------------------------------------------

    const legend =
        document.createElement("div");


    legend.className =
        "profile-legend";


    legend.innerHTML = `

        <span>
            左側：地層
        </span>

        <span>
            右側：土壤採樣區間
        </span>

        <span class="profile-exceed-legend">
            TPH 超過土壤污染管制標準
        </span>

    `;


    section.appendChild(
        legend
    );


    container.appendChild(
        section
    );

}


// ============================================================
// 11. 建立地下水監測井垂直構造
// ============================================================

function createMonitoringWellProfile(
    well,
    container
) {

    const section =
        document.createElement(
            "section"
        );


    section.className =
        "well-profile-section";


    const title =
        document.createElement("h3");


    title.textContent =
        "監測井垂直構造";


    section.appendChild(
        title
    );


    // --------------------------------------------------------
    // 最大顯示深度
    // --------------------------------------------------------

    const maxDepth =
        Math.ceil(
            Math.max(
                well.screen_to || 0,
                well.water_depth || 0
            ) + 1
        );


    const pixelsPerMeter =
        55;


    const profileHeight =
        maxDepth *
        pixelsPerMeter;


    const profile =
        document.createElement("div");


    profile.className =
        "well-profile";


    profile.style.height =
        `${profileHeight}px`;


    // --------------------------------------------------------
    // 深度刻度
    // --------------------------------------------------------

    for (
        let depth = 0;
        depth <= maxDepth;
        depth += 1
    ) {

        const line =
            document.createElement(
                "div"
            );


        line.className =
            "well-depth-line";


        line.style.top =
            `${
                depth *
                pixelsPerMeter
            }px`;


        line.innerHTML = `
            <span>
                ${depth} m
            </span>
        `;


        profile.appendChild(
            line
        );

    }


    // --------------------------------------------------------
    // 井管
    // --------------------------------------------------------

    const casing =
        document.createElement("div");


    casing.className =
        "well-casing";


    casing.style.height =
        `${
            maxDepth *
            pixelsPerMeter
        }px`;


    profile.appendChild(
        casing
    );


    // --------------------------------------------------------
    // 篩管
    // --------------------------------------------------------

    if (
        well.screen_from !== undefined &&
        well.screen_to !== undefined
    ) {

        const screen =
            document.createElement(
                "div"
            );


        screen.className =
            "well-screen";


        screen.style.top =
            `${
                well.screen_from *
                pixelsPerMeter
            }px`;


        screen.style.height =
            `${
                (
                    well.screen_to -
                    well.screen_from
                ) *
                pixelsPerMeter
            }px`;


        screen.innerHTML = `
            <span>
                篩管
                ${formatDepth(well.screen_from)}
                –
                ${formatDepth(well.screen_to)} m
            </span>
        `;


        profile.appendChild(
            screen
        );

    }


    // --------------------------------------------------------
    // 地下水位
    // --------------------------------------------------------

    if (
        well.water_depth !== undefined
    ) {

        const water =
            document.createElement(
                "div"
            );


        water.className =
            "groundwater-level";


        water.style.top =
            `${
                well.water_depth *
                pixelsPerMeter
            }px`;


        water.innerHTML = `
            <span>
                地下水位
                ${well.water_depth.toFixed(2)} m
            </span>
        `;


        profile.appendChild(
            water
        );

    }


    section.appendChild(
        profile
    );


    container.appendChild(
        section
    );

}


// ============================================================
// 12. 顯示右側資料面板
// ============================================================

function showDetailPanel() {

    document
        .getElementById(
            "empty-state"
        )
        .classList
        .add("hidden");


    document
        .getElementById(
            "point-detail"
        )
        .classList
        .remove("hidden");


    // 每次切換點位時，
    // 右側自動回到最上方
    document
        .querySelector(
            ".info-panel"
        )
        .scrollTop = 0;

}


// ============================================================
// 13. 深度格式
//
// 0   → 0
// 0.5 → 0.5
// 1   → 1.0
// 2   → 2.0
// ============================================================

function formatDepth(depth) {

    const number =
        Number(depth);


    if (
        Number.isInteger(number)
    ) {

        if (number === 0) {

            return "0";

        }


        return number.toFixed(1);

    }


    return number.toString();

}