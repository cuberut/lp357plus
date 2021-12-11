// ==UserScript==
// @name       LP357+
// @version    0.5
// @include    https://lista.radio357.pl/app/lista/glosowanie
// @grant      none
// ==/UserScript==

const getSetList = async () => {
  const response = await fetch('https://opensheet.vercel.app/1toPeVyvsvh1QB-zpskh3zOxWl-OuSgKauyf7nPu85s8/settingsList');
  const myJson = await response.json();
  return await myJson;
}

const newTag = '<span class="badge badge-primary" style="position: absolute; right: 0; margin-right: 80px;">Nowość!</span>';
const checkNew = '<div><label class="form-check-label"><input id="onlyNew" type="checkbox" onClick="showOnlyNew(this.checked)"><span>Pokaż tylko nowości</span></label></div>';
const checkBet = '<div><label class="form-check-label"><input id="hideBet" type="checkbox" onClick="hideBetoned(this.checked)"><span>Ukryj beton</span></label></div>';

const getLogTag = (lastP, change, times) => {
	return `<div class="chart-item__info" style="width: 110px; position: absolute; right: 0; margin-right: 60px; text-align: left"><span>Ostatnia poz.: ${lastP} (${change})</span><br/><span>tygodnie: ${times}</span></div>`
};

let voteList, currItem, newList, betList, onlyNew, hideBet;

const addTags = () => {
  getSetList().then(setList => {
  	voteList = document.querySelector('.vote-list')
  	voteList.insertAdjacentHTML('afterbegin', checkNew);
	onlyNew = voteList.querySelector('#onlyNew');
	voteList.insertAdjacentHTML('afterbegin', checkBet);
	hideBet = voteList.querySelector('#hideBet');

  	currItem = voteList.querySelectorAll(".list-group-item");
  	setList.forEach((item, i) => {
        const {lastP, isFirst, times, change} = item;
		if (lastP) {
            const logTag = getLogTag(lastP, change, times);
			currItem[i].querySelector('.vote-item').insertAdjacentHTML('beforeend', logTag);
		} else if (item.isNew) {
            currItem[i].querySelector('.vote-item').insertAdjacentHTML('beforeend', newTag);
        }
  	});

  	newList = setList.reduce((list, item, i) => item.isNew ? [...list, i] : list, []);
	betList = setList.reduce((list, item, i) => item.isBet ? [...list, i] : list, []);
  });
}

window.showOnlyNew = (state) => {
	currItem.forEach((item, i) => { item.hidden = state && !newList.includes(i) });
	hideBet.checked = false;
}

window.hideBetoned = (state) => {
	currItem.forEach((item, i) => { item.hidden = state && betList.includes(i) });
	onlyNew.checked = false;
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
