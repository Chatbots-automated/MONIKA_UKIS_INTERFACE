// ==UserScript==
// @name         VIC Animal Auto-Search
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically fills in animal tag number and searches in VIC system
// @author       Your Name
// @match        https://app.brolisherdline.com/animals*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function fillAndSearch() {
        const hash = window.location.hash;
        if (!hash || !hash.startsWith('#search=')) {
            return;
        }

        const tagNo = decodeURIComponent(hash.replace('#search=', ''));
        console.log('Attempting to search for tag:', tagNo);

        const maxAttempts = 20;
        let attempts = 0;

        const intervalId = setInterval(() => {
            attempts++;

            const inputElement = document.querySelector('.MuiInputBase-input.MuiOutlinedInput-input.MuiInputBase-inputSizeSmall.MuiInputBase-inputAdornedStart');

            if (inputElement) {
                console.log('Found input element, filling with:', tagNo);

                inputElement.value = tagNo;
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                inputElement.dispatchEvent(new Event('change', { bubbles: true }));

                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeInputValueSetter.call(inputElement, tagNo);
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));

                setTimeout(() => {
                    const clickableRow = document.querySelector('.row.clickable.darker.MuiBox-root');

                    if (clickableRow) {
                        console.log('Found clickable row, clicking...');
                        clickableRow.click();
                        clearInterval(intervalId);
                        window.location.hash = '';
                    } else {
                        console.log('Clickable row not found yet, waiting...');
                        setTimeout(() => {
                            const retryRow = document.querySelector('.row.clickable.darker.MuiBox-root');
                            if (retryRow) {
                                console.log('Found clickable row on retry, clicking...');
                                retryRow.click();
                                window.location.hash = '';
                            }
                        }, 1000);
                        clearInterval(intervalId);
                    }
                }, 1500);

                clearInterval(intervalId);
            } else if (attempts >= maxAttempts) {
                console.log('Could not find input element after', maxAttempts, 'attempts');
                clearInterval(intervalId);
            }
        }, 300);
    }

    if (window.location.hash.startsWith('#search=')) {
        setTimeout(fillAndSearch, 1000);
    }

    window.addEventListener('hashchange', () => {
        if (window.location.hash.startsWith('#search=')) {
            setTimeout(fillAndSearch, 1000);
        }
    });
})();
