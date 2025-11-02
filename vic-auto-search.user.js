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

                inputElement.focus();

                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeInputValueSetter.call(inputElement, tagNo);

                const inputEvent = new Event('input', { bubbles: true });
                const changeEvent = new Event('change', { bubbles: true });

                Object.defineProperty(inputEvent, 'target', { writable: false, value: inputElement });
                Object.defineProperty(changeEvent, 'target', { writable: false, value: inputElement });

                inputElement.dispatchEvent(inputEvent);
                inputElement.dispatchEvent(changeEvent);

                setTimeout(() => {
                    inputElement.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    }));

                    console.log('Enter key pressed, waiting for results...');

                    const checkForRow = setInterval(() => {
                        const clickableRow = document.querySelector('.row.clickable.darker.MuiBox-root');

                        if (clickableRow) {
                            console.log('Found clickable row, clicking...');
                            clickableRow.click();
                            clearInterval(checkForRow);
                            window.location.hash = '';
                        }
                    }, 500);

                    setTimeout(() => {
                        clearInterval(checkForRow);
                        console.log('Timeout waiting for clickable row');
                    }, 10000);
                }, 100);

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
