#!/bin/bash

# ==============================================================================
# 🚀 Ultimate Terminal & AI Neovim Setup Script
# Works on: Ubuntu, Debian, Zorin OS, Mint, etc.
# ==============================================================================

set -e

echo "🌟 Starting the ultimate terminal transformation..."

# 1. Update and Install Base Dependencies
echo "📦 Updating package lists and installing base tools..."
sudo apt update
sudo apt install -y zsh curl git bat btop ripgrep fzf fd-find ranger xclip

# 2. Upgrade Neovim (v0.11+)
echo "vim 🚀 Upgrading Neovim to the latest unstable (v0.12+) for modern LSP support..."
sudo add-apt-repository -y ppa:neovim-ppa/unstable
sudo apt update
sudo apt install -y neovim

# 3. Install Lazygit
echo "🐙 Installing Lazygit (Latest Binary)..."
LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
tar xf lazygit.tar.gz lazygit
sudo install lazygit /usr/local/bin
rm lazygit.tar.gz lazygit

# 4. Setup Oh My Zsh
echo "🐚 Installing Oh My Zsh..."
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

# 5. Install Zsh Plugins
echo "🧩 Installing Zsh Plugins (Syntax Highlighting & Autosuggestions)..."
ZSH_CUSTOM="$HOME/.oh-my-zsh/custom"
[ ! -d "$ZSH_CUSTOM/plugins/zsh-autosuggestions" ] && git clone https://github.com/zsh-users/zsh-autosuggestions "$ZSH_CUSTOM/plugins/zsh-autosuggestions"
[ ! -d "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" ] && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting"

# 6. Configure .zshrc
echo "📝 Writing .zshrc configuration..."
cat << 'EOF' > ~/.zshrc
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="agnoster"

plugins=(
  git
  zsh-syntax-highlighting
  zsh-autosuggestions
)

source $ZSH/oh-my-zsh.sh

# User settings
export EDITOR="nvim"

# Aliases
alias cat='batcat'
alias lg='lazygit'
alias top='btop'
alias rr='ranger'
alias vi='nvim'
alias vim='nvim'
alias ll='ls -alF'

# Fuzzy search and edit function
fe() {
  local file
  file=$(fzf --query="$1" --select-1 --exit-0)
  [ -n "$file" ] && ${EDITOR:-nvim} "$file"
}

# Paths
export PATH=$HOME/.local/bin:$PATH
EOF

# 7. Configure Neovim (init.lua)
echo "🌙 Configuring Neovim with AI (Codeium) and Catppuccin..."
mkdir -p ~/.config/nvim
cat << 'EOF' > ~/.config/nvim/init.lua
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({ "git", "clone", "--filter=blob:none", "https://github.com/folke/lazy.nvim.git", "--branch=stable", lazypath })
end
vim.opt.rtp:prepend(lazypath)

vim.g.mapleader = " "
vim.opt.number = true
vim.opt.relativenumber = true
vim.opt.termguicolors = true

require("lazy").setup({
  { "catppuccin/nvim", name = "catppuccin", priority = 1000 },
  { "Exafunction/codeium.vim" },
  { "nvim-treesitter/nvim-treesitter", build = ":TSUpdate" },
  { "neovim/nvim-lspconfig" },
  { "nvim-lualine/lualine.nvim" },
  { "nvim-telescope/telescope.nvim", tag = '0.1.5', dependencies = { 'nvim-lua/plenary.nvim' } },
})

vim.cmd.colorscheme("catppuccin-mocha")

local builtin = require('telescope.builtin')
vim.keymap.set('n', '<leader>ff', builtin.find_files, {})
vim.keymap.set('n', '<leader>fg', builtin.live_grep, {})
EOF

# 8. Setup Symlinks and Fixes
echo "🔗 Setting up helper symlinks..."
mkdir -p ~/.local/bin
[ ! -f ~/.local/bin/fd ] && ln -s $(which fdfind) ~/.local/bin/fd || true
[ ! -f ~/.local/bin/bat ] && ln -s $(which batcat) ~/.local/bin/bat || true

# 9. Final Step: Change Shell
echo "✅ Setup complete! Changing shell to Zsh..."
sudo chsh -s $(which zsh) $USER

echo "🎉 DONE! Please log out and back in to see the changes."
echo "👉 Note: Run ':Codeium Auth' in Neovim to activate AI completions."
