"""从 Crossref 的出版登记生成可离线使用的引文快照。"""
from difflib import SequenceMatcher
from urllib.parse import quote, urlencode
from common import norm, normalize_doi, now


def publication_from_work(work):
    if not isinstance(work, dict):
        return None
    doi = normalize_doi(work.get('DOI'))
    def first(field):
        values = work.get(field)
        return values[0].strip() if isinstance(values, list) and values and isinstance(values[0], str) else ''
    title = first('title')
    if not doi or not title:
        return None
    authors = []
    for author in work.get('author') or []:
        if isinstance(author, dict):
            name = author.get('name') or ' '.join(s for s in (author.get('given'), author.get('family')) if isinstance(s, str))
            if isinstance(name, str) and name.strip():
                authors.append(name.strip())
    year = ''
    for field in ('published-print', 'published', 'issued'):
        date = work.get(field)
        parts = date.get('date-parts') if isinstance(date, dict) else None
        if isinstance(parts, list) and parts and isinstance(parts[0], list) and parts[0] and type(parts[0][0]) is int:
            year = str(parts[0][0])
            break
    def count(key):
        value = work.get(key)
        return value if type(value) is int and value >= 0 else None
    def text(value):
        return value.strip() if isinstance(value, str) else ''
    event = work.get('event')
    return {'doi': doi, 'title': title, 'authors': authors, 'year': year,
            'venue': first('container-title') or (text(event.get('name')) if isinstance(event, dict) else ''),
            'volume': text(work.get('volume')), 'issue': text(work.get('issue')),
            'pages': text(work.get('page')) or text(work.get('article-number')),
            'citedBy': count('is-referenced-by-count'), 'references': count('reference-count'), 'checkedAt': now()}


def lookup_entry(entry, transport):
    title = norm(entry.get('title') or '')
    doi = normalize_doi(entry.get('doi') or entry.get('validation', {}).get('header_doi'))
    if doi:
        url = 'https://api.crossref.org/works/' + quote(doi, safe='')
    elif len(title) >= 10:
        url = 'https://api.crossref.org/works?' + urlencode({'query.bibliographic': entry['title'], 'rows': 5})
    else:
        return None, '缺少可核对的题名或 DOI', False
    data, attempts = transport.json(url)
    last = attempts[-1] if attempts else {}
    if not isinstance(data, dict):
        status = last.get('http_status', 0)
        return None, f'Crossref 暂无可用结果（HTTP {status}）', status in (0, 429) or status >= 500
    message = data.get('message')
    works = [message] if doi else (message.get('items') if isinstance(message, dict) else [])
    ranked = []
    for work in works if isinstance(works, list) else []:
        pub = publication_from_work(work)
        if pub and (not doi or pub['doi'] == doi):
            score = SequenceMatcher(None, title, norm(pub['title'])).ratio()
            ranked.append((score, pub))
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    if ranked:
        score, pub = ranked[0]
        if doi and (not title or score >= .75):
            return pub, '', False
        if not doi and score >= .94 and (len(ranked) == 1 or score - ranked[1][0] >= .05):
            return pub, '', False
    return None, '出版登记与输入不符或题名存在多个候选', False
