const moment = require('moment');
const { chromium } = require("playwright");

const nowTime = moment();

function convertRelativeTimeToEpoch(timeString) {
  // Regex to capture the number and time unit
  const regex = /(\d+)\s(\w+)\sago/;
  const matches = timeString.match(regex);

  if(!matches) {
    throw new Error('Time string format is incorrect');
  }

  const [, amount, unit] = matches;
  
  // Subtract the time from the current moment
  const pastTime = moment(nowTime).subtract(amount, unit);
  
  // console.debug(`now: ${nowTime}, timeString: ${timeString}, amount: ${amount}, unit: ${unit}, pastTime: ${pastTime}`);

  return pastTime.valueOf(); // Convert to epoch time in ms
}

function toString({
  ageRelativeText,
  ageEpochTime,
  id,
  index,
  title,
}) {
  const metadata = [
    `${index + 1}`.padEnd(3, ' '),
    `${id}`,
    `${ageRelativeText}`.padEnd(14, ' '),
    `${moment(ageEpochTime).toISOString()}`,
    `${title}`,
  ];

  return metadata.join(':');
}

/**
 * Fetch articles from Hacker News by clicking the "More" button until fetching the requested number of articles.
 * 
 * @param numArticles - the number of articles to fetch
 * 
 * @returns an array of article objects
 */
async function fetchArticles({ numArticles, url }) {
  // Launch the browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let articlesData = [];
  let count = 0;  // Total count of articles fetched so far

  await page.goto(url);

  while (articlesData.length < numArticles) {
    // Extract articles from the current page
    const newArticlesData = await page.$$eval('.athing', articles =>
      articles.map(article => ({
        id: article.id,
        title: article.querySelector('.titleline a').innerText,
        ageRelativeText: article.nextSibling.querySelector('.age').innerText, // ex. "5 minutes ago"
        ageLocalTime: article.nextSibling.querySelector('.age').title,
      }))
    );

    articlesData = articlesData.concat(newArticlesData);
    count += newArticlesData.length;

    if (articlesData.length >= numArticles) break;

    // Click the "More" button
    const moreButton = await page.$('.morelink');
    if (moreButton) {
      await moreButton.click();
    } else {
      // If the "More" button is not found, break the loop
      console.log('No more articles to load.');
      break;
    }

    await page.waitForTimeout(1000);
  }

  await browser.close();

  return articlesData.slice(0, numArticles).map((article, index) => ({
    ...article,
    index,
    ageEpochTime: convertRelativeTimeToEpoch(article.ageRelativeText),
  }));
};

/**
 * Prints titles for each article.
 * 
 * @param articles - the pre-retrieved articles
 */
function printHackerNewsTitles({ articles }) {
  articles.forEach((article) => console.log(toString(article)));
}

/**
 * Checks if the articles are sorted from newest to oldest.
 * And reports the result to console.
 * 
 * @param articles - the pre-retrieved articles to check
 */
function checkHackerNewsChronSort({ articles }) {
  // Validate that the articles are sorted from newest to oldest
  const isSorted = articles.every((article, index) => {
    if (index === 0) return true;
    const previousArticle = articles[index - 1];
    const isBeforePrevious = (moment(article.ageLocalTime).isBefore(previousArticle.ageLocalTime));
    const isMatch = article.ageLocalTime === previousArticle.ageLocalTime;
    const isSortedSoFar = isBeforePrevious || isMatch;

    if (!isSortedSoFar) {
      console.log([
        `The articles are NOT sorted from newest to oldest. Expected:`,
        `${toString(previousArticle)}`,
        `to be newer than`,
        `${toString(article)}.`,
      ].join('\n  '));
    }

    return isSortedSoFar;
  });

  if (isSorted) {
    console.log(`The articles are sorted from newest to oldest.`);
  }
}

/**
 * Checks if the articles are sorted based on their id value.
 * And reports the result to console.
 * 
 * @param articles - the pre-retrieved articles to check
 */
function checkHackerNewsIdSort({ articles }) {
  // Validate that the articles are sorted from newest to oldest
  const isSorted = articles.every((article, index) => {
    if (index === 0) return true;
    const previousArticle = articles[index - 1];
    const isSortedSoFar = previousArticle.id >= article.id;

    if (!isSortedSoFar) {
      console.log([
        `The articles are NOT sorted by id. Expected:`,
        `${toString(previousArticle)}`,
        `to have a higher id than`,
        `${toString(article)}.`,
      ].join('\n  '));
    }

    return isSortedSoFar;
  });

  if (isSorted) {
    console.log(`The articles are sorted by id.`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function doTests({ numArticles, url }) {
  console.log(`Fetching from ${url}`);
  console.log(`${`Current Time is`.padEnd(27, ' ')}:${moment(nowTime).toISOString()}`);
  const articles = await fetchArticles({ numArticles, url });
  printHackerNewsTitles({ articles });
  checkHackerNewsChronSort({ articles });
  checkHackerNewsIdSort({ articles });
  console.log(`Completed checking ${url}.`);
}

(async () => {
  const numArticles = 100;
  const urlList = [
    'https://news.ycombinator.com/newest',
    'https://news.ycombinator.com/news',
  ];

  for (const url of urlList) {
    await doTests({ numArticles, url });
    sleep(5000);
  }
})();
