// ==UserScript==
// @name         LP357+
// @version      2.1.1
// @author       cuberut
// @description  Wspomaganie głosowania LP357
// @match        https://radio357.pl/lista-piosenek/*
// @updateURL    https://raw.githubusercontent.com/cuberut/lp357plus/main/lp357plus.js
// @downloadURL  https://raw.githubusercontent.com/cuberut/lp357plus/main/lp357plus.js
// @require      https://cdn.jsdelivr.net/chartist.js/latest/chartist.min.js
// @resource     REMOTE_CSS https://cdn.jsdelivr.net/chartist.js/latest/chartist.min.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==

const myCss = GM_getResourceText("REMOTE_CSS");

GM_addStyle(myCss);
GM_addStyle("div.ct-chart g.ct-grids line[y1='330'] { stroke-dasharray: 8; stroke-width: 2; }");
GM_addStyle("div.ct-chart g.ct-series-a .ct-line { stroke: #f95f1f }");
GM_addStyle("div.ct-chart g.ct-series-a .ct-point { stroke: #f95f1f; fill: #f95f1f; }");
GM_addStyle("div.tagLog { position: absolute; bottom: 0; right: 15px; text-align: right; font-size: 12px; }");

GM_addStyle(`
    #infoBox { position: sticky; top: 150px; z-index: 100; background: #ffffff; }
    #extraTools { margin-top: 15px; }
    #checkboxes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; }
    #checkboxes label { width: 100%; margin-left: 0; }
    #checkboxes .content { margin-left: 30px; line-height: 1.2; display: inline-block; }
    #infoVisible { display: inline-block; text-align: right; width: 30px; }
    .averageSeniority { display: inline-block !important; }
    #averageSeniority { display: inline-block !important; width: 30px; text-align: right; }
    #removedList { font-family: monospace; white-space: pre-line; font-size: 12px; text-align: left; }
`);

//-----------------------------------------------

const SUPABASE_CONFIG = {
    PROJECT_ID: 'nsihmtsjdhzaxxjkscvu',
    ANON_KEY: 'sb_publishable_5LtXM7jXtz90avCvWyZrGw_gJchJoXt',
    get BASE_URL() { return `https://${this.PROJECT_ID}.supabase.co/rest/v1`; },
    get options() {
        return {
            method: 'GET',
            headers: {
                'apikey': this.ANON_KEY,
                'Content-Type': 'application/json'
            }
        };
    }
};

const urlSettingsList = `${SUPABASE_CONFIG.BASE_URL}/mv_proposals_active`;
const urlRemovedList = `${SUPABASE_CONFIG.BASE_URL}/mv_proposals_removed`;
const urlActiveList = 'https://static.radio357.pl/api/content/v1/charts/lista/active';

const getList = async (url, extend) => {
    const responseStats = await fetch(url, SUPABASE_CONFIG.options);
    const dataStats = await responseStats.json();

    if (extend) {
        const responseRadio = await fetch(urlActiveList);
        const dataRadio = await responseRadio.json();
        const uuidDict = Object.fromEntries(
            dataRadio.items.map(item => [item.externalId, item.uuid])
        );

        return dataStats.map(item => ({
            ...item,
            id: uuidDict[item.track_id] || null
        }));
    }
    return dataStats;
}

//-----------------------------------------------

const setInfoStatus = (amount) => `<p id="infoStatus">Liczba widocznych utworów: <strong><span id="infoVisible">${amount}</span>/<span>${amount}</span></strong> (<span id="infoPercent">100</span>%)</p>`;

const setCheckIsNew = (amount) => `<label class="lp-checkbox-label" for="onlyIsNew"><input type="checkbox" id="onlyIsNew" class="custom-check custom-checkbox lp-checkbox" ${amount || 'disabled'} /><span class="lp-checkbox-custom"></span><span class='content'>Pokaż tylko nowości - ${amount} pozycji</span></label>`;
const setCheckAwait = (amount) => `<label class="lp-checkbox-label" for="onlyAwait"><input type="checkbox" id="onlyAwait" class="custom-check custom-checkbox lp-checkbox" ${amount || 'disabled'} /><span class="lp-checkbox-custom"></span><span class='content'>Pokaż tylko oczekujące - ${amount} pozycji</span></label>`;
const setCheckBet = (amount) => `<label class="lp-checkbox-label" for="hideBet"><input type="checkbox" id="hideBet" class="custom-check custom-checkbox lp-checkbox" ${amount || 'disabled'} /><span class="lp-checkbox-custom"></span><span class='content'>Ukryj beton (<i title="Dotyczy uworów zestawienia ze stażem dłuższym niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label>`;
const setCheckOld = (amount) => `<label class="lp-checkbox-label" for="hideOld"><input type="checkbox" id="hideOld" class="custom-check custom-checkbox lp-checkbox" ${amount || 'disabled'} /><span class="lp-checkbox-custom"></span><span class='content'>Ukryj starocie (<i title="Dotyczy uworów spoza zestawienia ze stażem dłuższym niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label>`;

