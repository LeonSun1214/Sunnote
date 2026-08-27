import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173';
const SHOTS = process.env.SHOTS;
const errors = [];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
// 确认框一律接受 —— 清空和导入都会连弹两次
page.on('dialog', (d) => d.accept());

const step = async (name, fn) => {
  try { await fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.log(`  ✗ ${name}: ${e.message.split('\n')[0]}`); errors.push(`${name}: ${e.message.split('\n')[0]}`); }
};

/** 在某个模块区块里，给某个题型填总数和错题数。 */
const fillBlock = async (sectionText, taskLabel, total, wrong) => {
  const section = page.locator('section').filter({ has: page.locator('h2', { hasText: sectionText }) }).first();
  const box = section.locator('div.rounded-lg').filter({ hasText: taskLabel }).first();
  await box.getByRole('spinbutton', { name: '题目总数' }).fill(String(total));
  await box.getByRole('spinbutton', { name: '错题数' }).fill(String(wrong));
};

console.log('— 空状态 —');
await page.goto(BASE, { waitUntil: 'networkidle' });
await step('仪表盘空状态渲染', () => page.getByText('从录第一次练习开始').waitFor({ timeout: 5000 }));
await page.screenshot({ path: `${SHOTS}/01-dashboard-empty.png` });

console.log('— 听力录入 —');
await page.goto(`${BASE}/#/listening/new`, { waitUntil: 'networkidle' });
await step('听力表单打开', () => page.getByText('这次的模块走向').waitFor({ timeout: 5000 }));
await step('填套题名', () => page.getByPlaceholder(/官方模考/).fill('官方模考 2'));

// Router 20 题：对话 8 错 1、通知 6 错 2、学术讲座 6 错 3 → 答对 14/20 = 70%，刚好压线
await step('填 Router 三个题型（合计 20 题，错 6）', async () => {
  await fillBlock('Router', '对话', 8, 1);
  await fillBlock('Router', '通知', 6, 2);
  await fillBlock('Router', '学术讲座', 6, 3);
});
await step('Router 压线提示：答对 14 题正好过 70%', () =>
  page.getByText(/过了 70% 分流线/).first().waitFor({ timeout: 3000 }));
await page.screenshot({ path: `${SHOTS}/02-listening-form.png`, fullPage: true });

await step('切到 Lower 后学术讲座被禁用', async () => {
  await page.getByRole('button', { name: /^Lower/ }).first().click();
  await page.getByText('Lower 模块没有这个题型').first().waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/03-lower-disabled.png`, fullPage: true });

await step('切回 Upper 后 Router 已填的数据没被清掉', async () => {
  await page.getByRole('button', { name: /^Upper/ }).first().click();
  const v = await page.locator('section').filter({ has: page.locator('h2', { hasText: 'Router' }) }).first()
    .locator('div.rounded-lg').filter({ hasText: '对话' }).first()
    .getByRole('spinbutton', { name: '题目总数' }).inputValue();
  if (v !== '8') throw new Error(`Router 对话题数应为 8，实际 ${v}`);
});

await step('填 Upper（15 题错 3）并保存', async () => {
  await fillBlock('Upper', '对话', 15, 3);
  await page.getByRole('button', { name: '保存这次练习' }).click();
  await page.waitForURL(/#\/listening\/session\//, { timeout: 5000 });
});
await step('详情页总正确率 = 26/35 = 74%', () =>
  page.getByText('74%').first().waitFor({ timeout: 3000 }));
await page.screenshot({ path: `${SHOTS}/04-session-detail.png`, fullPage: true });

console.log('— 从错题跳去记笔记 —');
await step('「记笔记」链接带上练习和题型上下文', async () => {
  await page.getByRole('link', { name: '记笔记' }).first().click();
  await page.waitForURL(/#\/listening\/note\/new/, { timeout: 5000 });
  await page.getByText('来自 官方模考 2').waitFor({ timeout: 3000 });
});
await step('写笔记并保存', async () => {
  await page.getByPlaceholder(/转折信号词/).fill('学术讲座的转折信号词');
  await page.locator('textarea').first().fill('错在哪：however 后面才是重点，我盯着前半句了。\n\n下次：听到 but / however / actually 立刻记后半句。');
  await page.getByRole('button', { name: '+ 没听懂' }).click();
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForURL(/tab=notes/, { timeout: 5000 });
  await page.getByText('学术讲座的转折信号词').waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/05-notes.png`, fullPage: true });

// 阅读走「考砸」那条路径：Router 未达线 → Lower。听力测的是达线 → Upper，
// 所以未达线提示和 Lower 的完整保存至今没被跑到过。
console.log('— 阅读：Router 未达线 → Lower —');
await page.goto(`${BASE}/#/reading/new`, { waitUntil: 'networkidle' });
await step('阅读表单打开', () => page.getByText('这次的模块走向').waitFor({ timeout: 5000 }));
await step('选 Lower 路径', async () => {
  await page.getByPlaceholder(/官方模考/).fill('官方模考 3');
  await page.getByRole('button', { name: /^Lower/ }).first().click();
});
await step('阅读三个题型在 Lower 下都可用（不像听力有禁用项）', async () => {
  const disabled = await page.getByText(/模块没有这个题型/).count();
  if (disabled !== 0) throw new Error(`阅读不该有禁用题型，实际有 ${disabled} 个`);
});

