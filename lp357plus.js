// ==UserScript==
// @name         LP357+
// @version      1.7
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
GM_addStyle("div#averageSeniority { margin: 0px -20px 10px }");
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
    return response.json();
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
    infoVisible.textContent = amountVisible;
    infoPercent.textContent = amountVisible === amountAll ? 100 : amountVisible === 0 ? 0 : Math.round(amountVisible / amountAll * 100);
}

//-----------------------------------------------

const setCheckboxOnly = (element, rest, dic) => {
    element.onclick = (e) => {
        const checked = e.target.checked;
        for (const id in itemDict) {
            itemDict[id].hidden = !dic[id] && checked;
        }
        for (let i = 0; i < rest.length; i++) rest[i].checked = false;
        changeInfoStatus();
    }
}

const setCheckboxHide = (element, rest, list, others) => {
    element.onclick = (e) => {
        const checked = e.target.checked;
        let otherChecked = false;
        for (let i = 0; i < others.length; i++) {
            if (others[i].checked) {
                otherChecked = true;
                break;
            }
        }

        if (checked && !otherChecked) {
            for (let i = 0; i < mainList.length; i++) mainList[i].hidden = false;
        }

        for (let i = 0; i < list.length; i++) itemDict[list[i]].hidden = checked;
        for (let i = 0; i < rest.length; i++) rest[i].checked = false;

        changeInfoStatus();
    }
}

let checkboxes;

const addCheckboxes = (setList) => {
    const fragment = document.createDocumentFragment();
    const checkboxesEl = document.createElement('p');
    checkboxesEl.id = 'checkboxes';
    
    const html = setCheckIsNew(listIsNew.length) + 
                 setCheckBet(listBet.length) + 
                 setCheckAwait(listAwait.length) + 
                 setCheckOld(listOld.length) + 
                 setCheckVoted(listVoted.length);
    checkboxesEl.innerHTML = html;
    fragment.appendChild(checkboxesEl);
    extraTools.appendChild(fragment);
    checkboxes = checkboxesEl;

    const onlyIsNew = checkboxes.querySelector("#onlyIsNew");
    const hideBet = checkboxes.querySelector("#hideBet");
    const onlyAwait = checkboxes.querySelector("#onlyAwait");
    const hideOld = checkboxes.querySelector("#hideOld");
    const onlyVoted = checkboxes.querySelector("#onlyVoted");
    
    const dicIsNew = {};
    for (let i = 0; i < listIsNew.length; i++) dicIsNew[listIsNew[i]] = true;
    const dicAwait = {};
    for (let i = 0; i < listAwait.length; i++) dicAwait[listAwait[i]] = true;
    const dicVoted = {};
    for (let i = 0; i < listVoted.length; i++) dicVoted[listVoted[i]] = true;

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

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < tempOrderList.length; i++) fragment.appendChild(itemDict[tempOrderList[i]]);
        for (let i = 0; i < restList.length; i++) fragment.appendChild(itemDict[restList[i]]);
        listGroup.appendChild(fragment);
    }
}

const addFilters = (setList) => {
    const filters = voteList.querySelector(".vote-list__filters");
    const sortings = filters.querySelector(".vote-list__sort");
    const buttons = sortings.querySelectorAll("button");

    const orderList = setList.map((item, i) => ({ 
        id: item.id, 
        no: i, 
        name: +item.alpha + 1, 
        age: +item.weeks, 
        rank: item.lastP ? +item.lastP : 0 
    }));

    const sortButtonBySeniority = buttons[0];
    sortButtonBySeniority.insertAdjacentHTML('beforeend', sortingOrderIcon(sortClassAsc));
    
    const sortButtonByAlphabet = buttons[1];
    const orderListBySeniority = orderList.slice().sort((a, b) => a.age - b.age).map(item => item.id);
    const orderListByAlphabet = orderList.slice().sort((a, b) => a.name - b.name).map(item => item.id);

    sortings.insertAdjacentHTML('beforeend', setSortByPosition());
    const sortButtonByPosition = sortings.querySelector("#sortByPosition");
    
    const withRank = [];
    const withoutRank = [];
    for (let i = 0; i < orderList.length; i++) {
        if (orderList[i].rank) withRank.push(orderList[i]);
        else withoutRank.push(orderList[i]);
    }
    const orderListByPositionMain = withRank.sort((a, b) => a.rank - b.rank).map(item => item.id);
    const orderListByPositionRest = withoutRank.sort((a, b) => a.age - b.age).map(item => item.id);

    setOrder(sortButtonBySeniority, [sortButtonByAlphabet, sortButtonByPosition], orderListBySeniority);
    setOrder(sortButtonByAlphabet, [sortButtonByPosition, sortButtonBySeniority], orderListByAlphabet);
    setOrder(sortButtonByPosition, [sortButtonByAlphabet, sortButtonBySeniority], orderListByPositionMain, orderListByPositionRest);
}

