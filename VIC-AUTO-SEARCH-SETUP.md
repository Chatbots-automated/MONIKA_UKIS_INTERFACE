# VIC Auto-Search Setup Instructions

This guide will help you set up automatic animal tag search in the VIC system when clicking the "Ieškoti VIC sistemoje" button.

## What You Need

1. A browser (Chrome, Firefox, Edge, or Opera)
2. Tampermonkey browser extension
3. The userscript file (`vic-auto-search.user.js`)

## Installation Steps

### Step 1: Install Tampermonkey

Choose your browser and install Tampermonkey:

- **Chrome**: [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- **Edge**: [Install from Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- **Opera**: [Install from Opera Add-ons](https://addons.opera.com/en/extensions/details/tampermonkey-beta/)

### Step 2: Install the VIC Auto-Search Script

1. After installing Tampermonkey, you should see the Tampermonkey icon in your browser toolbar
2. Open the file `vic-auto-search.user.js` (located in your project folder)
3. Copy all the content from this file
4. Click the Tampermonkey icon in your browser
5. Click **"Create a new script..."**
6. Delete any existing code in the editor
7. Paste the copied script content
8. Click **File → Save** (or press Ctrl+S / Cmd+S)

### Step 3: Verify Installation

1. Click the Tampermonkey icon
2. You should see "VIC Animal Auto-Search" in the list with a green indicator
3. Make sure it's enabled (toggle switch should be ON)

## How It Works

1. Go to your veterinary management app
2. Navigate to **Gyvūnų registras** (Animals page)
3. Click on any animal to view details
4. Click the **"Ieškoti VIC sistemoje"** button
5. A new tab will open with the VIC system
6. The script will automatically:
   - Fill in the animal's ear tag number in the search field
   - Wait for results to load
   - Click on the matching animal row

## Troubleshooting

### Script not working?

1. **Check if Tampermonkey is enabled**
   - Click the Tampermonkey icon
   - Make sure the script has a green indicator

2. **Check if the script is running on the correct website**
   - The script only works on `https://app.brolisherdline.com/animals*`
   - You should see a small number badge on the Tampermonkey icon when on this site

3. **Clear browser cache**
   - Sometimes cached data can interfere
   - Try clearing your browser cache and reloading

4. **Check browser console for errors**
   - Press F12 to open Developer Tools
   - Go to the "Console" tab
   - Look for any error messages

### Still not working?

- Make sure you're logged into the VIC system
- The VIC website might have changed its HTML structure
- Contact your system administrator for help

## Updating the Script

If the VIC website changes and the script stops working:

1. Click the Tampermonkey icon
2. Click on **"VIC Animal Auto-Search"**
3. Update the script code
4. Save the changes (Ctrl+S / Cmd+S)

## Uninstalling

To remove the auto-search feature:

1. Click the Tampermonkey icon
2. Click **Dashboard**
3. Find "VIC Animal Auto-Search"
4. Click the trash icon to delete

---

**Note**: This script only works when you click the "Ieškoti VIC sistemoje" button from the animal details page. It does not modify any data, only automates the search process.
