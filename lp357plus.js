// ==UserScript==
// @name       LP357+
// @version    0.9.3
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

const getSetList = async () => {
    const response = await fetch('https://opensheet.elk.sh/1toPeVyvsvh1QB-zpskh3zOxWl-OuSgKauyf7nPu85s8/settingsList');
    const myJson = await response.json();
    return await myJson;
}

const tagNew = '<div class="badge badge-primary tagNew">Nowość!</div>';

const getCheckNew = (amount) => `<label class="form-check-label"><input id="onlyNew" type="checkbox"><span>Pokaż tylko nowości - ${amount} pozycji</span></label>`;
const getCheckBet = (amount) => `<label class="form-check-label"><input id="hideBet" type="checkbox"><span>Ukryj beton (<i title="Dotyczy uworów z TOP10 oraz będących w zestawieniu dłuzej niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label>`;
const getCheckIsPL = (amount) => `<label class="form-check-label"><input id="onlyIsPL" type="checkbox"><span>Pokaż tylko naszych - ${amount} pozycji</span></label>`;
const getCheckNoPL = (amount) => `<label class="form-check-label"><input id="onlyNoPL" type="checkbox"><span>Pokaż tylko zagranice - ${amount} pozycji</span></label>`;

const getTagLog = (lastP, change, times) => {
    return `<div class="chart-item__info tagLog"><span>Ostatnia poz.: ${lastP} (${change})</span><br/><span>tygodnie: ${times}</span></div>`
};

const setCheckbox = (element, rest, list, isHide = false) => {
    element.onclick = (e) => {
        const checked = e.target.checked;
        currItem.forEach((item, i) => { item.hidden = (checked && list.includes(i) == isHide) });
        rest.forEach(x => { x.checked = false });
    }
}

const addCheckboxes = (listNew, listBet, listIsPL, listNoPL) => {
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

    setCheckbox(onlyNew, [hideBet, onlyIsPL, onlyNoPL], listNew);
    setCheckbox(hideBet, [onlyNew, onlyIsPL, onlyNoPL], listBet, true);

    setCheckbox(onlyIsPL, [onlyNew, hideBet, onlyNoPL], listIsPL);
    setCheckbox(onlyNoPL, [onlyNew, hideBet, onlyIsPL], listNoPL);
}

let voteList, currItem;

const addTags = (setList) => {
    voteList = document.querySelector('.vote-list')
    currItem = voteList.querySelectorAll(".list-group-item");

    setList.forEach((item, i) => {
        const {lastP, change, times, isNew} = item;
        if (lastP) {
            const tagLog = getTagLog(lastP, change, times);
            currItem[i].querySelector('.vote-item').insertAdjacentHTML('beforeend', tagLog);
        } else if (isNew) {
            currItem[i].querySelector('.vote-item').insertAdjacentHTML('beforeend', tagNew);
        }
    });

    const listNew = setList.reduce((list, item, i) => item.isNew ? [...list, i] : list, []);
    const listBet = setList.reduce((list, item, i) => item.isBet ? [...list, i] : list, []);

    const listIsPL = setList.reduce((list, item, i) => item.isPL ? [...list, i] : list, []);
    const listNoPL = setList.reduce((list, item, i) => !item.isPL ? [...list, i] : list, []);

    addCheckboxes(listNew, listBet, listIsPL, listNoPL);
}

const showScroll = (state) => { document.body.style.overflow = state ? 'auto' : 'hidden' }

(function() {
    showScroll(false);
    const setList = getSetList().then(setList => {
        const setCounter = setList.length;

        let voteList, loadbar, loading, progress;
        let hidden = [];
        let hiddenCounter = 0;

        const interval = setInterval(() => {
            if (!voteList) {
                voteList = document.querySelector('.vote-list');
                voteList.style.opacity = 0;

                voteList.insertAdjacentHTML('beforebegin', `<div id="loadbar"><div id="loading">Zaczytywanie danych...</div></div>`);
                loading = voteList.parentElement.querySelector("#loading");
            }

            let visible = voteList.querySelectorAll('.list-group-item:not([hidden])');

            if (hiddenCounter < setCounter) {
                visible.forEach(item => { item.hidden = true });
                hiddenCounter += visible.length;
                hidden = [...hidden, ...visible];

                progress = (hiddenCounter/setCounter) * 100;
                loading.style.width = progress + '%';
            } else {
                loading.hidden = true;
                voteList.style.opacity = 100;

                clearInterval(interval);
                hidden.forEach(item => { item.hidden = false });
                showScroll(true);
                addTags(setList);
            }
        }, 500);
    });
})();