const getTagChartLog = (last_position, last_change, times, weeks) => {
    const ranksPart = last_position ? `<span>ostatnia poz.: ${last_position}` + (last_change ? ` (${last_change})` : '') + '</span>' : '';
    const timesPart = times ? `<span>notowanie: ${times} tydzień</span>` : '';
    return `<div class="chart-item__info tagLog">${ranksPart}<br/>${timesPart}</div>`;
};

const getTagVotes = (item) => `<div id="votes"><i class="${item.last ? 'fas' : 'far'} fa-star"></i><div class="small">(${item.count})</div></div>`;

//-----------------------------------------------

let extraTools, historyCharts, amountAll, infoVisible, infoPercent;
let mainList, itemDict;
let listIsNew, listAwait, listBet, listOld;
let dicWeeks = {};

const setWebsite = () => {
    const bannerHero = document.querySelector('#active_last_24hrs');
    if (bannerHero) {
        bannerHero.style.height = '25vh';
        bannerHero.querySelector('.lp-logo-container')?.remove();
    }

    const leftColumn = document.querySelector('.lp-left');
    if (!leftColumn || document.getElementById('extraTools')) return;

    leftColumn.querySelector('.lp-left-inner')?.classList.remove('h-100');

    leftColumn.insertAdjacentHTML('beforeend', `
        <div id="infoBox">
          <div id="extraTools"></div>
          <div id="historyCharts"></div>
        </div>
    `);

    extraTools = leftColumn.querySelector('#extraTools');
    historyCharts = leftColumn.querySelector('#historyCharts');
}

const addInfoStatus = () => {
    amountAll = mainList.length;
    extraTools.insertAdjacentHTML('beforeend', setInfoStatus(amountAll));

    infoVisible = extraTools.querySelector('#infoVisible');
    infoPercent = extraTools.querySelector('#infoPercent');
}

const changeInfoStatus = () => {
    const amountVisible = document.querySelectorAll('.vote_patron ul.lp-song-list .lp-song-item:not([hidden])').length;
    infoVisible.textContent = amountVisible;
    infoPercent.textContent = amountVisible === amountAll ? 100 : amountVisible === 0 ? 0 : Math.round(amountVisible / amountAll * 100);
}

//-----------------------------------------------

const setCheckboxOnly = (element, rest, dictSet) => {
    element.addEventListener('change', (e) => {
        const checked = e.target.checked;
        Object.keys(itemDict).forEach(id => {
            itemDict[id].hidden = !dictSet.has(id) && checked;
        });
        rest.forEach(chk => { chk.checked = false });
        changeInfoStatus();
    });
}

const setCheckboxHide = (element, rest, list, others) => {
    element.addEventListener('change', (e) => {
        const checked = e.target.checked;
        const otherChecked = others.some(chk => chk.checked);

        if (checked && !otherChecked) {
            mainList.forEach(item => { item.hidden = false });
        }

        list.forEach(id => {
            if (itemDict[id]) itemDict[id].hidden = checked;
        });
        rest.forEach(chk => { chk.checked = false });

        changeInfoStatus();
    });
}

const addCheckboxes = () => {
    const fragment = document.createDocumentFragment();
    const checkboxesEl = document.createElement('p');
    checkboxesEl.id = 'checkboxes';

    checkboxesEl.innerHTML =
        setCheckIsNew(listIsNew.length) +
        setCheckBet(listBet.length) +
        setCheckAwait(listAwait.length) +
        setCheckOld(listOld.length);

    fragment.appendChild(checkboxesEl);
    extraTools.appendChild(fragment);

    const onlyIsNew = checkboxesEl.querySelector("#onlyIsNew");
    const hideBet = checkboxesEl.querySelector("#hideBet");
    const onlyAwait = checkboxesEl.querySelector("#onlyAwait");
    const hideOld = checkboxesEl.querySelector("#hideOld");

    const setIsNew = new Set(listIsNew);
    const setAwait = new Set(listAwait);

    setCheckboxOnly(onlyIsNew, [onlyAwait, hideBet, hideOld], setIsNew);
    setCheckboxOnly(onlyAwait, [onlyIsNew, hideBet, hideOld], setAwait);

    setCheckboxHide(hideBet, [onlyIsNew, onlyAwait], listBet, [hideOld]);
    setCheckboxHide(hideOld, [onlyIsNew, onlyAwait], listOld, [hideBet]);
}

//-----------------------------------------------

