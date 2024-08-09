const { chromium } = require("playwright");

/**
 * Prints titles for each article.
 * 
 * @param numArticles - the number of articles to print
 */
async function printHackerNewsTitles({ numArticles }) {
  // Launch the browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let titles = [];
  let currentPage = 1;

  while (titles.length < numArticles) {
    // Go to the Hacker News "newest" page, paginated
    await page.goto(`https://news.ycombinator.com/newest?p=${currentPage}`);

    // Extract titles from the current page
    const newTitles = await page.$$eval('.athing', articles =>
      articles.map(article => 
        article.querySelector('.titleline a').innerText
      )
    );

    titles = titles.concat(newTitles);
    currentPage++;
  }

  // Print the first 100 titles (or less if there aren't enough on the site)
  titles.slice(0, numArticles).forEach((title, index) => {
    console.log(`${index + 1}. ${title}`);
  });

  await browser.close();
}

/**
 * Checks if the first <numArticles> articles are sorted from newest to oldest.
 * And reports the result to console.
 * 
 * @param numArticles - the number of articles to check
 */
async function checkHackerNewsArticlesSorted({ numArticles }) { // FIXME only does the articles from the first page
  // Launch the browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Go to Hacker News
  await page.goto("https://news.ycombinator.com/newest");

  // Extract the titles and timestamps of the first 100 articles
  const articles = await page.$$eval('.athing', (articles, numArticles) => 
    articles.slice(0, numArticles).map(article => {
      // Note that the structure of an article is a set of 3 adjacent rows:
      // titleline
      // <a bunch of metadata>
      // spacer

      const title = article.querySelector('.titleline a').innerText;
      const timestamp = article.nextSibling.querySelector('.age').innerText;
      return { title, timestamp };
    }),
    numArticles,
  );

  // Validate that the articles are sorted from newest to oldest
  const isSorted = articles.every((article, index) => {
    if (index === 0) return true;
    const previousArticle = articles[index - 1];
    return new Date(article.timestamp) <= new Date(previousArticle.timestamp);
  });

  console.log(`The articles are ${isSorted ? '' : 'NOT '}sorted from newest to oldest.`);

  // Close the browser
  await browser.close();
}

(async () => {
  const numArticles = 100;

  await checkHackerNewsArticlesSorted({ numArticles });
  await printHackerNewsTitles({ numArticles });
})();
