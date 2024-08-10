const { chromium } = require("playwright");

/**
 * Fetches articles from hacker news, retrieving a custom subset of relevant data.
 * 
 * @param numArticles - the number of articles to fetch
 * 
 * @returns an array of article objects
 * ```
 * {
 *   title,
 *   age,
 * }
 * ```
 */
async function fetchArticles({ numArticles }) {
  // Launch the browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let articlesData = [];
  let currentPage = 1;

  while (articlesData.length < numArticles) {
    // Go to the Hacker News "newest" page, paginated
    await page.goto(`https://news.ycombinator.com/newest?p=${currentPage}`);

    // Extract titles from the current page
    const newArticlesData = await page.$$eval('.athing', articles =>
      articles.map(article => ({
        title: article.querySelector('.titleline a').innerText,
        timestamp: article.nextSibling.querySelector('.age').innerText,
      }))
    );

    articlesData = articlesData.concat(newArticlesData);
    currentPage++;
  }

  await browser.close();

  return articlesData.slice(0, numArticles);
};

/**
 * Prints titles for each article.
 * 
 * @param numArticles - the number of articles to print
 */
async function printHackerNewsTitles({ numArticles }) {
  const articles = await fetchArticles({ numArticles });
  const titles = articles.map(({ title }) => title);

  // Print the first 100 titles (or less if there aren't enough on the site)
  titles.slice(0, numArticles).forEach((title, index) => {
    console.log(`${index + 1}. ${title}`);
  });
}

/**
 * Checks if the first <numArticles> articles are sorted from newest to oldest.
 * And reports the result to console.
 * 
 * @param numArticles - the number of articles to check
 */
async function checkHackerNewsArticlesSorted({ numArticles }) {
  const articles = await fetchArticles({ numArticles });

  // Validate that the articles are sorted from newest to oldest
  const isSorted = articles.every((article, index) => {
    if (index === 0) return true;
    const previousArticle = articles[index - 1];
    return new Date(article.timestamp) <= new Date(previousArticle.timestamp);
  });

  console.log(`The articles are ${isSorted ? '' : 'NOT '}sorted from newest to oldest.`);
}

(async () => {
  const numArticles = 100;

  await checkHackerNewsArticlesSorted({ numArticles });
  await printHackerNewsTitles({ numArticles });
})();
