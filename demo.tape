Output docs/demo.gif
Set FontFamily "JetBrains Mono"
Set FontSize 14
Set Width 1100
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
Type `echo '{"cwd":"/Users/barnu/sandbox/private/claude-status-line","model":{"id":"claude-sonnet-4-6","display_name":"Sonnet 4.6"},"context_window":{"used_percentage":22,"total_input_tokens":44000,"context_window_size":200000},"rate_limits":{"five_hour":{"used_percentage":20,"resets_at":1750478000},"seven_day":{"used_percentage":12,"resets_at":1751064800}}}' | bun run src/index.ts`
Enter
Sleep 3s

Type `printf '\n\033[90m# Warning — context at 65%%\033[0m\n'`
Enter
Sleep 200ms
Type `echo '{"cwd":"/Users/barnu/sandbox/private/claude-status-line","model":{"id":"claude-sonnet-4-6","display_name":"Sonnet 4.6"},"context_window":{"used_percentage":65,"total_input_tokens":130000,"context_window_size":200000},"rate_limits":{"five_hour":{"used_percentage":58,"resets_at":1750478000},"seven_day":{"used_percentage":28,"resets_at":1751064800}}}' | bun run src/index.ts`
Enter
Sleep 3s

Type `printf '\n\033[90m# Critical — nearly exhausted\033[0m\n'`
Enter
Sleep 200ms
Type `echo '{"cwd":"/Users/barnu/sandbox/private/claude-status-line","model":{"id":"claude-haiku-4-5-20251001","display_name":"Haiku 4.5"},"context_window":{"used_percentage":94,"total_input_tokens":188000,"context_window_size":200000},"rate_limits":{"five_hour":{"used_percentage":88,"resets_at":1750478000},"seven_day":{"used_percentage":70,"resets_at":1751064800}}}' | bun run src/index.ts`
Enter
Sleep 3s
