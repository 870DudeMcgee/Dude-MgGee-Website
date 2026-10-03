import csv,json,collections,statistics,pathlib,hashlib
from urllib.parse import urlparse
P=pathlib.Path(__file__).parent
read=lambda f:list(csv.DictReader((P/f).open()))
c=read('citations.csv'); d=read('cited_domains.csv'); a=read('answers.csv'); raw=[json.loads(l) for l in (P/'answers_raw.jsonl').read_text().splitlines() if l.strip()]
farm={'worldmetrics.org','gitnux.org','wifitalents.com'}
reg=lambda u:'.'.join(urlparse(u).netloc.lower().replace('www.','').split('.')[-2:])
from_raw=collections.Counter((r['model'],r['cat'],u,reg(u)) for r in raw for u in r['citations'])
from_csv=collections.Counter((r['model'],r['category'],r['citation_url'],r['domain']) for r in c)
assert from_raw==from_csv
counts=collections.Counter(r['domain'] for r in c)
assert counts==collections.Counter({r['domain']:int(r['citations']) for r in d})
assert len(raw)==760 and len({r['cat'] for r in raw})==380 and len(a)==3800
by=collections.defaultdict(list)
for r in raw: by[r['cat']].append(r)
ident=sum(v[0]['citations']==v[1]['citations'] for v in by.values())
f=[r for r in c if r['domain'] in farm]
unrank=sum(not r['tranco_rank'] for r in c)
low=sum(not r['tranco_rank'] or int(r['tranco_rank'])>100000 for r in c)
out={'raw_calls':len(raw),'categories':len(by),'citation_rows':len(c),'domains':len(counts),'farm_citations':len(f),'farm_share_pct':100*len(f)/len(c),'farm_categories':len({r['category'] for r in f}),'farm_by_domain':{k:counts[k] for k in sorted(farm)},'unranked_citations':unrank,'worse_than_100k_including_unranked':low,'worse_share_pct':100*low/len(c),'unranked_share_pct':100*unrank/len(c),'wikipedia_citations':counts['wikipedia.org'],'guideflow_citations':counts['guideflow.com'],'guideflow_rank':1+sum(n>counts['guideflow.com'] for n in counts.values()),'identical_lists_categories':ident,'median_rank_of_ranked':statistics.median(int(r['tranco_rank']) for r in c if r['tranco_rank']),'raw_keys':sorted(set().union(*(r.keys() for r in raw))),'sitemap_best_sum_from_summary':sum(v['best_pages'] for k,v in json.loads((P/'sitemaps.json').read_text()).items() if k in farm)}
out['sha256']={f:hashlib.sha256((P/f).read_bytes()).hexdigest() for f in ['answers_raw.jsonl','citations.csv','cited_domains.csv','sitemaps.json']}
(P/'reproduction.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
