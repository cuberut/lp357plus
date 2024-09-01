// ==UserScript==
// @name         LP357+
// @version      1.5.2
// @author       cuberut
// @description  Wspomaganie głosowania LP357
// @match        https://glosuj.radio357.pl/app/lista/glosowanie
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

GM_addStyle("div.tagLog { width: 110px; position: absolute; right: 0; margin-right: 60px; text-align: left; }");
GM_addStyle("div#extraTools div, div#extraTools select { display: inline-block; width: 50%; }");
GM_addStyle("span#infoVisible { display: inline-block; text-align: right; width: 30px; }");
GM_addStyle("div#votes { position: absolute; left: 10px; width: auto; text-align: center; }");
GM_addStyle("div#votedList ol { font-size: small; padding-left: 1.5em; margin-top: 1em; }");
GM_addStyle("div#votedList ol li:hover { text-decoration: line-through; cursor: pointer; }");
GM_addStyle("div#removedList { font-family: monospace; }");

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

const setCheckIsNew = (amount) => `<div><input type="checkbox" id="onlyIsNew" class="custom-check custom-checkbox" ${amount || 'disabled'}><label for="onlyIsNew"><span>Pokaż tylko nowości - ${amount} pozycji</span></label></div>`;
const setCheckAwait = (amount) => `<div><input type="checkbox" id="onlyAwait" class="custom-check custom-checkbox" ${amount || 'disabled'}><label for="onlyAwait"><span>Pokaż tylko oczekujące - ${amount} pozycji</span></label></div>`;
const setCheckVoted = (amount) => `<div><input type="checkbox" id="onlyVoted" class="custom-check custom-checkbox" ${amount || 'disabled'}><label for="onlyVoted"><span>Pokaż tylko moje typy - ${amount} pozycji</span></label></div>`;

const setCheckBet = (amount) => `<div><input type="checkbox" id="hideBet" class="custom-check custom-checkbox" ${amount || 'disabled'}><label for="hideBet"><span>Ukryj beton (<i title="Dotyczy uworów zestawienia ze stażem dłuższym niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label></div>`;
const setCheckOld = (amount) => `<div><input type="checkbox" id="hideOld" class="custom-check custom-checkbox" ${amount || 'disabled'}><label for="hideOld"><span>Ukryj starocie (<i title="Dotyczy uworów spoza zestawienia ze stażem dłuższym niż 5 tygodni">szczegóły</i>) - ${amount} pozycji</span></label></div>`;

const sortingOrderIcon = (iconType) => `<i class="fa ${iconType}"/>`;
const setSortByPosition = () => `<button id="sortByPosition" class="vote-list__sort-item">według notowania </button>`;

const getTagChartLog = (lastP, change, times, weeks) => {
    const ranksPart = `<span>ostatnia poz.: ${lastP}` + (change ? ` (${change})` : '') + '</span>';
    const timesPart = times ? `<span>notowanie: ${times} tydzień</span>` : '';
    return `<div class="chart-item__info tagLog">${ranksPart}<br/>${timesPart}</div>`
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
        const checked = e.target.checked;
        Object.entries(itemDict).forEach(([id, item]) => { item.hidden = !dic[id] && checked });
        rest.forEach(x => { x.checked = false });
        changeInfoStatus();
    }
}

