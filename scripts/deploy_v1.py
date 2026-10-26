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

projs = [('pub', '10f0eMEr2It2cwYUaM2hUHq78_0ubE9WP_4T9I91UXY_jUUnTFUTaCY7Z', 'ANYONE_ANONYMOUS',
          'AKfycbxZ5Gab4wpc9BC205Hvjngi_xfRz9JZA9ZsWDltwH6im4Fe39wc623wZ-iXtdIQXU4Q'),
         ('priv', '1en6psSTq8WFnL5oXPPumGbP9DbaLeRD4qVAFLw6MkGQBXdwwDDaLOQm-', 'ANYONE', None)]
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
    ver = api('POST', 'https://script.googleapis.com/v1/projects/' + pid + '/versions', {'description': DESC})
    if depid is None:
        deps = api('GET', 'https://script.googleapis.com/v1/projects/' + pid + '/deployments')
        depid = [x['deploymentId'] for x in deps.get('deployments', [])
                 if x.get('deploymentConfig', {}).get('versionNumber') is not None][0]
    r = api('PUT', 'https://script.googleapis.com/v1/projects/' + pid + '/deployments/' + depid,
            {'deploymentConfig': {'versionNumber': ver['versionNumber'], 'manifestFileName': 'appsscript'}})
    print(pn, 'versao', ver['versionNumber'],
          'deploy v' + str(r['deploymentConfig']['versionNumber']), flush=True)
