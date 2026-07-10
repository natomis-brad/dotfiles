# dotfiles
#
# Usage: just <command>

# show this message
help:
    @just --list

# update all submodules
submodules:
    git submodule update --recursive --remote

# create symlinks to dotfiles. pass a config file (see .stow-packages) to
# symlink the listed paths as whole files/dirs instead of per-file entries.
stow config="":
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{config}}" ]; then
        stow --verbose --dotfiles --no-folding .
    else
        while IFS= read -r pkg; do
            case "$pkg" in ""|"#"*) continue ;; esac
            ln -sfhv ".dotfiles/$pkg" "$HOME/$pkg"
        done < "{{config}}"
    fi

# remove symlinks to dotfiles. pass a config file to remove the whole
# file/dir symlinks it lists instead of the default per-file entries.
unstow config="":
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{config}}" ]; then
        stow --verbose --dotfiles --no-folding -D .
    else
        while IFS= read -r pkg; do
            case "$pkg" in ""|"#"*) continue ;; esac
            if [ -L "$HOME/$pkg" ]; then
                rm -v "$HOME/$pkg"
            else
                echo "skipping $HOME/$pkg: not a symlink" >&2
            fi
        done < "{{config}}"
    fi
