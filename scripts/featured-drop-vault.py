#!/usr/bin/env python3
"""Noninteractive Keychain capture; no credential values in output or arguments."""
import base64,ctypes,datetime,hashlib,hmac,json,os,pathlib,struct,subprocess,sys,time,urllib.request,urllib.parse,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
HELPER='/Users/josh/.codex/worktrees/1c8d/dude-mcgee-social-automations/dist/keychain-helper'
SERVICE='com.dudemcgee.website.vercel.production'
INVENTORY=ROOT/'gates/merch-pilot/featured-drop-credential-inventory.json'
TEAM='team_c76q0CsojvRxyA2hHVP85ncP'
PROJECT='prj_I2zmcDZqJQ6xO2uZ88ziOULSt1Uu'
ACCESS='870dudemcgee.cli-access.v01'
REFRESH='870dudemcgee.cli-refresh.v01'
BLOB='featured-drop-store.read-write.v01'
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs): return None
OPENER=urllib.request.build_opener(NoRedirect)
def keychain(op,account,value=None):
 req={'operation':op,'service':SERVICE,'account':account}
 if value is not None:req['valueBase64']=base64.b64encode(value.encode()).decode()
 data=json.dumps(req).encode();r=subprocess.run([HELPER],input=struct.pack('>I',len(data))+data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env={},timeout=15)
 if r.returncode or r.stderr or len(r.stdout)<5: raise RuntimeError('Keychain helper failed')
 n=struct.unpack('>I',r.stdout[:4])[0]
 if n!=len(r.stdout)-4:raise RuntimeError('Keychain frame failed')
 d=json.loads(r.stdout[4:]);return d

def read(account):
 d=keychain('read',account)
 if d['status']=='not_found':return None
 if d['status']!='ok':raise RuntimeError('Keychain access unavailable')
 return base64.b64decode(d['valueBase64']).decode()
def preflight(accounts):
 lib=ctypes.CDLL('/System/Library/Frameworks/Security.framework/Security');kc=ctypes.c_void_p();status=ctypes.c_uint32()
 if lib.SecKeychainCopyDefault(ctypes.byref(kc))!=0 or lib.SecKeychainGetStatus(kc,ctypes.byref(status))!=0 or status.value&7!=7:raise RuntimeError('Default Keychain must be unlocked and writable before issuance')
 for a in accounts:
  if read(a) is not None:raise RuntimeError('Credential reference already exists; no issuance attempted')
 if not INVENTORY.parent.is_dir():raise RuntimeError('Inventory destination missing')
def capture(values,expiry=None):
 # First follow-up on issuance is creation; only capture/retrieval actions until matched.
 attempted=set()
 while True:
  try:
   for a,v in values.items():
    stored=read(a) if a in attempted else None
    if stored is None:
     attempted.add(a)
     if keychain('create',a,v)['status']!='ok':raise RuntimeError('Keychain create failed')
     stored=read(a)
    if not hmac.compare_digest(stored.encode(),v.encode()):raise RuntimeError('Keychain comparison failed')
   break
  except Exception:
   print('STORAGE VERIFICATION FAILED. Issued material retained in memory; dependent work stopped. Unlock/repair Keychain, then send RECHECK to retry storage only.',flush=True)
   while sys.stdin.readline().strip()!='RECHECK':time.sleep(1)
 now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 records=json.loads(INVENTORY.read_text()) if INVENTORY.exists() else []
 for a in values:
  records.append({'provider':'vercel','application':'dude-mcgee-website','environment':'production','principal':a.split('.')[0],'purpose':'.'.join(a.split('.')[1:-1]),'service':SERVICE,'account':a,'createdAt':now,'expiresAt':expiry if a==ACCESS else None,'verification':'MATCH','verifiedAt':now,'compatibilityNote':'Existing CLI auth.json retained unchanged; this task uses Keychain directly and disables automatic refresh.' if a.startswith('870') else 'Protected Vercel production environment is the approved runtime copy.'})
 tmp=INVENTORY.with_suffix('.new');tmp.write_text(json.dumps(records,indent=2)+'\n');os.replace(tmp,INVENTORY)
 print('Keychain retrieval comparison: SUCCESS; references: '+', '.join(values),flush=True)
def request(url,data=None,token=None,method=None):
 headers={'User-Agent':'dude-mcgee-featured-drop-setup','Accept':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 if isinstance(data,dict):data=json.dumps(data).encode();headers['Content-Type']='application/json'
 if isinstance(data,urllib.parse.ParseResult):raise RuntimeError('Invalid request')
 req=urllib.request.Request(url,data=data,headers=headers,method=method)
 try:
  with OPENER.open(req,timeout=30) as r:
   payload=r.read();return json.loads(payload) if payload else None
 except urllib.error.HTTPError as e:
  # Never expose bodies, URLs or provider error descriptions.
  raise RuntimeError('Provider request failed with HTTP '+str(e.code)) from None

def api(path,data=None,method=None):return request('https://api.vercel.com'+path+('&' if '?' in path else '?')+'teamId='+TEAM,data,read(ACCESS),method)
def refresh():
 preflight([ACCESS,REFRESH,'870dudemcgee.cli-id.v01'])
 metadata=request('https://vercel.com/.well-known/openid-configuration')
 endpoint=metadata['token_endpoint']
 if endpoint != 'https://api.vercel.com/login/oauth/token':raise RuntimeError('Unexpected token endpoint')
 auth=json.loads((pathlib.Path.home()/'Library/Application Support/com.vercel.cli/auth.json').read_text())
 data=urllib.parse.urlencode({'client_id':'cl_HYyOPBNtFMfHhaUn9L4QPfTZz6TP47bp','grant_type':'refresh_token','refresh_token':auth['refreshToken']}).encode()
 req=urllib.request.Request(endpoint,data=data,headers={'Content-Type':'application/x-www-form-urlencoded','User-Agent':'vercel/54.12.2'})
 try:
  with OPENER.open(req,timeout=30) as r:issued=json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError('OAuth refresh failed with HTTP '+str(e.code)+'; no replacement requested') from None
 values={a:issued[k] for k,a in [('access_token',ACCESS),('refresh_token',REFRESH),('id_token','870dudemcgee.cli-id.v01')] if isinstance(issued.get(k),str)}
 capture(values,datetime.datetime.fromtimestamp(time.time()+issued.get('expires_in',0),datetime.timezone.utc).isoformat())
 if ACCESS not in values:raise RuntimeError('No access credential returned')
if __name__=='__main__':
 try:
  if sys.argv[1:]==['preflight']:preflight([ACCESS,REFRESH,BLOB,'870dudemcgee.cli-id.v01']);print('Keychain available; proposed references absent; capture path ready')
  elif sys.argv[1:]==['refresh']:refresh()
  else:raise RuntimeError('Unsupported operation')
 except Exception as e:print(str(e) if isinstance(e,RuntimeError) else 'Setup failed; no secret output',file=sys.stderr);sys.exit(1)
