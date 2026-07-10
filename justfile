# dotfiles
#
# Usage: just <command>

# show this message
help:
    @just --list

# update all submodules
submodules:
    git submodule update --recursive --remote

# create symlinks to dotfiles. pass config="" for the full-tree, per-file
# no-folding stow instead of the default .stow-packages whole-item symlinks.
stow config=".stow-packages":
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{config}}" ]; then
        stow --verbose --dotfiles --no-folding .
    else
        while IFS= read -r line; do
            case "$line" in ""|"#"*) continue ;; esac
            src="${line%%->*}"; tgt="${line#*->}"
            [ "$tgt" = "$line" ] && tgt="$src"
            src="$(echo "$src" | xargs)"; tgt="$(echo "$tgt" | xargs)"
            mkdir -p "$(dirname "$HOME/$tgt")"
            ln -sfhv "$HOME/.dotfiles/$src" "$HOME/$tgt"
        done < "{{config}}"
    fi

# remove symlinks to dotfiles. pass config="" for the full-tree, per-file
# no-folding unstow instead of the default .stow-packages whole-item symlinks.
unstow config=".stow-packages":
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{config}}" ]; then
        stow --verbose --dotfiles --no-folding -D .
    else
        while IFS= read -r line; do
            case "$line" in ""|"#"*) continue ;; esac
            src="${line%%->*}"; tgt="${line#*->}"
            [ "$tgt" = "$line" ] && tgt="$src"
            tgt="$(echo "$tgt" | xargs)"
            if [ -L "$HOME/$tgt" ]; then
                rm -v "$HOME/$tgt"
            else
                echo "skipping $HOME/$tgt: not a symlink" >&2
            fi
        done < "{{config}}"
    fi
