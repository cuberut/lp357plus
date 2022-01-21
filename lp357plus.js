// ==UserScript==
// @name       LP357+
// @version    0.9.6
// @author     cuberut
// @include    https://lista.radio357.pl/app/lista/glosowanie
// @updateURL  https://raw.githubusercontent.com/cuberut/lp357plus/main/lp357plus.js
// @grant      GM_addStyle
// ==/UserScript==

GM_addStyle("div#loadbar { width: 100%; background-color: #ddd;}");
GM_addStyle("div#loading { width: 0%; height: 2rem; background-color: #337AB7; padding: 0.25rem 0.5rem; }");
GM_addStyle("div.tagNew { position: absolute; right: 0; margin-right: 100px; }");
GM_addStyle("div.tagLog { width: 110px; position: absolute; right: 0; margin-right: 60px; text-align: left; }");
GM_addStyle("div#filters > label { display: inline-block; width: 50%; }");

const urlSettingsList = 'https://opensheet.elk.sh/1toPeVyvsvh1QB-zpskh3zOxWl-OuSgKauyf7nPu85s8/settingsList';
const urlRemovedList = 'https://opensheet.elk.sh/1toPeVyvsvh1QB-zpskh3zOxWl-OuSgKauyf7nPu85s8/removedList'

const getList = async (url) => {
    const response = await fetch(url);
    const myJson = await response.json();
    return await myJson;
}

const getCheckNew = (amount) => `<label class="form-check-label"><input id="onlyNew" type="checkbox"><span>Pokaż tylko nowości - ${amount} pozycji</span></label>`;
const getCheckBet = (amount) => `<label class="form-check-label"><input id="hideBet" type="checkbox"><span>Ukryj beton (<i title="Dotyczy uworów z TOP35 oraz będących w zestawieniu dłuzej niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label>`;
const getCheckOld = (amount) => `<label class="form-check-label"><input id="hideOld" type="checkbox"><span>Ukryj starocie (<i title="Dotyczy uworów z poza zestawienia ze stażem dłuższym niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label>`;
const getCheckIsPL = (amount) => `<label class="form-check-label"><input id="onlyIsPL" type="checkbox"><span>Pokaż tylko naszych - ${amount} pozycji</span></label>`;
const getCheckNoPL = (amount) => `<label class="form-check-label"><input id="onlyNoPL" type="checkbox"><span>Pokaż tylko zagranice - ${amount} pozycji</span></label>`;

const tagNew = '<div class="badge badge-primary tagNew">Nowość!</div>';

const getTagChartLog = (lastP, change, times, weeks) => {
    return `<div class="chart-item__info tagLog"><span>ostatnia poz.: ${lastP} (${change})</span><br/><span>notowanie: ${times} tydzień</span><br/><span>propozycje: ${weeks} tydzień</span></div>`
};

const getTagRestLog = (weeks) => {
    return `<div class="chart-item__info tagLog"><span>propozycje: ${weeks} tydzień</span></div>`
};

const setCheckbox = (element, rest, list, isHide = false) => {
    element.onclick = (e) => {
        const checked = e.target.checked;
        currItem.forEach((item, i) => { item.hidden = (checked && list.includes(i) == isHide) });
        rest.forEach(x => { x.checked = false });
    }
}

const addCheckboxes = (listNew, listBet, listOld, listIsPL, listNoPL) => {
    voteList.insertAdjacentHTML('afterbegin', `<div id="filters"></div>`);
    const filters = voteList.querySelector("#filters");

    const checkNew = getCheckNew(listNew.length);
    filters.insertAdjacentHTML('beforeend', checkNew);
    const onlyNew = filters.querySelector("#onlyNew");

    const checkIsPL = getCheckIsPL(listIsPL.length);
    filters.insertAdjacentHTML('beforeend', checkIsPL);
    const onlyIsPL = filters.querySelector("#onlyIsPL");

    const checkBet = getCheckBet(listBet.length);
    filters.insertAdjacentHTML('beforeend', checkBet);
    const hideBet = filters.querySelector("#hideBet");

    const checkNoPL = getCheckNoPL(listNoPL.length);
    filters.insertAdjacentHTML('beforeend', checkNoPL);
    const onlyNoPL = filters.querySelector("#onlyNoPL");

    const checkOld = getCheckOld(listOld.length);
    filters.insertAdjacentHTML('beforeend', checkOld);
    const hideOld = filters.querySelector("#hideOld");

    setCheckbox(onlyNew, [hideBet, hideOld, onlyIsPL, onlyNoPL], listNew);
    setCheckbox(hideBet, [onlyNew, hideOld, onlyIsPL, onlyNoPL], listBet, true);
    setCheckbox(hideOld, [onlyNew, hideBet, onlyIsPL, onlyNoPL], listOld, true);

    setCheckbox(onlyIsPL, [onlyNew, hideBet, hideOld, onlyNoPL], listIsPL);
    setCheckbox(onlyNoPL, [onlyNew, hideBet, hideOld, onlyIsPL], listNoPL);
}

