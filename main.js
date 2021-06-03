const puppeteer = require('puppeteer-extra');
const WebSocket = require('ws');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { PendingXHR } = require('pending-xhr-puppeteer');
const HttpsServer = require('https').createServer;
const fs = require('fs');
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

  httpsServer = HttpsServer({
    cert: fs.readFileSync('./.cert/cert.pem', 'utf8'),
    key: fs.readFileSync('./.cert/private.pem', 'utf8')
  })




  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--unlimited-storage', '--full-memory-crash-report', '--full-memory-crash-report'],
    headless: true});
  const page = await browser.newPage();
  const pendingXHR = new PendingXHR(page)
  console.log("Connecting to website..")
  await page.goto('https://charts.bogged.finance/?token=0xEE40498EB660383722d7CC07b4bcE40d9E51A13F', { 
    waitUntil: ['load', 'domcontentloaded'],
    executablePath: '/usr/bin/chromium-browser',
    ignoreDefaultArgs: ['--disable-extensions']
  });

  await pendingXHR.waitForAllXhrFinished();
  const jsonData = {};
  let lastSent = "";
  
  // Wait for info
  const waitForInfo = await page.waitForSelector('[class="dark:text-white text-gray-800 text-sm md:text-lg"]');
  
  // Create websocket server
  console.log("Creating webserver...");
  const server = new WebSocket.Server({host: '0.0.0.0', port: 3001 });
  

  console.log("Done!");
  server.on('connection', async (ws, req) => {

    console.log(`Client connected: ${req.socket.remoteAddress}`);
    ws.send(lastSent);

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
        ws.send(stringData);
        lastSent = stringData;
      }
      
    }, 100)
  });

})();