// Router 20 题：词汇 7 错 3、短篇 7 错 3、长文 6 错 2 → 答对 12/20 = 60%，门槛 14 题，差 2
await step('填 Router 三个题型（合计 20 题，错 8）', async () => {
  await fillBlock('Router', '词汇填空', 7, 3);
  await fillBlock('Router', '短篇实用文本', 7, 3);
  await fillBlock('Router', '学术长文', 6, 2);
});
await step('Router 未达线提示：答对 12 题，还差 2 题', async () => {
  await page.getByText(/还差 2 题/).first().waitFor({ timeout: 3000 });
  await page.getByText(/封顶 Band 4/).first().waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/06-reading-below-threshold.png`, fullPage: true });

// Lower 15 题：词汇 5 错 2、短篇 5 错 2、长文 5 错 1 → 10/15
await step('填 Lower（15 题错 5）并保存', async () => {
  await fillBlock('Lower', '词汇填空', 5, 2);
  await fillBlock('Lower', '短篇实用文本', 5, 2);
  await fillBlock('Lower', '学术长文', 5, 1);
  await page.getByRole('button', { name: '保存这次练习' }).click();
  await page.waitForURL(/#\/reading\/session\//, { timeout: 5000 });
});
await step('详情页总正确率 = 22/35 = 63%', () =>
  page.getByText('63%').first().waitFor({ timeout: 3000 }));
await step('详情页标出 Router → Lower', () =>
  page.getByText('Router → Lower').waitFor({ timeout: 3000 }));
await step('详情页 Router 区块显示没过分流线', () =>
  page.getByText(/没过 70% 分流线/).first().waitFor({ timeout: 3000 }));
await page.screenshot({ path: `${SHOTS}/07-reading-detail.png`, fullPage: true });

await step('统计页出现 Lower 模块', async () => {
  await page.goto(`${BASE}/#/reading?tab=stats`, { waitUntil: 'networkidle' });
  const modules = page.locator('section').filter({ has: page.locator('h2', { hasText: '分模块正确率' }) });
  await modules.getByText('Lower').waitFor({ timeout: 3000 });
});

