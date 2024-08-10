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
        id: article.id,
        title: article.querySelector('.titleline a').innerText,
        timeDescription: article.nextSibling.querySelector('.age').innerText,
      }))
    );

    articlesData = articlesData.concat(newArticlesData);
    currentPage++;
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
