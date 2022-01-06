// ==UserScript==
// @name       LP357+
// @author     cuberut
// @version    0.7
// @include    https://lista.radio357.pl/app/lista/glosowanie
// @updateURL  https://raw.githubusercontent.com/cuberut/lp357plus/main/lp357plus.js
// @grant      GM_addStyle
// ==/UserScript==

GM_addStyle("div.tagNew { position: absolute; right: 0; margin-right: 100px; }");
GM_addStyle("div.tagLog { width: 110px; position: absolute; right: 0; margin-right: 60px; text-align: left; }");
GM_addStyle("div.half { float: left; width: 50%; }");

const getSetList = async () => {
    const response = await fetch('https://opensheet.vercel.app/1toPeVyvsvh1QB-zpskh3zOxWl-OuSgKauyf7nPu85s8/settingsList');
    const myJson = await response.json();
    return await myJson;
}

const tagNew = '<div class="badge badge-primary tagNew">Nowość!</div>';

const getCheckNew = (amount) => `<div class="half"><label class="form-check-label"><input id="onlyNew" type="checkbox"><span>Pokaż tylko nowości - ${amount} pozycji</span></label></div>`;
const getCheckBet = (amount) => `<div class="half"><label class="form-check-label"><input id="hideBet" type="checkbox"><span>Ukryj beton (<i title="Dotyczy uworów z TOP10 oraz będących w zestawieniu dłuzej niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label></div>`;
const getCheckIsPL = (amount) => `<div class="half"><label class="form-check-label"><input id="onlyIsPL" type="checkbox"><span>Pokaż tylko naszych - ${amount} pozycji</span></label></div>`;
const getCheckNoPL = (amount) => `<div class="half"><label class="form-check-label"><input id="onlyNoPL" type="checkbox"><span>Pokaż tylko zagranice - ${amount} pozycji</span></label></div>`;

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
    const checkNoPL = getCheckNoPL(listNoPL.length);
    voteList.insertAdjacentHTML('afterbegin', checkNoPL);
    const onlyNoPL = voteList.querySelector("#onlyNoPL");

    const checkBet = getCheckBet(listBet.length);
    voteList.insertAdjacentHTML('afterbegin', checkBet);
    const hideBet = voteList.querySelector("#hideBet");

    const checkIsPL = getCheckIsPL(listIsPL.length);
    voteList.insertAdjacentHTML('afterbegin', checkIsPL);
    const onlyIsPL = voteList.querySelector("#onlyIsPL");

    const checkNew = getCheckNew(listNew.length);
    voteList.insertAdjacentHTML('afterbegin', checkNew);
    const onlyNew = voteList.querySelector("#onlyNew");

    setCheckbox(onlyNew, [hideBet, onlyIsPL, onlyNoPL], listNew);
    setCheckbox(hideBet, [onlyNew, onlyIsPL, onlyNoPL], listBet, true);

    setCheckbox(onlyIsPL, [onlyNew, hideBet, onlyNoPL], listIsPL);
    setCheckbox(onlyNoPL, [onlyNew, hideBet, onlyIsPL], listNoPL);
}

let voteList, currItem;

const addTags = () => {
    getSetList().then(setList => {
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
    });
}

(function() {
    let tempHeight = 0;
    const interval = setInterval(() => {
        if (tempHeight != document.body.scrollHeight) {
            window.scrollTo(0, document.body.scrollHeight);
            tempHeight = document.body.scrollHeight;
        } else {
            clearInterval(interval);
            window.scrollTo(0, 0);
            addTags();
        }
    }, 500);
})();
