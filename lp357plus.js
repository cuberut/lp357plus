// ==UserScript==
// @name       LP357+
// @version    0.5
// @include    https://lista.radio357.pl/app/lista/glosowanie
// @updateUrl  https://raw.githubusercontent.com/cuberut/lp357plus/main/lp357plus.js
// @grant      GM_addStyle
// ==/UserScript==

GM_addStyle("div.tagNew { position: absolute; right: 0; margin-right: 100px; }");
GM_addStyle("div.tagLog { width: 110px; position: absolute; right: 0; margin-right: 60px; text-align: left; }");

const getSetList = async () => {
    const response = await fetch('https://opensheet.vercel.app/1toPeVyvsvh1QB-zpskh3zOxWl-OuSgKauyf7nPu85s8/settingsList');
    const myJson = await response.json();
    return await myJson;
}

const checkNew = '<div><label class="form-check-label"><input id="onlyNew" type="checkbox"><span>Pokaż tylko nowości</span></label></div>';
const checkBet = '<div><label class="form-check-label"><input id="hideBet" type="checkbox"><span>Ukryj beton (TOP10)</span></label></div>';

const tagNew = '<div class="badge badge-primary tagNew">Nowość!</div>';

const getTagLog = (lastP, change, times) => {
    return `<div class="chart-item__info tagLog"><span>Ostatnia poz.: ${lastP} (${change})</span><br/><span>tygodnie: ${times}</span></div>`
};

const setCheckbox = (element, second, list, isHide) => {
    element.onclick = (e) => {
        const checked = e.target.checked;
        currItem.forEach((item, i) => { item.hidden = (checked && list.includes(i) == isHide) });
        second.checked = false;
    }
}

const addCheckboxes = (listNew, listBet) => {
    voteList.insertAdjacentHTML('afterbegin', checkNew);
    const onlyNew = voteList.querySelector("#onlyNew");

    voteList.insertAdjacentHTML('afterbegin', checkBet);
    const hideBet = voteList.querySelector("#hideBet");

    setCheckbox(onlyNew, hideBet, listNew, false);
    setCheckbox(hideBet, onlyNew, listBet, true);
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

        addCheckboxes(listNew, listBet);
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
