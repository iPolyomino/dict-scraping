const puppeteer = require("puppeteer");
const delay = require("delay");
const fs = require("fs");
const path = require("path");

(async () => {
  const Yougo_ASCII_URL = "http://yougo.ascii.jp/caltar/";
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1200,
    height: 800
  });
  await page.goto(Yougo_ASCII_URL);
  await page.waitFor(".mw-headline");
  const headlineLinks = await page.evaluate(selector => {
    const headlineTag = [...document.querySelectorAll(selector)];
    return headlineTag.map(a => a.href);
  }, ".mw-headline > a");

  const newHeadlineLinks = headlineLinks.concat(headlineLinks.splice(0, 32));

  await asyncForEach(newHeadlineLinks, async indexLink => {
    await page.goto(indexLink);
    await page.waitFor("ul > li > a");
    const links = await page.evaluate(selector => {
      const wordLinkTag = [...document.querySelectorAll(selector)];
      return wordLinkTag.map(a => a.href);
    }, "ul > li > a");
    const wordLinks = links.filter(url =>
      url.match(/http:\/\/yougo\.ascii\.jp\/caltar/g)
    );

    await scraypingWords(page, wordLinks);
  });
  await browser.close();
})();

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const saveWord = (index, body) => {
  fs.writeFile(path.join(__dirname, "results", `${index}.txt`), body, error => {
    if (error) {
      console.log("failed to write file");
      return;
    }
    console.log(`done : ${index}`);
  });
};

const scraypingWords = async (page, wordLinks) => {
  await asyncForEach(wordLinks, async wordLink => {
    await page.goto(wordLink);
    await page.waitFor(".firstHeading");
    await page.waitFor("#bodyContent");
    await delay(1000);
    const word = await page.$eval(".firstHeading", element => {
      return element.textContent;
    });
    const bodyContent = await page.$eval("#bodyContent", element => {
      return element.textContent;
    });

    saveWord(word, bodyContent);
  });
};
