// ==UserScript==
// @name         LP357+
// @version      0.9.19
// @author       cuberut
// @description  Wspomaganie głosowania LP357
// @match        https://lista.radio357.pl/app/lista/glosowanie
// @updateURL    https://raw.githubusercontent.com/cuberut/lp357plus/main/lp357plus.js
// @downloadURL  https://raw.githubusercontent.com/cuberut/lp357plus/main/lp357plus.js
// @grant        GM_addStyle
// ==/UserScript==

GM_addStyle("div#loadbar { width: 100%; background-color: #ddd;}");
GM_addStyle("div#loading { width: 0%; height: 2rem; background-color: #337AB7; padding: 0.25rem 0.5rem; }");
GM_addStyle("div.tagLog { width: 110px; position: absolute; right: 0; margin-right: 60px; text-align: left; }");
GM_addStyle("div#extraTools label, div#extraTools select { display: inline-block; width: 50%; }");
GM_addStyle("span#infoVisible { display: inline-block; text-align: right; width: 30px; }");
GM_addStyle("div#votes { position: absolute; left: 10px; width: auto; text-align: center; }");
GM_addStyle("div#votedList ol { font-size: small; padding-left: 1.5em; margin-top: 1em; }");
GM_addStyle("div#votedList ol li:hover { text-decoration: line-through; cursor: pointer; }");

//-----------------------------------------------

const urlApi = 'https://opensheet.elk.sh/1toPeVyvsvh1QB-zpskh3zOxWl-OuSgKauyf7nPu85s8/';
const urlSettingsList = urlApi + 'settingsList';
const urlRemovedList = urlApi + 'removedList';

const getList = async (url) => {
    const response = await fetch(url);
    const myJson = await response.json();
    return await myJson;
}

//-----------------------------------------------

const setInfoStatus = (amount) => `<p id="infoStatus">Liczba widocznych utworów: <strong><span id="infoVisible">${amount}</span>/<span>${amount}</span></strong> (<span id="infoPercent">100</span>%)`;

const setCheckIsNew = (amount) => `<label class="form-check-label"><input id="onlyIsNew" type="checkbox" ${amount || 'disabled'}><span>Pokaż tylko nowości - ${amount} pozycji</span></label>`;
const setCheckAwait = (amount) => `<label class="form-check-label"><input id="onlyAwait" type="checkbox" ${amount || 'disabled'}><span>Pokaż tylko oczekujące - ${amount} pozycji</span></label>`;
const setCheckVoted = (amount) => `<label class="form-check-label"><input id="onlyVoted" type="checkbox" ${amount || 'disabled'}><span>Pokaż tylko moje typy - ${amount} pozycji</span></label>`;

const setCheckBet = (amount) => `<label class="form-check-label"><input id="hideBet" type="checkbox" ${amount || 'disabled'}><span>Ukryj beton (<i title="Dotyczy uworów zestawienia ze stażem dłuższym niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label>`;
const setCheckOld = (amount) => `<label class="form-check-label"><input id="hideOld" type="checkbox" ${amount || 'disabled'}><span>Ukryj starocie (<i title="Dotyczy uworów spoza zestawienia ze stażem dłuższym niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label>`;

const setCheckOrderByNewest = () => `<label class="form-check-label"><input id="orderByNewest" type="checkbox">Sortuj wg najmłodszych stażem</label>`;
const setCheckOrderByOldest = () => `<label class="form-check-label"><input id="orderByOldest" type="checkbox">Sortuj wg najstarszych stażem</label>`;

const setCheckOrderByLastPA = () => `<label class="form-check-label"><input id="orderByLastPA" type="checkbox">Sortuj wg ostatniej pozycji rosnąco</label>`;
const setCheckOrderByLastPD = () => `<label class="form-check-label"><input id="orderByLastPD" type="checkbox">Sortuj wg ostatenij pozycji malejąco</label>`;

const setSelectAddBy = () => `<label class="form-check-label">Pokaż tylko utwory zgłoszone przez:</label><select id="chooseAddBy"></select>`;

const getTagChartLog = (lastP, change, times, weeks) => {
    const ranksPart = `<span>ostatnia poz.: ${lastP}` + (change ? ` (${change})` : '') + '</span>';
    const timesPart = times ? `<span>notowanie: ${times} tydzień</span>` : '';
    const weeksPart = weeks ? `<span>propozycje: ${weeks} tydzień</span>` : '';
    return `<div class="chart-item__info tagLog">${ranksPart}<br/>${timesPart}<br/>${weeksPart}</div>`
};

const getTagRestLog = (weeks) => {
    return `<div class="chart-item__info tagLog"><span>propozycje: ${weeks} tydzień</span></div>`
};

