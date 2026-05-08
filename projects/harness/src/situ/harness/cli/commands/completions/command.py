from __future__ import annotations

import argparse
import sys


TOP_LEVEL_COMMANDS = (
    "app",
    "attach",
    "apply",
    "clear",
    "completions",
    "doctor",
    "events",
    "exec",
    "patches",
    "resume",
    "secrets",
    "self",
    "sessions",
    "snapshot",
    "status",
    "tui",
    "version",
    "wait",
    "web",
)

SELF_SUBCOMMANDS = ("update", "uninstall")
SECRETS_SUBCOMMANDS = ("status", "set", "unset", "clear")
SECRETS_ENTITIES = ("anthropic", "logfire")
COMPLETIONS_SHELLS = ("bash", "zsh", "fish")


def run(args: argparse.Namespace) -> int:
    shell = args.shell
    if shell == "bash":
        sys.stdout.write(_bash_script())
        return 0
    if shell == "zsh":
        sys.stdout.write(_zsh_script())
        return 0
    if shell == "fish":
        sys.stdout.write(_fish_script())
        return 0
    sys.stderr.write(f"unknown shell: {shell}\n")
    return 2


def _bash_script() -> str:
    commands = " ".join(TOP_LEVEL_COMMANDS)
    self_subs = " ".join(SELF_SUBCOMMANDS)
    secrets_subs = " ".join(SECRETS_SUBCOMMANDS)
    secrets_entities = " ".join(SECRETS_ENTITIES)
    shells = " ".join(COMPLETIONS_SHELLS)
    return f"""# situ bash completion. Source this file or place under /etc/bash_completion.d/.
_situ_completions() {{
  local cur prev
  COMPREPLY=()
  cur="${{COMP_WORDS[COMP_CWORD]}}"
  prev="${{COMP_WORDS[COMP_CWORD-1]}}"

  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "{commands}" -- "$cur") )
    return 0
  fi

  if [ "$COMP_CWORD" -eq 2 ]; then
    case "$prev" in
      self) COMPREPLY=( $(compgen -W "{self_subs}" -- "$cur") ); return 0 ;;
      secrets) COMPREPLY=( $(compgen -W "{secrets_subs}" -- "$cur") ); return 0 ;;
      completions) COMPREPLY=( $(compgen -W "{shells}" -- "$cur") ); return 0 ;;
    esac
  fi

  if [ "$COMP_CWORD" -eq 3 ] && [ "${{COMP_WORDS[1]}}" = "secrets" ]; then
    case "$prev" in
      set|unset) COMPREPLY=( $(compgen -W "{secrets_entities}" -- "$cur") ); return 0 ;;
    esac
  fi
}}
complete -F _situ_completions situ
"""


def _zsh_script() -> str:
    commands = " ".join(TOP_LEVEL_COMMANDS)
    self_subs = " ".join(SELF_SUBCOMMANDS)
    secrets_subs = " ".join(SECRETS_SUBCOMMANDS)
    secrets_entities = " ".join(SECRETS_ENTITIES)
    shells = " ".join(COMPLETIONS_SHELLS)
    return f"""#compdef situ
# Place this file in a directory listed in $fpath, e.g. ~/.zsh/completions/_situ.
_situ() {{
  local -a commands self_subs secrets_subs secrets_entities shells
  commands=({commands})
  self_subs=({self_subs})
  secrets_subs=({secrets_subs})
  secrets_entities=({secrets_entities})
  shells=({shells})

  if (( CURRENT == 2 )); then
    _describe 'situ command' commands
    return
  fi

  if (( CURRENT == 3 )); then
    case "${{words[2]}}" in
      self) _describe 'self subcommand' self_subs ;;
      secrets) _describe 'secrets subcommand' secrets_subs ;;
      completions) _describe 'shell' shells ;;
    esac
    return
  fi

  if (( CURRENT == 4 )) && [[ "${{words[2]}}" == "secrets" ]]; then
    case "${{words[3]}}" in
      set|unset) _describe 'secret' secrets_entities ;;
    esac
  fi
}}
_situ "$@"
"""


def _fish_script() -> str:
    lines = [
        "# situ fish completion. Place under ~/.config/fish/completions/situ.fish.",
        "complete -c situ -f",
    ]
    for command in TOP_LEVEL_COMMANDS:
        lines.append(f'complete -c situ -n "__fish_use_subcommand" -a "{command}"')

    for sub in SELF_SUBCOMMANDS:
        lines.append(
            f'complete -c situ -n "__fish_seen_subcommand_from self" -a "{sub}"'
        )
    for sub in SECRETS_SUBCOMMANDS:
        lines.append(
            f'complete -c situ -n "__fish_seen_subcommand_from secrets" -a "{sub}"'
        )
    for entity in SECRETS_ENTITIES:
        lines.append(
            f'complete -c situ -n "__fish_seen_subcommand_from set unset" -a "{entity}"'
        )
    for shell in COMPLETIONS_SHELLS:
        lines.append(
            f'complete -c situ -n "__fish_seen_subcommand_from completions" -a "{shell}"'
        )

    return "\n".join(lines) + "\n"
