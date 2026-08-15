// 電子報：每天挑一篇還沒寄過的文章，把全文（不只連結）組成 email HTML。
// 用法：node send-daily-email.js build          -> 挑下一篇、寫 email_body.html、輸出 has_new/subject/basename
//      node send-daily-email.js mark <basename> -> 把 basename 標記為已寄送，寫回 _email_manifest.json
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(process.cwd(), '_posts');
const MANIFEST_PATH = path.join(process.cwd(), '_email_manifest.json');
const BASE_URL = 'https://buege1216.github.io/axismag-translations';

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { sent: [] };
  try {
    const data = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (!Array.isArray(data.sent)) data.sent = [];
    return data;
  } catch (e) {
    return { sent: [] };
  }
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

function setOutput(key, value) {
  const outPath = process.env.GITHUB_OUTPUT;
  if (outPath) fs.appendFileSync(outPath, `${key}=${value}\n`);
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 只需要處理 axismag-daily skill 固定會產生的幾種寫法：粗體、連結、圖片、條列、引言區塊。
function inline(text) {
  let t = escapeHtml(text);
  t = t.replace(/!\[[^\]]*\]\(([^)]+)\)/g, '<img src="$1" width="600" style="width:100%;max-width:600px;height:auto;margin:12px 0;display:block;border-radius:4px;">');
  t = t.replace(/\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" style="color:#0645ad;">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\n/g, '<br>');
  return t;
}

function markdownToHtml(md) {
  const blocks = md.split(/\r?\n\r?\n+/).map((b) => b.trim()).filter(Boolean);
  return blocks
    .map((block) => {
      const lines = block.split(/\r?\n/);
      if (lines.every((l) => /^-\s+/.test(l.trim()))) {
        const items = lines.map((l) => `<li>${inline(l.trim().replace(/^-\s+/, ''))}</li>`).join('');
        return `<ul style="margin:8px 0 16px;padding-left:20px;">${items}</ul>`;
      }
      if (block.startsWith('>')) {
        const quoted = lines.map((l) => l.replace(/^>\s?/, '')).join(' ');
        return `<blockquote style="margin:0 0 16px;padding-left:12px;border-left:3px solid #ddd;color:#666;font-size:13px;">${inline(quoted)}</blockquote>`;
      }
      return `<p style="margin:0 0 16px;">${inline(block)}</p>`;
    })
    .join('\n');
}

function parsePost(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const [, fmBlock, body] = match;
  const get = (key) => {
    const m = fmBlock.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
    if (!m) return '';
    return m[1].trim().replace(/^"|"$/g, '').replace(/\\"/g, '"');
  };
  return {
    title: get('title'),
    original_title: get('original_title'),
    source: get('source'),
    date: get('date'),
    image: get('image'),
    categories: get('categories').replace(/[[\]]/g, '').trim(),
    body: body.trim(),
  };
}

function build() {
  const manifest = loadManifest();
  const sent = new Set(manifest.sent);

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md')).sort();
  const nextFile = files.find((f) => !sent.has(f.replace(/\.md$/, '')));

  if (!nextFile) {
    console.log('沒有待寄送的文章，今天不寄信。');
    setOutput('has_new', 'false');
    return;
  }

  const basename = nextFile.replace(/\.md$/, '');
  const post = parsePost(path.join(POSTS_DIR, nextFile));
  if (!post || !post.title) {
    console.log(`無法解析文章前言：${nextFile}，跳過並標記為已處理避免卡住。`);
    manifest.sent.push(basename);
    saveManifest(manifest);
    setOutput('has_new', 'false');
    return;
  }

  const parts = basename.split('-');
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  const slug = parts.slice(3).join('-');
  const url = `${BASE_URL}/${post.categories}/${y}-${m}-${d}-${slug}/`;

  const heroImg = post.image
    ? `<img src="${post.image}" width="600" style="width:100%;max-width:600px;height:auto;border-radius:6px;margin-bottom:16px;display:block;">`
    : '';

  // 用 table 置中而非 div+margin:auto，手機版信箱(Gmail app/原生郵件)對後者支援不穩定，
  // 圖片也同時給 HTML width 屬性(600)+ CSS max-width:100%，避免手機只顯示原始像素寬度左半邊被裁掉。
  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td align="center" style="padding:16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
            <tr>
              <td style="font-family:sans-serif;color:#222;font-size:15px;line-height:1.8;">
                ${heroImg}
                <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">${escapeHtml(post.categories)}</div>
                <h2 style="margin:4px 0 8px;font-size:20px;">${escapeHtml(post.title)}</h2>
                <p style="color:#888;font-size:13px;margin:0 0 20px;">${escapeHtml(post.date)}｜原標題：${escapeHtml(post.original_title)}</p>
                <div>${markdownToHtml(post.body)}</div>
                <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
                <p style="font-size:13px;color:#888;">
                  <a href="${post.source}">閱讀日文原文</a> ・
                  <a href="${url}">在網站上開啟這篇</a> ・
                  <a href="${BASE_URL}">所有文章</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  fs.writeFileSync('email_body.html', html);
  setOutput('has_new', 'true');
  setOutput('subject', `AXIS 雜誌翻譯 - ${post.title}`);
  setOutput('basename', basename);
}

function markSent() {
  const basename = process.argv[3];
  if (!basename) throw new Error('mark 需要帶 basename 參數');
  const manifest = loadManifest();
  if (!manifest.sent.includes(basename)) manifest.sent.push(basename);
  saveManifest(manifest);
  console.log(`已標記為已寄送：${basename}`);
}

const cmd = process.argv[2];
if (cmd === 'build') build();
else if (cmd === 'mark') markSent();
else {
  console.error('用法: node send-daily-email.js build | mark <basename>');
  process.exit(1);
}