const setCheckboxHide = (element, rest, list, others) => {
    element.onclick = (e) => {
        const checked = e.target.checked;
        const otherChecked = others.some(x => x.checked);

        if (checked && !otherChecked) {
            mainList.forEach(item => { item.hidden = false });
        }

        list.forEach(id => { itemDict[id].hidden = checked });
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

const activeClass = "vote-list__sort-item--active";
const sortClassAsc = "fa-arrow-up";
const sortClassDesc = "fa-arrow-down";

const setOrder = (element, restButtons, orderList, restList = []) => {
    element.onclick = (e) => {
        const button = e.currentTarget;

        button.classList.add(activeClass);

        restButtons.forEach(restButton => {
            restButton.classList.remove(activeClass);

            const restIcon = restButton.querySelector('i');

            if (restIcon) {
                restIcon.classList.remove(sortClassAsc, sortClassDesc);
            }
        });


        let sortIcon = button.querySelector('i');
        const isSortAsc = sortIcon && sortIcon.classList.contains(sortClassAsc);

        if (!sortIcon) {
            button.insertAdjacentHTML('beforeend', sortingOrderIcon());
            sortIcon = button.querySelector('i');
        }

        const tempOrderList = [...orderList];

        if (isSortAsc) {
            sortIcon.classList.remove(sortClassAsc);
            sortIcon.classList.add(sortClassDesc);
            tempOrderList.reverse();
        } else {
            sortIcon.classList.remove(sortClassDesc);
            sortIcon.classList.add(sortClassAsc);
        }

        const settingList = [...tempOrderList, ...restList];

        settingList.forEach(id => listGroup.append(itemDict[id]));
    }
}

const addFilters = (setList) => {
    const filters = voteList.querySelector(".vote-list__filters");
    const sortings = filters.querySelector(".vote-list__sort");
    const buttons = sortings.querySelectorAll("button");

    const orderList = [...setList]
        .map((item, i) => ({ id: item.id, no: i, name: +item.alpha+1, age: +item.weeks, rank: item.lastP ? +item.lastP : 0 }))
        .sort((a, b) => (a.name < b.name) ? -1 : 1);

    const sortButtonBySeniority = buttons[0];
    sortButtonBySeniority.insertAdjacentHTML('beforeend', sortingOrderIcon(sortClassAsc))
    const orderListBySeniority = orderList.sort((a, b) => (a.age < b.age) ? -1 : 1).map(item => item.id);

    const sortButtonByAlphabet = buttons[1];
    const orderListByAlphabet = orderList.sort((a, b) => (a.name < b.name) ? -1 : 1).map(item => item.id);

    sortings.insertAdjacentHTML('beforeend', setSortByPosition());
    const sortButtonByPosition = sortings.querySelector("#sortByPosition");
    const orderListByPositionMain = orderList.filter(x => x.rank).sort((a, b) => (a.rank < b.rank) ? -1 : 1).map(item => item.id);
    const orderListByPositionRest = orderList.filter(x => !x.rank).sort((a, b) => (a.age < b.age) ? -1 : 1).map(item => item.id);

    setOrder(sortButtonBySeniority, [sortButtonByAlphabet, sortButtonByPosition], orderListBySeniority);
    setOrder(sortButtonByAlphabet, [sortButtonByPosition, sortButtonBySeniority], orderListByAlphabet);
    setOrder(sortButtonByPosition, [sortButtonByAlphabet, sortButtonBySeniority], orderListByPositionMain, orderListByPositionRest);
}

//-----------------------------------------------

let voteList, filters, listGroup, mainList, itemDict;
let listIsNew, listAwait, listVoted, listBet, listOld;

const addTags = (listNo, setList) => {
    voteList = document.querySelector('.vote-list');
    filters = voteList.querySelector('.vote-list__filters');
    listGroup = voteList.querySelector('ul.list-group');
    mainList = [...voteList.querySelectorAll(".list-group-item")];
    itemDict = mainList.reduce((itemDict, button) => ({
        ...itemDict,
        [button.getAttribute('data-vote-id')]: button
    }), []);


    const layoutRight = document.querySelector('div[slug="lista"] .layout__right-column .layout__photo');
    layoutRight.style.right = "auto";
    const layoutPhoto = layoutRight.querySelector('div');

    setList.forEach((item, i) => {
        const { id, lastP, change, times, isNew, weeks, votes, history } = item;
        const button = itemDict[id];
        const element = button.querySelector('.vote-item');

        if (lastP) {
            const tagLog = getTagChartLog(lastP, change, times, weeks);
            element.insertAdjacentHTML('beforeend', tagLog);
        }

        if (history) {
            layoutRight.insertAdjacentHTML('afterbegin', `<div id="chart-${id}" class="ct-chart" hidden></div>`);
            const chart = layoutRight.querySelector(`#chart-${id}`);
            button.addEventListener('mouseover', (e) => { chart.hidden = false; layoutPhoto.hidden = true });
            button.addEventListener('mouseout', (e) => { chart.hidden = true; layoutPhoto.hidden = false });

            const labels = [...Array(10).keys()].map(x => (x + listNo - 10));
            const series = history.split(",").map(x => -x || null);

            new window.Chartist.Line(chart, {
                labels: labels,
                series: [ series ]
            }, {
                height: '500px',
                width: '550px',
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

        if (votes) {
            element.insertAdjacentHTML('beforeend', getTagVotes(votes));

            if (votes.last) {
                element.querySelector('input')?.click();
            }
        }
    });

    listIsNew = setList.reduce((list, item) => item.isNew ? [...list, item.id] : list, []);
    listAwait = setList.reduce((list, item) => item.lastP > 35 ? [...list, item.id] : list, []);
    listVoted = setList.reduce((list, item) => item.votes ? [...list, item.id] : list, []);

    listBet = setList.reduce((list, item) => item.isBet ? [...list, item.id] : list, []);
    listOld = setList.reduce((list, item) => item.isOld ? [...list, item.id] : list, []);

    addInfoStatus();
    addCheckboxes();
    addFilters(setList);
}

//-----------------------------------------------

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
            const { author, title, weeks, lastP } = item;
            const ws = String(weeks).padStart(2, '0');
            const lp = lastP ? `(${lastP})` : '';
            return string + `[${ws}] ${author} - ${title} ${lp}\n`;
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

const setVoteSection = (listNo) => {
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

            votedList.addEventListener("DOMSubtreeModified", (e) => {
                const voteList = document.querySelector('.vote-list');
                const votedItems = [...voteList.querySelectorAll('.vote-item input:checked')];
                const votedList = votedItems.map(elem => +elem.value);

                localStorage.setItem("myVotes" + listNo, JSON.stringify(votedList));
            });

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
    getList(urlSettingsList).then(setList => {
        const setCounter = setList.length;

        let voteList, listNo;
        let items = [];

        const interval = setInterval(() => {
            if (!voteList) {
                voteList = document.querySelector('.vote-list');
            } else {
                clearInterval(interval);

                listNo = +document.querySelector('.header__heading-voting').innerText.split('#')[1];
                getVotes(listNo, setList);

                items = [...voteList.querySelectorAll('.list-group-item:not([hidden])')];

                setSearch(voteList, items);
                addTags(listNo, setList);
                setVoteSection(listNo);
                addRemovedList();
            }
        }, 25);
    });
})();
