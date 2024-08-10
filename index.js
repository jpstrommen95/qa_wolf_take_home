const { chromium } = require("playwright");

function toString({
  id,
  index,
  timeDescription,
  timestamp,
  title,
}) {
  return `${index + 1}. ${id}:"${title}" from ${timeDescription}:${timestamp}`;
}

/**
 * Fetch articles from Hacker News by clicking the "More" button until fetching the requested number of articles.
 * 
 * @param numArticles - the number of articles to fetch
 * 
 * @returns an array of article objects
 */
async function fetchArticles({ numArticles }) {
  // Launch the browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let articlesData = [];
  let count = 0;  // Total count of articles fetched so far

  await page.goto('https://news.ycombinator.com/newest');

  while (articlesData.length < numArticles) {
    // Extract articles from the current page
    const newArticlesData = await page.$$eval('.athing', articles =>
      articles.map(article => ({
        id: article.id,
        title: article.querySelector('.titleline a').innerText,
        timeDescription: article.nextSibling.querySelector('.age').innerText,
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

    await page.waitForSelector('.athing', { state: 'attached' });
  }

  await browser.close();

  return articlesData.slice(0, numArticles).map((article, index) => ({
    ...article,
    index,
  }));
};

/**
 * Prints titles for each article.
 * 
 * @param articles - the pre-retrieved articles
 */
async function printHackerNewsTitles({ articles }) {
  articles.forEach((article) => console.log(toString(article)));
}

/**
 * Checks if the articles are sorted from newest to oldest.
 * And reports the result to console.
 * 
 * @param articles - the pre-retrieved articles to check
 */
async function checkHackerNewsArticlesSorted({ articles }) {
  // Validate that the articles are sorted from newest to oldest
  const isSorted = articles.every((article, index) => {
    if (index === 0) return true;
    const previousArticle = articles[index - 1];
    const isAfterPrevious = (article.timestamp >= previousArticle.timestamp);

    if (!isAfterPrevious) {
      console.log(`Expected ${toString(previousArticle)} to be before ${toString(article)}.`);
    }

    return isAfterPrevious;
  });

  console.log(`The articles are ${isSorted ? '' : 'NOT '}sorted from newest to oldest.`);
}

(async () => {
  const articles = await fetchArticles({ numArticles: 100 });

  // console.log('raw articles', JSON.stringify(articles, null, 2));

  await checkHackerNewsArticlesSorted({ articles });
  await printHackerNewsTitles({ articles });
})();