const addTags = (listNo, setList) => {
    const voteList = document.querySelector('.vote_patron');
    if (!voteList) return;

    mainList = Array.from(voteList.querySelectorAll("li.lp-song-item"));
    itemDict = {};
    dicWeeks = {};

    mainList.forEach(songItem => {
        const button = songItem.querySelector("button");
        if (button) itemDict[button.getAttribute('data-r357api-id')] = songItem;
    });

    listIsNew = [];
    listAwait = [];
    listBet = [];
    listOld = [];

    setList.forEach(item => {
        const { id, track_id, last_position, last_change, times, weeks, votes, history } = item;
        const songItem = itemDict[id];

        if (!songItem) return;

        dicWeeks[id] = weeks || 0;

        const songDetails = songItem.querySelector('div.lp-song-details');
        if (songDetails) songDetails.style.position = 'relative';

        const metaData = songItem.querySelector('span.top-vote-panel__meta');

        if (metaData) {
            metaData.insertAdjacentHTML('beforeend', getTagChartLog(last_position, last_change, times, weeks));
        }

        const historyParts = history.split(",");
        const showHistory = historyParts.some(val => val.trim() !== '');

        if (showHistory) {
            historyCharts.insertAdjacentHTML('afterbegin', `<div id="chart-${track_id}" class="ct-chart" hidden></div>`);
            const chart = historyCharts.querySelector(`#chart-${track_id}`);

            songItem.addEventListener('mouseenter', () => { chart.hidden = false });
            songItem.addEventListener('mouseleave', () => { chart.hidden = true });

            const labels = Array.from({length: 10}, (_, x) => x + listNo - 10);
            const series = historyParts.map(val => -val || null);

            new window.Chartist.Line(chart, {
                labels: labels,
                series: [ series ]
            }, {
                height: '500px',
                width: '700px',
                fullWidth: false,
                fillHoles: false,
                axisY: {
                    low: -50,
                    high: -1,
                    onlyInteger: true,
                    labelInterpolationFnc: value => -value
                }
            });
        }

        if (votes && metaData) {
            metaData.insertAdjacentHTML('beforeend', getTagVotes(votes));
            if (votes.last) {
                metaData.querySelector('input')?.click();
            }
        }

        if (weeks === 1) listIsNew.push(id);
        if (last_position > 35) listAwait.push(id);
        if (item.is_veteran) listBet.push(id);
        if (item.is_stale) listOld.push(id);
    });

    addInfoStatus();
    addCheckboxes();
}

//-----------------------------------------------

const addAverageSeniority = (votePatron) => {
    const voteCounter = votePatron.querySelector('.lpWrapper div[data-r357api-role="count"]');
    if (!voteCounter) return;

    voteCounter.insertAdjacentHTML('afterend', `
        <div class="averageSeniority">
            <span>Średni staż:</span>
            <strong id="averageSeniority">-</strong>
            <span>tyg.</span>
        </div>
    `);

    const averageSeniorityEl = votePatron.querySelector('#averageSeniority');

    const calculateAverage = () => {
        if (!itemDict || Object.keys(dicWeeks).length === 0) return;

        let sum = 0;
        let count = 0;

        Object.entries(itemDict).forEach(([id, item]) => {
            const input = item.querySelector('input');
            if (input && input.checked) {
                if (dicWeeks[id] !== undefined) {
                    sum += dicWeeks[id];
                    count++;
                }
            }
        });

        averageSeniorityEl.innerText = count > 0 ? (sum / count).toFixed(1) : '-';
    };

    calculateAverage();

    const observer = new MutationObserver(() => {
        calculateAverage();
    });

    observer.observe(voteCounter, { childList: true, characterData: true, subtree: true });
}

const addRemovedList = () => {
    const details = document.querySelector('[data-r357api-role="details-trigger"]');
    if (!details) return;

    details.addEventListener('click', async () => {
        try {
            const rmList = await getList(urlRemovedList, true);
            const modalInfo = document.querySelector('#r357api_modal .r357api_modal_window');

            if (!modalInfo || rmList.length === 0) return;

            const removedText = rmList.map(item => {
                const ws = String(item.weeks).padStart(2, '0');
                const lp = item.last_position ? `(${item.last_position})` : '';
                return `[${ws}] ${item.artist} - ${item.title} ${lp}`.trim();
            }).join('\n');

            modalInfo.insertAdjacentHTML('beforeend', `
                <div id="removedList">
                    <strong>Usunięto ${rmList.length} utworów:</strong>
                    <div class="removed-list-content"></div>
                </div>
            `);

            modalInfo.querySelector('#removedList .removed-list-content').textContent = removedText;

        } catch (error) {
            console.error("Błąd pobierania usuniętych utworów:", error);
        }
    }, { once: true });
};

//-----------------------------------------------

(function init() {
    getList(urlSettingsList, true).then(setList => {
        const checkForElement = () => {
            const votePatron = document.querySelector('.vote_patron');
            const heading = document.querySelector('[data-r357api-type="current-chart-no"]');

            if (!votePatron || !heading) {
                requestAnimationFrame(checkForElement);
                return;
            }

            const listNo = +heading.textContent.split('#')[1];

            setWebsite();
            addTags(listNo, setList);
            addAverageSeniority(votePatron);
            addRemovedList();
        };

        requestAnimationFrame(checkForElement);
    });
})();
