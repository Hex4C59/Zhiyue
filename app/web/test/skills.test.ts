import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatSkillsPrompt, readSkillText, scanSkills, skillsDirectory } from '../src/lib/skills.js';

function repoRoot(): string {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const manifest = path.join(directory, 'package.json');
    if (fs.existsSync(manifest)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8')) as { name?: string };
        if (parsed.name === 'zhiyue') return directory;
      } catch { /* 非项目清单，继续向上查找。 */ }
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error('无法定位项目根目录。');
    directory = parent;
  }
}

function fixture(t: test.TestContext): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zhiyue-skills-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeSkill(root: string, folder: string, source: string): void {
  const directory = path.join(skillsDirectory(root), folder);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'SKILL.md'), source);
}

const simple = (name: string, description: string, body = '# 步骤'): string =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`;

test('扫描技能目录：读取 frontmatter，忽略无描述、非法名称与重名项', (t) => {
  const root = fixture(t);
  writeSkill(root, 'paper-reading', simple('paper-reading', '判断论文是否值得精读，并给出证据。'));
  writeSkill(root, 'folded', '---\nname: literature-scan\ndescription: >\n  扫描一个方向的研究现状，\n  输出候选论文与缺口。\n---\n\n# 扫描\n');
  writeSkill(root, 'missing', '---\nname: missing\ndescription: \n---\n\n# 无描述\n');
  writeSkill(root, 'bad-name', simple('Bad_Name', '名称不合法。'));
  writeSkill(root, 'duplicate', simple('paper-reading', '重复技能。'));
  fs.writeFileSync(path.join(skillsDirectory(root), 'loose.md'), simple('loose', '不在目录内。'));

  const scan = scanSkills(root);
  assert.deepEqual(scan.skills.map((skill) => skill.name), ['literature-scan', 'paper-reading']);
  assert.match(scan.skills[0]?.description ?? '', /扫描一个方向的研究现状， 输出候选论文与缺口/);
  assert.equal(scan.diagnostics.length, 3);
  assert.ok(scan.diagnostics.some((item) => /missing/.test(item)));
  assert.ok(scan.diagnostics.some((item) => /技能名只能/.test(item)));
  assert.ok(scan.diagnostics.some((item) => /同名技能重复/.test(item)));
});

test('系统提示中的技能清单只含名称、描述与位置', (t) => {
  const root = fixture(t);
  writeSkill(root, 'paper-reading', simple('paper-reading', '判断论文是否值得精读。'));
  const skills = scanSkills(root).skills;
  const prompt = formatSkillsPrompt(skills);
  assert.match(prompt, /<available_skills>/);
  assert.match(prompt, /<name>paper-reading<\/name>/);
  assert.match(prompt, /<description>判断论文是否值得精读。<\/description>/);
  assert.match(prompt, /read_skill/);
  assert.match(prompt, /SKILL\.md/);
  assert.equal(formatSkillsPrompt([]), '');
});

test('read_skill 只读取技能目录内的 Markdown/文本，拒绝穿越与非文本文件', (t) => {
  const root = fixture(t);
  writeSkill(root, 'paper-reading', simple('paper-reading', '精读。', '# 正文\n\n1. 读首页。'));
  fs.writeFileSync(path.join(skillsDirectory(root), 'paper-reading', 'checklist.txt'), '核对清单');
  fs.writeFileSync(path.join(skillsDirectory(root), 'paper-reading', 'run.sh'), 'echo unsafe');

  const file = readSkillText(root, 'paper-reading');
  assert.equal(file.file, 'SKILL.md');
  assert.match(file.text, /# 正文/);
  assert.equal(readSkillText(root, 'paper-reading', 'checklist.txt').text, '核对清单');

  assert.throws(() => readSkillText(root, 'paper-reading', '../AGENTS.md'), /路径无效/);
  assert.throws(() => readSkillText(root, 'paper-reading', '/etc/passwd.md'), /路径无效/);
  assert.throws(() => readSkillText(root, 'paper-reading', 'run.sh'), /只允许读取/);
  assert.throws(() => readSkillText(root, 'missing'), /不存在或未加载/);
  assert.throws(() => readSkillText(root, '../paper-reading'), /名称无效/);
});

test('read_skill 拒绝过大的技能文件', (t) => {
  const root = fixture(t);
  writeSkill(root, 'paper-reading', simple('paper-reading', '精读。'));
  fs.writeFileSync(path.join(skillsDirectory(root), 'paper-reading', 'big.txt'), 'x'.repeat(300 * 1024));
  assert.throws(() => readSkillText(root, 'paper-reading', 'big.txt'), /过大/);
});

// 随包技能会原样复制进新库，所以模板本身必须能通过同一套扫描规则。
test('随包技能模板全部通过扫描', (t) => {
  const source = path.join(repoRoot(), 'app/templates/skills');
  const root = fixture(t);
  fs.mkdirSync(skillsDirectory(root), { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory()) fs.cpSync(path.join(source, entry.name), path.join(skillsDirectory(root), entry.name), { recursive: true });
  }
  const scan = scanSkills(root);
  assert.deepEqual(scan.diagnostics, []);
  assert.deepEqual(scan.skills.map((skill) => skill.name), ['paper-experiments', 'paper-reading']);
  for (const skill of scan.skills) {
    assert.ok(skill.description.length > 12, `${skill.name} 的 description 要能让人判断何时使用`);
    assert.match(readSkillText(root, skill.name).text, /\n# /, `${skill.name} 的正文需要一级标题`);
  }
});
