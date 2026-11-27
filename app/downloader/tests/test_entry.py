"""入口自举：桌面版随包的 embeddable Python 不会把脚本目录加入 sys.path。"""
from __future__ import annotations
import subprocess,sys,tempfile,unittest
from pathlib import Path

ENTRY=Path(__file__).resolve().parents[1]/'run.py'

def run_entry(*args):
 # -I 隐含 -P 与 -E：sys.path 不含脚本目录，与 python313._pth 接管后的随包解释器一致。
 return subprocess.run([sys.executable,'-I',str(ENTRY),*args],capture_output=True)

class EntryTests(unittest.TestCase):
 def test_startup_imports_sibling_modules_in_isolated_mode(self):
  result=run_entry('--help')
  self.assertEqual(result.returncode,0,result.stderr.decode('utf-8','replace')[-2000:])
  text=result.stdout.decode('utf-8')
  self.assertIn('download',text)
  self.assertIn('论文清单',text)

 def test_isolated_entry_reports_library_errors_through_cli(self):
  with tempfile.TemporaryDirectory() as tmp:
   result=run_entry('--root',tmp,'status')
  self.assertEqual(result.returncode,2)
  self.assertIn('错误：指定目录缺少README.md',result.stderr.decode('utf-8'))