let voteList, currItem;

const addTags = (setList) => {
    voteList = document.querySelector('.vote-list')
    currItem = voteList.querySelectorAll(".list-group-item");

    setList.forEach((item, i) => {
        const {lastP, change, times, isNew, weeks} = item;
        if (isNew) {
            currItem[i].querySelector('.vote-item').insertAdjacentHTML('beforeend', tagNew);
        } else if (lastP) {
            const tagLog = getTagChartLog(lastP, change, times, weeks);
            currItem[i].querySelector('.vote-item').insertAdjacentHTML('beforeend', tagLog);
        } else {
            const tagLog = getTagRestLog(weeks);
            currItem[i].querySelector('.vote-item').insertAdjacentHTML('beforeend', tagLog);
        }
    });

    const listNew = setList.reduce((list, item, i) => item.isNew ? [...list, i] : list, []);
    const listBet = setList.reduce((list, item, i) => item.isBet ? [...list, i] : list, []);
    const listOld = setList.reduce((list, item, i) => item.isOld ? [...list, i] : list, []);

    const listIsPL = setList.reduce((list, item, i) => item.isPL ? [...list, i] : list, []);
    const listNoPL = setList.reduce((list, item, i) => !item.isPL ? [...list, i] : list, []);

    addCheckboxes(listNew, listBet, listOld, listIsPL, listNoPL);
}

const showScroll = (state) => { document.body.style.overflow = state ? 'auto' : 'hidden' }
const toggleVisibility = (element) => { element.style.opacity = (element.style.opacity === '') ? 0 : '' }

const setSearch = (voteList, items) => {
    const searchSection = voteList.querySelector('.vote-list__search');

    if (!searchSection) return;

    searchSection.querySelector('#search').hidden = true;
    searchSection.insertAdjacentHTML('afterbegin', `<input id="searchCustom" name="search" type="text" placeholder="Filtruj" class="form-control">`);
    const searchCustom = searchSection.querySelector('#searchCustom');

    const listElement = items.map(item => ({
        element: item,
        author: item.querySelector('.vote-item__author').innerText.toLowerCase(),
        title: item.querySelector('.vote-item__title').innerText.toLowerCase()
    }));

    searchCustom.addEventListener('change', (e) => {
        const value = e.target.value.toLowerCase();
        listElement.map(item => {
            item.element.hidden = !(item.author.includes(value) || item.title.includes(value));
        });
    });
}

const addRemovedList = () => {
    getList(urlRemovedList).then(rmList => {
        const rightColumn = document.querySelector('.layout__right-column');
        rightColumn.insertAdjacentHTML('afterbegin', `<div id="removedList"><strong>Usunięto ${rmList.length} utworów:</strong><div></div></div>`);
        const removed = rightColumn.querySelector("#removedList div");

        const removedString = rmList.reduce((string, item) => {
            return string + `${item.author} - ${item.title}\n`
        }, "");
        removed.innerText = removedString;
    });
}

(function() {
    showScroll(false);

    getList(urlSettingsList).then(setList => {
        const setCounter = setList.length;

        let voteList, loadbar, loading, progress;
        let items = [];
        let itemsCounter = 0;

        const interval = setInterval(() => {
            if (!voteList) {
                voteList = document.querySelector('.vote-list');
                toggleVisibility(voteList);

                voteList.insertAdjacentHTML('beforebegin', `<div id="loadbar"><div id="loading">Zaczytywanie danych...</div></div>`);
                loading = voteList.parentElement.querySelector("#loading");
            }

            let visible = voteList.querySelectorAll('.list-group-item:not([hidden])');

            if (itemsCounter < setCounter) {
                visible.forEach(item => { item.hidden = true });
                itemsCounter += visible.length;
                items = [...items, ...visible];
                progress = (itemsCounter/setCounter) * 100;
                loading.style.width = progress + '%';
            } else {
                loading.hidden = true;
                setSearch(voteList, items);
                clearInterval(interval);
                items.forEach(item => { item.hidden = false });
                showScroll(true);
                addTags(setList);
                toggleVisibility(voteList);
                addRemovedList();
            }
        }, 500);
    });
})();
