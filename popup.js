var chrome = window.chrome;

function getFile(lang, type) {
	return new Promise(function(resolver) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', chrome.extension.getURL('data/' + lang + '/data.' + type), true);
		xhr.onreadystatechange = function() {
			if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
				var data = xhr.responseText.split('\n');
				data.pop(); //last line is an empty line
				resolver(data);
			}
		};
		xhr.send();
	});
}
function getRandomWord(list) {
	var index = Math.floor(Math.random() * (Math.floor(list.length - 1) + 1));
	console.log(index, list[index])
	return list[index];
}
function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomSpecialsMath() {
	return getRandomWord(['+', '-', '*']);
}
function getRandomSpecialsPonctuation() {
	return getRandomWord(['?', '.', '!']);
}
function saveSettings() {
	var minLength = document.querySelector('#minLength').value,
			maxLength = document.querySelector('#maxLength').value,
			useNumbers = document.querySelector('#numbers').checked,
			useUppercase = document.querySelector('#upper').checked,
			useSpecials = document.querySelector('#specials').checked,
			language = document.querySelector('#language').value;

	chrome.storage.local.set({
		minLength: minLength,
		maxLength: maxLength,
		useNumbers: useNumbers,
		useUppercase: useUppercase,
		useSpecials: useSpecials,
		language: language
	}, function() {});
}
function generatePassword() {
	saveSettings();

	var minLength = document.querySelector('#minLength').value,
			maxLength = document.querySelector('#maxLength').value,
			useNumbers = document.querySelector('#numbers').checked,
			useUppercase = document.querySelector('#upper').checked,
			useSpecials = document.querySelector('#specials').checked,
			language = document.querySelector('#language').value;

	chrome.storage.local.get([language + '.adj', language + '.adv', language + '.noun'], function(items) {
		var password = '';
		while(password.length < minLength || password.length > maxLength) {
			password = [
				useNumbers && !useSpecials ? getRandomInt(1, 99).toString() : '',
				useNumbers && useSpecials ? getRandomInt(1, 9).toString() + getRandomSpecialsMath() + getRandomInt(1, 9).toString() : '',
				getRandomWord(items[language + '.adv']),
				getRandomWord(items[language + '.adj']),
				getRandomWord(items[language + '.noun']),
				useSpecials ? getRandomSpecialsPonctuation() : '',
			].map(function(value) {
				return useUppercase
					? value && (value.slice(0,1).toUpperCase() + value.slice(1)) || ''
					: value;
			}).join('');
		}

		document.querySelector('#password').value = password;
	});
}
function getLang() {
	return new Promise(function(resolver) {
		chrome.storage.local.get('language', function(items) {
			resolver(items.language || document.querySelector('#language').value);
		});
	});
}

function init() {
	getLang().then(function(lang) {
		chrome.storage.local.get(lang + '.adj', function(items) {
			if(items[lang + '.adj']) {
				updateUI();
			} else {
				Promise.all([getFile(lang, 'adj'), getFile(lang, 'adv'), getFile(lang, 'noun')]).then(function(values) {
					var storage = {};
					storage[lang + '.adj'] = values[0];
					storage[lang + '.adv'] = values[1];
					storage[lang + '.noun'] = values[2];
					chrome.storage.local.set(storage, function() {
						updateUI();
					});
				});
			}
		});
	});
}

function updateUI() {
	chrome.storage.local.get(['minLength', 'maxLength', 'useNumbers', 'useUppercase', 'useSpecials'], function(items) {
		document.querySelector('#minLength').value = items.minLength || document.querySelector('#minLength').value;
		document.querySelector('#maxLength').value = items.maxLength || document.querySelector('#maxLength').value;
		document.querySelector('#numbers').checked = items.useNumbers || document.querySelector('#numbers').checked;
		document.querySelector('#specials').checked = items.useSpecials || document.querySelector('#specials').checked;
		document.querySelector('#upper').checked = items.useUppercase || document.querySelector('#upper').checked;

		document.querySelector('#generate').removeAttribute('disabled');
		document.querySelector('#generate').onclick = generatePassword;
		document.querySelector('#language').onchange = function() {
			saveSettings();
			init();
		};
	});
	getLang().then(function(lang) {
			document.querySelector('#language').value = lang;
	});
}

chrome.storage.local.get('previousVersion', function(items) {
	var currentVersion = chrome.runtime.getManifest().version.toString(),
			start = function() {
				chrome.storage.local.set({previousVersion: currentVersion}, function() {});
				init();
			};
	items.previousVersion = items.previousVersion || '';
	if(currentVersion !== items.previousVersion.toString()) {
		chrome.storage.local.clear(start);
		return;
	}
	start();
});
