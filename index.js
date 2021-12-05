const puppeteer = require('puppeteer');
const { BigQuery } = require('@google-cloud/bigquery');

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const DATASET = 'activity';
const TABLE = 'activity';
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

exports.getActivity = async (event, context) => {
  const browser = await browserPromise;
  const page = await browser.newPage();
  try {
    await page.goto('https://www.puregym.com/members/');

    await page.waitForSelector('input[name=username]');
    await page.$eval('input[name=username]', (e, value) => (e.value = value), USERNAME);

    await page.waitForSelector('input[name=password]');
    await page.$eval('input[name=password]', (e, value) => (e.value = value), PASSWORD);
    await page.type('input[name=password]', String.fromCharCode(13));

    await page.waitForSelector('#people_in_gym', { timeout: 10_000 });
    const people = (
      await page.evaluate(() => {
        const parent = document.getElementById('people_in_gym');
        return parent.getElementsByTagName('span')[0].innerHTML;
      })
    ).match(/\d+/g)[0];

    console.log(`There are ${people} people in PureGym at the moment.`);
    await insertData(people);
  } catch (e) {
    if (e.name === 'PartialFailureError') {
      console.log(e.name);
      for (const err of e.errors) {
        console.error(err);
      }
    } else {
      console.error(e);
    }
  } finally {
    await browser.close();
  }
};

async function insertData(people) {
  const bq = new BigQuery();
  const row = {
    date: bq.datetime(new Date().toISOString()),
    people: parseInt(people),
  };

  await bq.dataset(DATASET).table(TABLE).insert([row]);

  console.log(`Inserted ${1} row.`);
}