const getTagVotes = (item) => {
    return `<div id="votes"><i class="${item.last ? 'fas' : 'far'} fa-star"></i><div class="small">(${item.count})</div></div>`
};

//-----------------------------------------------

let extraTools, amountAll, infoVisible, infoPercent;

const addInfoStatus = () => {
    voteList.insertAdjacentHTML('afterbegin', `<div id="extraTools"></div>`);
    extraTools = voteList.querySelector('#extraTools');

    amountAll = mainList.length;

    extraTools.insertAdjacentHTML('beforeend', setInfoStatus(amountAll));
    const infoStatus = extraTools.querySelector('#infoStatus');

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

//-----------------------------------------------

const setCheckboxOnly = (element, rest, dic) => {
    element.onclick = (e) => {
        resetSelectors();
        const checked = e.target.checked;
        mainList.forEach((item, i) => { item.hidden = !dic[i] && checked });
        rest.forEach(x => { x.checked = false });
        changeInfoStatus();
    }
}

const setCheckboxHide = (element, rest, list, others) => {
    element.onclick = (e) => {
        resetSelectors();

        const checked = e.target.checked;
        const otherChecked = others.some(x => x.checked);

        if (checked && !otherChecked) {
            mainList.forEach(item => { item.hidden = false });
        }

        list.forEach(index => { mainList[index].hidden = checked });
        rest.forEach(x => { x.checked = false });

        changeInfoStatus();
    }
}

let checkboxes;

const addCheckboxes = (setList) => {
    extraTools.insertAdjacentHTML('beforeend', `<p id="checkboxes"></p>`);
    checkboxes = voteList.querySelector("#checkboxes");

    const checkIsNew = setCheckIsNew(listIsNew.length);
    checkboxes.insertAdjacentHTML('beforeend', checkIsNew);
    const onlyIsNew = checkboxes.querySelector("#onlyIsNew");
    const dicIsNew = listIsNew.reduce((dic, key) => ({...dic, [key]: true}), {});

    const checkBet = setCheckBet(listBet.length);
    checkboxes.insertAdjacentHTML('beforeend', checkBet);
    const hideBet = checkboxes.querySelector("#hideBet");

    const checkAwait = setCheckAwait(listAwait.length);
    checkboxes.insertAdjacentHTML('beforeend', checkAwait);
    const onlyAwait = checkboxes.querySelector("#onlyAwait");
    const dicAwait = listAwait.reduce((dic, key) => ({...dic, [key]: true}), {});

    const checkOld = setCheckOld(listOld.length);
    checkboxes.insertAdjacentHTML('beforeend', checkOld);
    const hideOld = checkboxes.querySelector("#hideOld");

    const checkVoted = setCheckVoted(listVoted.length);
    checkboxes.insertAdjacentHTML('beforeend', checkVoted);
    const onlyVoted = checkboxes.querySelector("#onlyVoted");
    const dicVoted = listVoted.reduce((dic, key) => ({...dic, [key]: true}), {});

    setCheckboxOnly(onlyIsNew, [onlyAwait, onlyVoted, hideBet, hideOld], dicIsNew);
    setCheckboxOnly(onlyAwait, [onlyIsNew, onlyVoted, hideBet, hideOld], dicAwait);
    setCheckboxOnly(onlyVoted, [onlyAwait, onlyIsNew, hideBet, hideOld], dicVoted);

    setCheckboxHide(hideBet, [onlyIsNew, onlyAwait, onlyVoted], listBet, [hideOld]);
    setCheckboxHide(hideOld, [onlyIsNew, onlyAwait, onlyVoted], listOld, [hideBet]);
}

const resetCheckboxes = () => checkboxes.querySelectorAll('input[type="checkbox"]').forEach(checkbox => { checkbox.checked = false });

//-----------------------------------------------

const setOrder = (element, rest, dic, origin) => {
    element.onclick = (e) => {
        const checked = e.target.checked;

        if (checked) {
            dic.forEach(index => { listGroup.append(itemList[index])});
            rest.forEach(x => { x.checked = false });
        } else {
            origin.forEach(index => { listGroup.append(itemList[index])});
        }
    }
}

let orderboxes;

const addOrderboxes = (setList) => {
    extraTools.insertAdjacentHTML('beforeend', `<p id="orderboxes"></p>`);
    orderboxes = voteList.querySelector("#orderboxes");

    const orderList = [...setList].map((item, i) => ({ no: i, age: +item.weeks, lastP: item.lastP ? +item.lastP : 0 }));
    const originList = orderList.map(item => item.no);

    orderboxes.insertAdjacentHTML('beforeend', setCheckOrderByNewest());
    const orderByNewest = orderboxes.querySelector("#orderByNewest");
    const dicByNewest = orderList.sort((a, b) => (a.age < b.age) ? -1 : 1).map(item => item.no);

    orderboxes.insertAdjacentHTML('beforeend', setCheckOrderByLastPA());
    const orderByLastPA = orderboxes.querySelector("#orderByLastPA");
    const dicByLastPA = orderList.sort((a, b) => (a.lastP > b.lastP) ? 1 : -1).map(item => item.no);

    orderboxes.insertAdjacentHTML('beforeend', setCheckOrderByOldest());
    const orderByOldest = orderboxes.querySelector("#orderByOldest");
    const dicByOldest = orderList.sort((a, b) => (a.age > b.age) ? -1 : 1).map(item => item.no);

    orderboxes.insertAdjacentHTML('beforeend', setCheckOrderByLastPD());
    const orderByLastPD = orderboxes.querySelector("#orderByLastPD");
    const dicByLastPD = orderList.sort((a, b) => (a.lastP > b.lastP) ? -1 : 1).map(item => item.no);

    setOrder(orderByNewest, [orderByOldest, orderByLastPA, orderByLastPD], dicByNewest, originList);
    setOrder(orderByOldest, [orderByNewest, orderByLastPA, orderByLastPD], dicByOldest, originList);

    setOrder(orderByLastPA, [orderByOldest, orderByNewest, orderByLastPD], dicByLastPA, originList);
    setOrder(orderByLastPD, [orderByOldest, orderByNewest, orderByLastPA], dicByLastPD, originList);
}

//-----------------------------------------------

const persons = {
    "PD": {list:[], name: "PIOSENKA DNIA"},
    "OB": {list:[], name: "Ola Budka"},
    "MC": {list:[], name: "Marcin Cichoński"},
    "MF": {list:[], name: "Mateusz Fusiarz"},
    "BG": {list:[], name: "Bartek Gil"},
    "AG": {list:[], name: "Antoni Grudniewski"},
    "MK": {list:[], name: "Marta Kula"},
    "MM": {list:[], name: "Marta Malinowska"},
    "MN": {list:[], name: "Marek Niedźwiecki"},
    "MP": {list:[], name: "Maja Piskadło"},
    "PP": {list:[], name: "Paweł Pobóg-Ruszkowski"},
    "PS": {list:[], name: "Piotr Stelmach"},
    "xx": {list:[], name: "NIEPRZYPISANE"}
}

const setOptions = (dic) => Object.keys(dic)
    .filter(key => dic[key].list.length)
    .reduce((options, key) => `${options}<option value=${key}>${dic[key].name} (${dic[key].list.length})</option>`, "<option value=''>Wybierz...</option>");

const setSelector = (element, keys) => {
    element.onchange = (e) => {
        resetCheckboxes();
        const value = e.target.value;
        mainList.forEach((item, i) => { item.hidden = keys[value] ? !keys[value].dic[i] : false });
        changeInfoStatus();
    }
}

let selectors;

const addSelectors = () => {
    extraTools.insertAdjacentHTML('beforeend', `<p id="selectors"></p>`);
    selectors = voteList.querySelector("#selectors");

    selectors.insertAdjacentHTML('beforeend', setSelectAddBy());
    const chooseAddBy = selectors.querySelector("#chooseAddBy");
    chooseAddBy.insertAdjacentHTML('beforeend', setOptions(persons));

    setSelector(chooseAddBy, persons);
}

const resetSelectors = () => selectors.querySelectorAll('select').forEach(select => { select.value = "" });

//-----------------------------------------------

let voteList, listGroup, mainList, itemList;
let listIsNew, listAwait, listVoted, listBet, listOld;

const addTags = (setList) => {
    voteList = document.querySelector('.vote-list');
    listGroup = voteList.querySelector('ul.list-group');
    mainList = voteList.querySelectorAll(".list-group-item");
    itemList = [...mainList];

    setList.forEach((item, i) => {
        const {lastP, change, times, isNew, weeks, votes} = item;
        const element = mainList[i].querySelector('.vote-item');

        if (lastP) {
            const tagLog = getTagChartLog(lastP, change, times, weeks);
            element.insertAdjacentHTML('beforeend', tagLog);
        } else {
            const tagLog = getTagRestLog(weeks);
            element.insertAdjacentHTML('beforeend', tagLog);
        }

        if (votes) {
            element.insertAdjacentHTML('beforeend', getTagVotes(votes));

            if (votes.last) {
                element.querySelector('input')?.click();
            }
        }
    });

    listIsNew = setList.reduce((list, item, i) => item.isNew ? [...list, i] : list, []);
    listAwait = setList.reduce((list, item, i) => item.lastP > 35 ? [...list, i] : list, []);
    listVoted = setList.reduce((list, item, i) => item.votes ? [...list, i] : list, []);

    listBet = setList.reduce((list, item, i) => item.isBet ? [...list, i] : list, []);
    listOld = setList.reduce((list, item, i) => item.isOld ? [...list, i] : list, []);

    setList.forEach((item, i) => { persons[item.addBy || "xx"].list.push(i) });
    Object.keys(persons).forEach(key => { persons[key].dic = persons[key].list.reduce((dic, key) => ({...dic, [key]: true}), {}); });

    addInfoStatus();
    addCheckboxes();
    addOrderboxes(setList);
    addSelectors();
}

//-----------------------------------------------

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
        changeInfoStatus();
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

//-----------------------------------------------

const getVotes = (listNo, setList) => {
    const myVotes = {};

    for (var i = 1; i < listNo+1; i++) {
        const votes = JSON.parse(localStorage.getItem("myVotes" + i));
        const last = (i == listNo);

        if (votes) {
            votes.forEach(id => {
                if (myVotes[id]) {
                    myVotes[id].count++;
                } else {
                    myVotes[id] = { count: 1 };
                }
                if (last) {
                    myVotes[id].last = true;
                }
            });
        }
    }

    setList.forEach(item => { item.votes = myVotes[item.id] });
}

const setVotes = (listNo) => {
    const voteContent = document.querySelector('.vote__content');

    if (voteContent) {
        const voteButton = voteContent.querySelector('button');
        voteButton.addEventListener('click', (e) => {
            extraTools.hidden = true;

            const voteList = document.querySelector('.vote-list');
            const votedItems = [...voteList.querySelectorAll('.vote-item input:checked')];
            const votedList = votedItems.map(elem => +elem.value);

            localStorage.setItem("myVotes" + listNo, JSON.stringify(votedList));
        });
    }
}

const setVoteSection = () => {
    const voteSection = document.querySelector('.layout__action');

    if (voteSection) {
        voteSection.insertAdjacentHTML('beforeend', `<div id="votedList"><ol></ol></div>`);
        const votedList = voteSection.querySelector('#votedList ol');

        const voteCounter = voteSection.querySelector('.vote__votes');
        voteCounter.addEventListener("DOMSubtreeModified", (e) => {
            const checkedItems = voteList.querySelectorAll('ul.list-group input[type="checkbox"]:checked')
            const list = [...checkedItems].reduce((list, item) => {
                const id = item.id;
                const song = item.parentElement.lastChild.innerText.replace("\n", " - ");
                return `${list}<li for="${id}">${song}</li>`;
            }, "");

            votedList.textContent = null
            votedList.insertAdjacentHTML('beforeend', list);

            const votedItems = [...voteSection.querySelectorAll('li')];
            votedItems.forEach(li => {
                li.addEventListener("click", (e) => {
                    const forId = e.target.getAttribute("for");
                    const input = voteList.querySelector(`#${forId}`);
                    input.click();
                });
            });
        }, false);
    }
}

//-----------------------------------------------

(function() {
    showScroll(false);

    getList(urlSettingsList).then(setList => {
        const setCounter = setList.length;

        let voteList, listNo;
        let loadbar, loading, progress;
        let items = [];
        let itemsCounter = 0;

        const interval = setInterval(() => {
            if (!voteList) {
                voteList = document.querySelector('.vote-list');
            }

            if (voteList && !loading) {
                toggleVisibility(voteList);

                listNo = document.querySelector('.header__heading-voting').innerText.split('#')[1];
                getVotes(listNo, setList);
                setVotes(listNo);

                voteList.insertAdjacentHTML('beforebegin', `<div id="loadbar"><div id="loading">Zaczytywanie danych...</div></div>`);
                loading = voteList.parentElement.querySelector("#loading");
            }

            if (loading) {
                let visible = voteList.querySelectorAll('.list-group-item:not([hidden])');

                if (visible.length || itemsCounter == setCounter) {
                    setTimeout(function(){
                        visible.forEach(item => {
                            item.hidden = true;

                            if (!item.counted) {
                                itemsCounter++;
                                item.counted = true;
                            }
                        });
                    }, 0);

                    items = [...items, ...visible];
                    progress = (itemsCounter/setCounter) * 100;
                    loading.style.width = progress + '%';

                    if (itemsCounter == setCounter) {
                        loading.hidden = true;
                        setSearch(voteList, items);
                        clearInterval(interval);
                        items.forEach(item => { item.hidden = false });
                        showScroll(true);
                        addTags(setList);
                        setVoteSection();
                        toggleVisibility(voteList);
                        addRemovedList();
                    }
                }
            }
        }, 25);
    });
})();
