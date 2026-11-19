import importlib.util, os, sys, tempfile
from pathlib import Path
spec = importlib.util.spec_from_file_location('col', str(Path(__file__).resolve().parent.parent / 'hakoniwa/mods/hakoniwa/py/hakoniwa-collector.py')); col = importlib.util.module_from_spec(spec); spec.loader.exec_module(col)
h = Path('/home/u')
assert col.default_out_dir({}, h, 'linux', 'posix') == h/'.local/state/hakoniwa'
assert col.default_out_dir({'XDG_STATE_HOME': '/x/state'}, h, 'linux', 'posix') == Path('/x/state/hakoniwa')
assert col.default_out_dir({'XDG_STATE_HOME': 'rel'}, h, 'linux', 'posix') == h/'.local/state/hakoniwa'
assert col.default_out_dir({}, h, 'darwin', 'posix') == h/'Library/Application Support/hakoniwa'
assert col.default_out_dir({'LOCALAPPDATA': 'C:/L'}, h, 'win32', 'nt') == Path('C:/L')/'hakoniwa'
assert col.default_out_dir({}, h, 'win32', 'nt') == h/'AppData/Local/hakoniwa'
assert col.parse_proc_stat('12 (a (b) c) S 7 12 12') == (7, 'a (b) c')
assert col.parse_proc_stat('garbage') is None
assert col._script_name(['node', '/h/.claude/plugins/x/server.mjs']) is None
assert col._script_name(['node', '--flag', '/usr/lib/node_modules/@anthropic-ai/claude-code/cli.js']) == 'claude'
assert col._script_name(['node', '/usr/bin/codex']) == 'codex'
assert col.parse_ps('  10  1  2048 /Applications/Herdr.app/Contents/MacOS/herdr-app\n 11 10 100 claude\nbad\n') == {10: (1, 'herdr-app', 2048*1024), 11: (10, 'claude', 102400)}
with tempfile.TemporaryDirectory() as d:
    d = Path(d); old = d/'AppData/Local/hakoniwa'; old.mkdir(parents=True); (old/'cache.json').write_text('{}'); new = d/'.local/state/hakoniwa'
    assert col.adopt_legacy_dir(new, old) is True and (new/'cache.json').is_file() and not (d/'AppData').exists()
    assert col.adopt_legacy_dir(new, old) is False
    old.mkdir(parents=True); (old.parent/'other').write_text('x')
    assert col.adopt_legacy_dir(new, old) is False and old.is_dir()   # new exists: nothing touched
t = col.process_table(); me = os.getpid()
assert me in t and t[me][0] == os.getppid(), t.get(me)
assert col.posix_memory_reader()(me) > 1_000_000
print('ok', len(t), 'procs; me =', t[me], 'rss', col.posix_memory_reader()(me))
print('claude pids', [(p, v) for p, v in t.items() if v[1].startswith('claude') and 'desktop' not in v[1]][:5], 'app', col.app_pid(t))
