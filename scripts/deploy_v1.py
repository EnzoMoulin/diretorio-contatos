import json, os, glob, urllib.request, urllib.parse

DESC = os.environ.get('DEPLOY_DESC', 'update')
toks = json.load(open(os.path.expanduser('~/.clasprc.json')))['tokens']
t = toks['default']
d = urllib.parse.urlencode({'client_id': t['client_id'], 'client_secret': t['client_secret'],
                            'refresh_token': t['refresh_token'], 'grant_type': 'refresh_token'}).encode()
acc = json.load(urllib.request.urlopen('https://oauth2.googleapis.com/token', d, timeout=60))['access_token']
H = {'Authorization': 'Bearer ' + acc, 'Content-Type': 'application/json'}

def api(method, url, body=None, timeout=300):
    req = urllib.request.Request(url, data=(json.dumps(body).encode() if body is not None else None),
                                 headers=H, method=method)
    return json.load(urllib.request.urlopen(req, timeout=timeout))

local = []
for f in sorted(glob.glob('src/backend/*.gs')):
    if os.path.basename(f).startswith('24_DadosExemplo'):
        continue
    local.append({'name': os.path.basename(f)[:-3], 'type': 'SERVER_JS',
                  'source': open(f, encoding='utf-8').read()})
for f in sorted(glob.glob('src/frontend/*.html')):
    local.append({'name': os.path.basename(f)[:-5], 'type': 'HTML',
                  'source': open(f, encoding='utf-8').read()})

projs = [('pub', '1IazOZuEZDdTeHV5xO-Du5IYQYGfCwXm5a8DPFUh7CJYDOGs_dPPs1h27', 'ANYONE_ANONYMOUS',
          'AKfycbx5d3bKgdwrC7dgwdwBFx_1UNtJrpoG-obsttDtVaq25hiP7ToQvUNDnI6Hwey2k90qJA'),
         ('priv', '1taoTp_tpM1MaQTWGRHLo3en4QJq2ptAutx5oNjVotoJyVOxLmktrlhHe', 'ANYONE', 'AKfycbzZgR_Y5PZvBGKnIAqK3_KXqJzM1Er--CS0PcOc197YQxIbDV_ZOsF6wQFD6EEEEYSF')]
for pn, pid, access, depid in projs:
    rem = api('GET', 'https://script.googleapis.com/v1/projects/' + pid + '/content')
    keep = [f for f in rem['files'] if f['name'] in ('24_MascararCopiaPessoal',)]
    manifest = {'name': 'appsscript', 'type': 'JSON', 'source': json.dumps({
        'timeZone': 'America/Sao_Paulo', 'dependencies': {},
        'exceptionLogging': 'STACKDRIVER', 'runtimeVersion': 'V8',
        'webapp': {'executeAs': 'USER_DEPLOYING', 'access': access}}, indent=2, ensure_ascii=False)}
    api('PUT', 'https://script.googleapis.com/v1/projects/' + pid + '/content',
        {'files': [manifest] + local +
         [{'name': k['name'], 'type': k['type'], 'source': k.get('source', '')} for k in keep]})
    # Versões são imutáveis (sem API de apagar): antes de fotografar, confirma
    # que todos os arquivos gravaram (evita snapshot parcial de corrida)
    import hashlib as _hl, time as _t
    def _fp(files):
        return _hl.md5(json.dumps(sorted([(f['name'], f.get('source', '')) for f in files
                                          if f['name'] != 'appsscript']),
                                   ensure_ascii=False).encode('utf-8')).hexdigest()
    _alvo = _fp(local + [{'name': k['name'], 'type': k['type'], 'source': k.get('source', '')} for k in keep])
    for _tent in range(20):
        try:
            _rem = api('GET', 'https://script.googleapis.com/v1/projects/' + pid + '/content')
            if _fp(_rem.get('files', [])) == _alvo:
                break
        except Exception:
            pass
        _t.sleep(3)
    ver = api('POST', 'https://script.googleapis.com/v1/projects/' + pid + '/versions', {'description': DESC})
    if depid is None:
        deps = api('GET', 'https://script.googleapis.com/v1/projects/' + pid + '/deployments')
        depid = [x['deploymentId'] for x in deps.get('deployments', [])
                 if x.get('deploymentConfig', {}).get('versionNumber') is not None][0]
    r = api('PUT', 'https://script.googleapis.com/v1/projects/' + pid + '/deployments/' + depid,
            {'deploymentConfig': {'versionNumber': ver['versionNumber'], 'manifestFileName': 'appsscript'}})
    print(pn, 'versao', ver['versionNumber'],
          'deploy v' + str(r['deploymentConfig']['versionNumber']), flush=True)