//-----------------------------------------------

let voteList, filters, listGroup, mainList;
let itemDict, seniorityDic;
let listIsNew, listAwait, listVoted, listBet, listOld;

const addTags = (listNo, setList) => {
    voteList = document.querySelector('.vote-list');
    filters = voteList.querySelector('.vote-list__filters');
    listGroup = voteList.querySelector('ul.list-group');
    mainList = [...voteList.querySelectorAll(".list-group-item")];

    itemDict = {};
    for (let i = 0; i < mainList.length; i++) {
        const button = mainList[i];
        itemDict[button.getAttribute('data-vote-id')] = button;
    }

    seniorityDic = {};
    for (let i = 0; i < setList.length; i++) {
        seniorityDic[setList[i].id] = +setList[i].weeks;
    }


    const layoutRight = document.querySelector('div[slug="lista"] .layout__right-column .layout__photo');
    layoutRight.style.right = "auto";
    const layoutPhoto = layoutRight.querySelector('div');

    setList.forEach((item, i) => {
        const { id, lastP, change, times, isNew, weeks, votes, history } = item;
        const button = itemDict[id];

        if (!button) {
            console.log('Problem z utworem o ID: ', id);
            return;
        }

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

            const labels = [];
            for (let x = 0; x < 10; x++) labels.push(x + listNo - 10);
            const series = [];
            const historyParts = history.split(",");
            for (let x = 0; x < historyParts.length; x++) {
                series.push(-historyParts[x] || null);
            }

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

    listIsNew = [];
    listAwait = [];
    listVoted = [];
    listBet = [];
    listOld = [];
    for (let i = 0; i < setList.length; i++) {
        const item = setList[i];
        if (item.isNew) listIsNew.push(item.id);
        if (item.lastP > 35) listAwait.push(item.id);
        if (item.votes) listVoted.push(item.id);
        if (item.isBet) listBet.push(item.id);
        if (item.isOld) listOld.push(item.id);
    }

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

    searchCustom.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        for (let i = 0; i < listElement.length; i++) {
            const item = listElement[i];
            item.element.hidden = !(item.author.includes(value) || item.title.includes(value));
        }
        changeInfoStatus();
    });
}

const addRemovedList = () => {
    getList(urlRemovedList).then(rmList => {
        const rightColumn = document.querySelector('.layout__right-column');
        rightColumn.insertAdjacentHTML('afterbegin', `<div id="removedList"><strong>Usunięto ${rmList.length} utworów:</strong><div></div></div>`);
        const removed = rightColumn.querySelector("#removedList div");

        let removedString = "";
        for (let i = 0; i < rmList.length; i++) {
            const item = rmList[i];
            const ws = String(item.weeks).padStart(2, '0');
            const lp = item.lastP ? `(${item.lastP})` : '';
            removedString += `[${ws}] ${item.author} - ${item.title} ${lp}\n`;
        }
        removed.textContent = removedString;
    });
}

//-----------------------------------------------

