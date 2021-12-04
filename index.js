require('dotenv').config();
const puppeteer = require('puppeteer');

const USERNAME = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const PUPPETEER_OPTIONS = {
  headless: true,
  timeout: 60_000,
  args: [
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-first-run',
    '--no-sandbox',
    '--no-zygote',
    '--single-process',
  ],
};

const browserPromise = puppeteer.launch(PUPPETEER_OPTIONS);

async function main() {
  const browser = await browserPromise;
  const page = await browser.newPage();
  try {
    await page.goto('https://www.puregym.com/members/');
    await page.waitForSelector('input[name=username]');
    await page.$eval('input[name=username]', (e, value) => (e.value = value), USERNAME);

    await page.waitForSelector('input[name=password]');
    await page.$eval('input[name=password]', (e, value) => (e.value = value), PASSWORD);
    await page.type('input[name=password]', String.fromCharCode(13)); // ... return

    await page.waitForSelector('#people_in_gym', { timeout: 10_000 });
    const people = (
      await page.evaluate(() => {
        const parent = document.getElementById('people_in_gym');
        return parent.getElementsByTagName('span')[0].innerHTML;
      })
    ).match(/\d+/g)[0];

    console.log(`There are ${people} people at the gym at ${new Date().toLocaleString()}.`);
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}

main();
