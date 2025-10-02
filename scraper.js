const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrape() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  let allPosts = [];
  let currentUrl = 'https://www.centraldetraducoes.net.br/';

  while (true) {
    console.log(`Scraping page: ${currentUrl}`);
    await page.goto(currentUrl, { waitUntil: 'networkidle2' });

    const postLinks = await page.evaluate(() => {
      const articles = document.querySelectorAll('article.post-outer-container');
      return Array.from(articles).map(article => {
        const linkEl = article.querySelector('h3.post-title a');
        return linkEl ? linkEl.href : null;
      }).filter(link => link);
    });

    console.log(`Found ${postLinks.length} posts on this page`);

    for (const link of postLinks) {
      console.log(`Scraping post: ${link}`);
      const postPage = await browser.newPage();
      await postPage.goto(link, { waitUntil: 'networkidle2' });
      const postData = await postPage.evaluate(() => {
        const title = document.querySelector('h3.post-title')?.textContent.trim() || '';
        const description = document.querySelector('.descricaoTexto')?.textContent.trim() || '';
        const platform = document.querySelector('.listadeInformacoes li:nth-child(1)')?.textContent.replace('Plataforma: ', '').trim() || '';
        const version = document.querySelector('.listadeInformacoes li:nth-child(2)')?.textContent.replace('Versão: ', '').trim() || '';
        const language = document.querySelector('.listadeInformacoes li:nth-child(3)')?.textContent.replace('Idioma: ', '').trim() || '';
        const supportedVersion = document.querySelector('.listadeInformacoes li:nth-child(4)')?.textContent.replace('Versão Suportada: ', '').trim() || '';
        const supportedLanguage = document.querySelector('.listadeInformacoes li:nth-child(5)')?.textContent.replace('Idioma Suportado: ', '').trim() || '';
        const releaseDate = document.querySelector('.listadeInformacoes li:nth-child(6)')?.textContent.replace('Lançamento: ', '').trim() || '';
        const size = document.querySelector('.listadeInformacoes li:nth-child(7)')?.textContent.replace('Tamanho: ', '').trim() || '';
        const supportLink = document.querySelector('.listadeInformacoes li:nth-child(8) a')?.href || '';
        const credits = Array.from(document.querySelectorAll('.listadeCreditos li')).map(li => li.textContent.trim());
        const notes = Array.from(document.querySelectorAll('.listadeObservacoes li')).map(li => li.textContent.trim());
        const password = document.querySelector('.senhaDescompactar .linkCentral')?.textContent.trim() || '';
        const downloadLink = document.querySelector('.downloadLink a')?.href || '';
        return {
          title,
          description,
          platform,
          version,
          language,
          supportedVersion,
          supportedLanguage,
          releaseDate,
          size,
          supportLink,
          credits,
          notes,
          password,
          downloadLink
        };
      });
      allPosts.push(postData);
      await postPage.close();
    }

    fs.writeFileSync('posts.json', JSON.stringify(allPosts, null, 2));
    console.log(`Saved ${allPosts.length} posts so far`);

    await page.goto(currentUrl, { waitUntil: 'networkidle2' });

    const nextLink = await page.evaluate(() => {
      const link = document.querySelector('.blog-pager-older-link');
      return link ? link.href : null;
    });
    if (!nextLink) break;
    currentUrl = nextLink;
  }

  await browser.close();
  console.log('Scraping complete.');
}

scrape().catch(console.error);