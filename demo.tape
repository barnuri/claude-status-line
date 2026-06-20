Output docs/demo.gif
Set FontFamily "JetBrains Mono"
Set FontSize 14
Set Width 1100
Set Height 250
Set Theme "Dracula"
Set Padding 24
Set LoopOffset 0%
Set Shell "bash"

Hide
Type `export PS1='' && export PATH=/Users/barnu/.bun/bin:$PATH && cd /Users/barnu/sandbox/private/claude-status-line`
Enter
Sleep 1s

Type `./scripts/demo-healthy.sh`
Enter
Sleep 800ms
Show
Sleep 3500ms
Hide

Type `./scripts/demo-warning.sh`
Enter
Sleep 800ms
Show
Sleep 3500ms
Hide

Type `./scripts/demo-critical.sh`
Enter
Sleep 800ms
Show
Sleep 3500ms