console.log('— 口语跟读打点（切科目不该串数据）—');
await page.goto(`${BASE}/#/speaking/new`, { waitUntil: 'networkidle' });
await step('跟读渲染出 7 个圆点', async () => {
  const n = await page.locator('button[aria-label^="第 "]').count();
  if (n !== 7) throw new Error(`应有 7 个圆点，实际 ${n}`);
});
await step('采访渲染出 4 张卡片', async () => {
  const n = await page.getByText(/^模拟采访\s*#\d/).count();
  if (n !== 4) throw new Error(`应有 4 张采访卡，实际 ${n}`);
});
await step('点第 2 个圆点 → 错 2 → 5/7 = 71%', async () => {
  await page.getByPlaceholder(/官方模考/).fill('口语练习 1');
  await page.getByRole('button', { name: '第 2 题' }).click();
  await page.getByText('71%').first().waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/08-speaking-dots.png`, fullPage: true });
await step('保存口语练习', async () => {
  await page.getByRole('button', { name: '保存这次练习' }).click();
  await page.waitForURL(/#\/speaking\/session\//, { timeout: 5000 });
});

console.log('— 写作字数校验 —');
await page.goto(`${BASE}/#/writing/new`, { waitUntil: 'networkidle' });
await step('造句题默认 10 题', async () => {
  const v = await page.locator('div.rounded-lg').filter({ hasText: '造句' }).first()
    .getByRole('spinbutton', { name: '题目总数' }).inputValue();
  if (v !== '10') throw new Error(`Build a Sentence 应默认 10 题，实际 ${v}`);
});
await step('Email 字数不够时提示偏少', async () => {
  await page.getByPlaceholder(/官方模考/).fill('写作练习 1');
  const email = page.locator('section').filter({ hasText: '写邮件' }).first();
  await email.getByPlaceholder(/粘贴或手打/).fill('This is a short reply that is nowhere near long enough for the task.');
  await page.getByText(/偏少/).first().waitFor({ timeout: 3000 });
});
await step('给 Email 打个自评分再保存', async () => {
  const email = page.locator('section').filter({ has: page.locator('h2', { hasText: '写邮件' }) }).first();
  await email.getByRole('button', { name: '3', exact: true }).click();
});
await page.screenshot({ path: `${SHOTS}/09-writing-words.png`, fullPage: true });
await step('保存写作练习', async () => {
  await page.getByRole('button', { name: '保存这次练习' }).click();
  await page.waitForURL(/#\/writing\/session\//, { timeout: 5000 });
});

console.log('— 生词本 —');
await page.goto(`${BASE}/#/vocab`, { waitUntil: 'networkidle' });
await step('加生词并进入抽查模式', async () => {
  await page.getByPlaceholder('单词').fill('mitigate');
  await page.getByPlaceholder('释义').fill('减轻，缓和');
  await page.getByRole('button', { name: '+ 加入生词本' }).click();
  await page.getByText('mitigate').waitFor({ timeout: 3000 });
  await page.getByRole('button', { name: '抽查模式' }).click();
  await page.getByRole('button', { name: '点开看释义' }).waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/10-vocab.png`, fullPage: true });

console.log('— 持久化 —');
await page.goto(`${BASE}/#/listening`, { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await step('刷新后练习记录还在', () => page.getByText('官方模考 2').first().waitFor({ timeout: 5000 }));

console.log('— 统计 —');
await step('统计页渲染', async () => {
  await page.getByRole('button', { name: /^统计/ }).click();
  await page.getByText('题型正确率').waitFor({ timeout: 3000 });
  await page.getByText('Router 达线率').waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/11-stats.png`, fullPage: true });

console.log('— 仪表盘（有数据）—');
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await step('薄弱题型排行出现', () => page.getByText('薄弱题型').waitFor({ timeout: 3000 }));
await step('备份提醒出现（从没导出过）', () => page.getByText(/还没备份过/).waitFor({ timeout: 3000 }));
await step('Router 达线率 = 50%（听力达线 + 阅读未达线）', async () => {
  // 必须限定在这张卡片里取值：薄弱题型里也有个 50%（听力学术讲座 3/6），
  // 直接 getByText('50%') 会撞上它。
  const tile = page.locator('div.card').filter({ hasText: 'Router 达线率' }).first();
  const text = await tile.innerText();
  if (!text.includes('50%')) throw new Error(`Router 达线率应为 50%，卡片内容：${text.replace(/\n/g, ' | ')}`);
  if (!text.includes('1/2')) throw new Error(`应显示 1/2 次，卡片内容：${text.replace(/\n/g, ' | ')}`);
});
await step('阅读的题型进入薄弱题型排行', async () => {
  const bars = page.locator('section').filter({ has: page.locator('h2', { hasText: '薄弱题型' }) });
  await bars.getByText('词汇填空').waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/12-dashboard-full.png`, fullPage: true });

console.log('— 导出导入往返 —');
await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' });
let exported = null;
await step('导出 JSON 备份', async () => {
  const dl = page.waitForEvent('download', { timeout: 10000 });
  await page.getByRole('button', { name: '导出 JSON 备份' }).click();
  const download = await dl;
  const fs = await import('node:fs/promises');
  exported = `${SHOTS}/../backup.json`;
  await download.saveAs(exported);
  const parsed = JSON.parse(await fs.readFile(exported, 'utf8'));
  if (parsed.sessions.length !== 4) throw new Error(`备份里应有 4 次练习，实际 ${parsed.sessions.length}`);
  if (parsed.notes.length !== 1) throw new Error(`备份里应有 1 条笔记，实际 ${parsed.notes.length}`);
  if (parsed.vocab.length !== 1) throw new Error(`备份里应有 1 个生词，实际 ${parsed.vocab.length}`);
});
await step('清空数据', async () => {
  await page.getByRole('button', { name: '清空所有数据' }).click();
  await page.getByText('数据已清空').waitFor({ timeout: 5000 });
});
await step('导入后数据完整还原', async () => {
  await page.getByRole('button', { name: '覆盖' }).click();
  await page.locator('input[type=file]').setInputFiles(exported);
  await page.getByText(/已覆盖导入/).waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/#/listening`, { waitUntil: 'networkidle' });
  await page.getByText('官方模考 2').first().waitFor({ timeout: 5000 });
});

console.log('— 浅色模式 —');
await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' });
await step('切浅色', async () => {
  await page.getByRole('button', { name: '浅色' }).click();
  await page.waitForFunction(() => !document.documentElement.classList.contains('dark'), { timeout: 3000 });
});
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${SHOTS}/13-light-mode.png`, fullPage: true });

console.log('— 手机视口 —');
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${BASE}/#/listening/new`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(500);
await mobile.screenshot({ path: `${SHOTS}/14-mobile-form.png`, fullPage: true });
await step('手机端没有横向溢出', async () => {
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error('页面出现横向滚动');
});
await mobile.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await mobile.screenshot({ path: `${SHOTS}/15-mobile-dashboard.png`, fullPage: true });

await browser.close();

console.log('\n' + '='.repeat(52));
if (errors.length) {
  console.log(`发现 ${errors.length} 个问题：`);
  for (const e of errors) console.log('  - ' + e);
  process.exit(1);
}
console.log('全部通过，且无控制台报错');
