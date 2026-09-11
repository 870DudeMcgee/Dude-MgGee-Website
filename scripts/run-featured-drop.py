#!/usr/bin/env python3
"""Launch the local adapter using only a private stdin pipe from Keychain."""
import importlib.util,pathlib,subprocess,sys
s=importlib.util.spec_from_file_location('vault',pathlib.Path(__file__).with_name('featured-drop-vault.py'));v=importlib.util.module_from_spec(s);s.loader.exec_module(v)
try:
 token=v.read(v.BLOB)
 if not token:raise RuntimeError('Verified Blob credential unavailable')
 result=subprocess.run(['node',str(v.ROOT/'scripts/featured-drop-activate.js'),*sys.argv[1:]],input=token.encode(),cwd=v.ROOT)
 sys.exit(result.returncode)
except Exception:print('Adapter could not start; no credential output',file=sys.stderr);sys.exit(1)
