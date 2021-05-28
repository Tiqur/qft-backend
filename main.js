const puppeteer = require('puppeteer-extra');
const WebSocket = require('ws');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { PendingXHR } = require('pending-xhr-puppeteer');
puppeteer.use(StealthPlugin());

function delay(time) {
   return new Promise(function(resolve) { 
       setTimeout(resolve, time)
   });
}


function updateOrCreate(jsonToUpdate, key, value) {
  jsonToUpdate[key] = value;
}

(async () => {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  const pendingXHR = new PendingXHR(page)
  await page.goto('https://charts.bogged.finance/?token=0xEE40498EB660383722d7CC07b4bcE40d9E51A13F', { waitUntil: ['load', 'domcontentloaded'] });
  await pendingXHR.waitForAllXhrFinished();
  const jsonData = {};
  let lastSent = "";
  
  // Wait for info
  const waitForInfo = await page.waitForSelector('[class="dark:text-white text-gray-800 text-sm md:text-lg"]');
  
  // Create websocket server
  const server = new WebSocket.Server({host: '0.0.0.0', port: 3001 });
  server.on('connection', async (ws) => {

    // Get data
    setInterval(async () => {
      const elementsh4 = await page.$$('[class="flex flex-col"]');

      for (let i = 0; i < elementsh4.length; i++) {
        const html = (await (await elementsh4[i].getProperty('innerHTML')).jsonValue()).toString();
        const phtml = html.substring(0, html.length - 1);
        const data = (phtml.substring(phtml.lastIndexOf('>')+1, phtml.lastIndexOf('</'))).trim();
        if (html.includes('>Price'))      updateOrCreate(jsonData, "price", data);
        if (html.includes('>24h Change')) updateOrCreate(jsonData, "change", data);
        if (html.includes('>24h Volume')) updateOrCreate(jsonData, "volume", data);
        if (html.includes('>Liquidity'))  updateOrCreate(jsonData, "liquidity", data);
        if (html.includes('>Marketcap'))  updateOrCreate(jsonData, "marketcap", data);
      }
      stringData = JSON.stringify(jsonData);

      if (lastSent != stringData) {
        console.log(stringData)
        ws.send(stringData);
        lastSent = stringData;
      }
      
    }, 100)
  });

})();
