Output docs/demo.gif
Set FontFamily "JetBrains Mono"
Set FontSize 14
Set Width 780
Set Height 200
Set Theme "Dracula"
Set Padding 24
Set LoopOffset 0%
Set Shell "bash"

Hide
Type "export PS1='$ ' && export PATH=/Users/barnu/.bun/bin:$PATH && cd /Users/barnu/sandbox/private/claude-status-line"
Enter
Sleep 1s
Show

Type `printf '\033[90m# Healthy — all quotas green\033[0m\n'`
Enter
Sleep 200ms
Type `echo '{"cwd":"/projects/my-app","model":"claude-sonnet-4-6","context_window":{"percentage":22,"tokens":44000,"size":200000},"rate_limits":{"session":{"used":20,"limit":100},"week":{"used":12,"limit":100}}}' | bun run src/index.ts`
Enter
Sleep 3s

Type `printf '\n\033[90m# Warning — session at 42%% remaining\033[0m\n'`
Enter
Sleep 200ms
Type `echo '{"cwd":"/projects/my-app","model":"claude-sonnet-4-6","context_window":{"percentage":55,"tokens":110000,"size":200000},"rate_limits":{"session":{"used":58,"limit":100},"week":{"used":28,"limit":100}}}' | bun run src/index.ts`
Enter
Sleep 3s

Type `printf '\n\033[90m# Critical — nearly exhausted\033[0m\n'`
Enter
Sleep 200ms
Type `echo '{"cwd":"/projects/my-app","model":"claude-haiku-4-5-20251001","context_window":{"percentage":94,"tokens":188000,"size":200000},"rate_limits":{"session":{"used":88,"limit":100},"week":{"used":70,"limit":100}}}' | bun run src/index.ts`
Enter
Sleep 3s
