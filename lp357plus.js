// ==UserScript==
// @name       LP357+
// @version    0.9.7
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
GM_addStyle("span#infoVisible { display: inline-block; text-align: right; width: 30px; }");

const urlSettingsList = 'https://opensheet.elk.sh/1toPeVyvsvh1QB-zpskh3zOxWl-OuSgKauyf7nPu85s8/settingsList';
const urlRemovedList = 'https://opensheet.elk.sh/1toPeVyvsvh1QB-zpskh3zOxWl-OuSgKauyf7nPu85s8/removedList'

const getList = async (url) => {
    const response = await fetch(url);
    const myJson = await response.json();
    return await myJson;
}

const setInfoStatus = (amount) => `<p id="infoStatus">Liczba widocznych utworów: <strong><span id="infoVisible">${amount}</span>/<span>${amount}</span></strong> (<span id="infoPercent">100</span>%)`;

const setCheckNew = (amount) => `<label class="form-check-label"><input id="onlyNew" type="checkbox"><span>Pokaż tylko nowości - ${amount} pozycji</span></label>`;
const setCheckIsPL = (amount) => `<label class="form-check-label"><input id="onlyIsPL" type="checkbox"><span>Pokaż tylko naszych - ${amount} pozycji</span></label>`;
const setCheckNoPL = (amount) => `<label class="form-check-label"><input id="onlyNoPL" type="checkbox"><span>Pokaż tylko zagranice - ${amount} pozycji</span></label>`;
const setCheckBetTop = (amount) => `<label class="form-check-label"><input id="hideBetTop" type="checkbox"><span>Ukryj duży beton (<i title="Dotyczy uworów z miejsc 01-20 ze stażem dłuższym niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label>`;
const setCheckBetBot = (amount) => `<label class="form-check-label"><input id="hideBetBot" type="checkbox"><span>Ukryj mały beton (<i title="Dotyczy uworów z miejsc 21-42 ze stażem dłuższym niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label>`;
const setCheckOld = (amount) => `<label class="form-check-label"><input id="hideOld" type="checkbox"><span>Ukryj starocie (<i title="Dotyczy uworów spoza zestawienia ze stażem dłuższym niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label>`;

const tagNew = '<div class="badge badge-primary tagNew">Nowość!</div>';

const getTagChartLog = (lastP, change, times, weeks) => {
    return `<div class="chart-item__info tagLog"><span>ostatnia poz.: ${lastP} (${change})</span><br/><span>notowanie: ${times} tydzień</span><br/><span>propozycje: ${weeks} tydzień</span></div>`
};

const getTagRestLog = (weeks) => {
    return `<div class="chart-item__info tagLog"><span>propozycje: ${weeks} tydzień</span></div>`
};

let infoStatus, amountAll, infoVisible, infoPercent;

const addInfoStatus = () => {
    amountAll = currItem.length;

    voteList.insertAdjacentHTML('afterbegin', setInfoStatus(amountAll));
    infoStatus = voteList.querySelector('#infoStatus');

    infoVisible = infoStatus.querySelector('#infoVisible');
    infoPercent = infoStatus.querySelector('#infoPercent');
}

const changeInfoStatus = () => {
    const amountVisible = voteList.querySelectorAll('.list-group-item:not([hidden])').length;
    infoVisible.innerText = amountVisible;

    if (amountVisible == amountAll) {
        infoPercent.innerText = 100;
    } else if (amountVisible == 0) {
        infoPercent.innerText = 0;
    } else {
        const amountPercent = amountVisible / amountAll * 100;
        infoPercent.innerText = amountPercent.toFixed(0);
    }
}

const setCheckboxOnly = (element, rest, list) => {
    element.onclick = (e) => {
        const checked = e.target.checked;
        currItem.forEach((item, i) => { item.hidden = !list[i] && checked });
        rest.forEach(x => { x.checked = false });
        changeInfoStatus();
    }
}

const setCheckboxHide = (element, rest, list, others) => {
    element.onclick = (e) => {
        const checked = e.target.checked;
        const otherChecked = others.some(x => x.checked);

        if (checked && !otherChecked) {
            currItem.forEach(item => { item.hidden = false });
        }

        list.forEach(index => { currItem[index].hidden = checked });
        rest.forEach(x => { x.checked = false });

        changeInfoStatus();
    }
}

const addCheckboxes = () => {
    infoStatus.insertAdjacentHTML('afterend', `<div id="filters"></div>`);
    const filters = voteList.querySelector("#filters");

    const checkNew = setCheckNew( listNew.length);
    filters.insertAdjacentHTML('beforeend', checkNew);
    const onlyNew = filters.querySelector("#onlyNew");
    const dicNew = listNew.reduce((dic, key) => ({...dic, [key]: true}), {});

    const checkBetTop = setCheckBetTop(listBetTop.length);
    filters.insertAdjacentHTML('beforeend', checkBetTop);
    const hideBetTop = filters.querySelector("#hideBetTop");

    const checkIsPL = setCheckIsPL(listIsPL.length);
    filters.insertAdjacentHTML('beforeend', checkIsPL);
    const onlyIsPL = filters.querySelector("#onlyIsPL");
    const dicIsPL = listIsPL.reduce((dic, key) => ({...dic, [key]: true}), {});

    const checkBetBot = setCheckBetBot(listBetBot.length);
    filters.insertAdjacentHTML('beforeend', checkBetBot);
    const hideBetBot = filters.querySelector("#hideBetBot");

    const checkNoPL = setCheckNoPL(listNoPL.length);
    filters.insertAdjacentHTML('beforeend', checkNoPL);
    const onlyNoPL = filters.querySelector("#onlyNoPL");
    const dicNoPL = listNoPL.reduce((dic, key) => ({...dic, [key]: true}), {});

    const checkOld = setCheckOld(listOld.length);
    filters.insertAdjacentHTML('beforeend', checkOld);
    const hideOld = filters.querySelector("#hideOld");

    setCheckboxOnly(onlyNew, [onlyIsPL, onlyNoPL, hideBetTop, hideBetBot, hideOld], dicNew);
    setCheckboxOnly(onlyIsPL, [onlyNew, onlyNoPL, hideBetTop, hideBetBot, hideOld], dicIsPL);
    setCheckboxOnly(onlyNoPL, [onlyNew, onlyIsPL, hideBetTop, hideBetBot, hideOld], dicNoPL);

    setCheckboxHide(hideBetTop, [onlyNew, onlyIsPL, onlyNoPL], listBetTop, [hideBetBot, hideOld]);
    setCheckboxHide(hideBetBot, [onlyNew, onlyIsPL, onlyNoPL], listBetBot, [hideBetTop, hideOld]);
    setCheckboxHide(hideOld, [onlyNew, onlyIsPL, onlyNoPL], listOld, [hideBetTop, hideBetBot]);
}

let voteList, currItem;
let listNew, listIsPL, listNoPL, listBetTop, listBetBot, listOld;

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

    listNew = setList.reduce((list, item, i) => item.isNew ? [...list, i] : list, []);
    listIsPL = setList.reduce((list, item, i) => item.isPL ? [...list, i] : list, []);
    listNoPL = setList.reduce((list, item, i) => !item.isPL ? [...list, i] : list, []);

    listBetTop = setList.reduce((list, item, i) => item.isBetTop ? [...list, i] : list, []);
    listBetBot = setList.reduce((list, item, i) => item.isBetBot ? [...list, i] : list, []);
    listOld = setList.reduce((list, item, i) => item.isOld ? [...list, i] : list, []);

    addInfoStatus();
    addCheckboxes();
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
