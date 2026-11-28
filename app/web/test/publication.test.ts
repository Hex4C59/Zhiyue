import assert from 'node:assert/strict';
import test from 'node:test';
import { lookupPublication } from '../src/lib/publication.js';

const doi = '10.1234/example';
test('按 DOI 读取会议论文的正式题名、团体作者和计数，保留零值', async () => {
  const publication = await lookupPublication(doi, async (url) => {
    assert.equal(url, `https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    return Response.json({ message: { DOI: doi.toUpperCase(), title: ['Published title'],
      event: { name: 'Conference' }, author: [{ name: 'Group' }], issued: { 'date-parts': [[2024]] },
      'is-referenced-by-count': 0, 'reference-count': 12 } });
  });
  assert.equal(publication.venue, 'Conference');
  assert.deepEqual(publication.authors, ['Group']);
  assert.equal(publication.citedBy, 0);
  assert.equal(publication.references, 12);
});

test('查询缺少 DOI 或服务返回其他论文时报告原因', async () => {
  await assert.rejects(lookupPublication('待核实'), /补充 DOI/);
  await assert.rejects(lookupPublication(doi, async () => Response.json({ message: { DOI: '10.1234/other' } })), /不符/);
});