const getVotes = (listNo, setList) => {
    const myVotes = {};

    for (let i = 1; i <= listNo; i++) {
        const votesStr = localStorage.getItem("myVotes" + i);
        if (!votesStr) continue;
        
        const votes = JSON.parse(votesStr);
        const last = (i === listNo);

        for (let j = 0; j < votes.length; j++) {
            const id = votes[j];
            if (myVotes[id]) {
                myVotes[id].count++;
            } else {
                myVotes[id] = { count: 1 };
            }
            if (last) {
                myVotes[id].last = true;
            }
        }
    }

    for (let i = 0; i < setList.length; i++) {
        setList[i].votes = myVotes[setList[i].id];
    }
}

const setVotes = (listNo) => {
    const voteContent = document.querySelector('.vote__content');

    if (voteContent) {
        const voteButton = voteContent.querySelector('button');

        voteButton.addEventListener('click', () => {
            extraTools.hidden = true;

            const votedItems = voteList.querySelectorAll('.vote-item input:checked');
            const votedListArray = [];
            for (let i = 0; i < votedItems.length; i++) {
                votedListArray.push(+votedItems[i].value);
            }

            localStorage.setItem("myVotes" + listNo, JSON.stringify(votedListArray));
        });
    }
}

const setVoteSection = (listNo) => {
    const voteSection = document.querySelector('.layout__action');

    if (voteSection) {
        const cardBody = voteSection.querySelector('.card-body');

        const button = cardBody.querySelector('button');
        button.classList.remove('mb-lg-4');

        button.insertAdjacentHTML('beforebegin', `<div id="averageSeniority"><span class="vote__text">Średni staż: <strong class="vote__seniority">0.00</strong> (tyg.)</span></div>`);
        const votedSeniority = cardBody.querySelector('strong.vote__seniority');

        voteSection.insertAdjacentHTML('beforeend', `<div id="votedList"><ol></ol></div>`);
        const votedList = voteSection.querySelector('#votedList ol');
        const voteCounter = voteSection.querySelector('.vote__votes');

        const observer = new MutationObserver(() => {
            const checkedItems = voteList.querySelectorAll('ul.list-group input[type="checkbox"]:checked');
            const checkedArray = Array.from(checkedItems);

            let listHTML = "";
            const selectedIds = [];
            for (let i = 0; i < checkedArray.length; i++) {
                const item = checkedArray[i];
                const vid = item.id;
                const song = item.parentElement.lastChild.textContent.replace("\n", " - ");
                listHTML += `<li for="${vid}">${song}</li>`;
                selectedIds.push(item._value);
            }

            const averageSeniority = selectedIds.length ? 
                selectedIds.reduce((acc, id) => acc + (seniorityDic[id] || 0), 0) / selectedIds.length : 0;
            votedSeniority.textContent = averageSeniority.toFixed(2);

            votedList.textContent = null;
            votedList.insertAdjacentHTML('beforeend', listHTML);

            const votedItems = voteList.querySelectorAll('.vote-item input:checked');
            const votedListArray = [];
            for (let i = 0; i < votedItems.length; i++) {
                votedListArray.push(+votedItems[i].value);
            }

            localStorage.setItem("myVotes" + listNo, JSON.stringify(votedListArray));
        });
        
        votedList.addEventListener("click", (e) => {
            if (e.target.tagName === 'LI') {
                const forId = e.target.getAttribute("for");
                const input = voteList.querySelector(`#${forId}`);
                if (input) input.click();
            }
        });

        observer.observe(voteCounter, { characterData: true, subtree: true });
    }
}

//-----------------------------------------------

(function() {
    getList(urlSettingsList).then(setList => {
        let voteListEl, listNo;
        let items = [];

        const checkForElement = () => {
            voteListEl = document.querySelector('.vote-list');
            if (!voteListEl) {
                requestAnimationFrame(checkForElement);
                return;
            }

            const heading = document.querySelector('.header__heading-voting');
            listNo = +heading.textContent.split('#')[1];
            getVotes(listNo, setList);

            items = Array.from(voteListEl.querySelectorAll('.list-group-item:not([hidden])'));

            setSearch(voteListEl, items);
            addTags(listNo, setList);
            setVoteSection(listNo);
            addRemovedList();
        };
        
        requestAnimationFrame(checkForElement);
    });
})();
