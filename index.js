const { chromium } = require("playwright");

async function sortHackerNewsArticles() {
  // Launch the browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Go to Hacker News
  await page.goto("https://news.ycombinator.com/newest");

  // Extract the titles and timestamps of the first 100 articles
  const articles = await page.$$eval('.athing', articles => 
    articles.slice(0, 100).map(article => {
      const title = article.querySelector('.titleline a').innerText;
      const timestamp = article.nextSibling.querySelector('.age').innerText;
      return { title, timestamp };
    })
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
  await sortHackerNewsArticles();
})();
