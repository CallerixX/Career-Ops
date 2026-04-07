const { chromium } = require('playwright');
const { marked } = require('marked');

async function testPdf() {
  try {
    const html = await marked.parse('# Test Resume\n\n- Skill 1\n- Skill 2');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4' });
    await browser.close();
    console.log('PDF success, size:', pdf.length);
  } catch (err) {
    console.error(err);
  }
}
testPdf();
