# 🚀 Ultimate Terminal & AI Neovim Setup

This guide documents the complete transformation of the development environment, moving from a standard Bash setup to a high-performance, AI-powered Zsh and Neovim workflow.

## ⚡ Quick Start (One-Click Setup)

To replicate this entire setup on any **Ubuntu, Debian, or Fedora** machine, run the following command:

```bash
curl -LO https://raw.githubusercontent.com/livemonkey1300/linux-feed/main/setup_terminal.sh && bash setup_terminal.sh
```

The script automatically detects your OS and handles:
-   Installing dependencies via `apt` (Debian/Ubuntu) or `dnf` (Fedora).
-   Upgrading Neovim to the latest version.
-   Configuring Zsh, Oh My Zsh, and all high-speed TUI tools.
-   Setting up the AI-powered Neovim configuration.

## 🛠️ Core Shell: Zsh + Oh My Zsh

The shell has been upgraded to **Zsh** with the **Oh My Zsh** framework for better productivity and extensibility.

-   **Theme:** `agnoster` (Powerline-style, high-visibility prompt).
-   **Plugins:**
    -   `zsh-syntax-highlighting`: Real-time feedback for valid/invalid commands.
    -   `zsh-autosuggestions`: Intelligent, "ghost" completions based on your history.
    -   `git`: Enhanced aliases and status indicators for version control.
-   **Default Shell:** Switched to `/usr/bin/zsh`.

## 🤖 AI-Powered Neovim (v0.12.0-dev)

Neovim has been upgraded to the latest bleeding-edge version to support modern LSP features and high-speed plugins.

-   **Plugin Manager:** `lazy.nvim` (The fastest, most modern manager).
-   **AI Integration:** **Codeium** for free, high-quality AI autocompletion.
-   **Aesthetic:** `Catppuccin Mocha` color scheme for a clean, vibrant look.
-   **Key Features:**
    -   **Telescope:** Fuzzy finder for files, text, and buffers (`<leader>ff`, `<leader>fg`).
    -   **Lualine:** Beautiful and informative status line.
    -   **Treesitter:** Advanced, language-aware syntax highlighting.
    -   **LSP Config:** Ready for intelligent code completion and diagnostics.

## ⚡ High-Speed TUI Tools (The "Fast" Stack)

Manual, slow commands have been replaced with modern, Rust-powered terminal user interfaces (TUIs):

-   **`bat` (`cat` replacement):** Syntax highlighting and paging for reading files.
-   **`lazygit` (`lg`):** A blazing fast interface for Git. Stage, commit, and push in seconds.
-   **`btop` (`top`):** A stunning, interactive system monitor.
-   **`fzf`:** Fuzzy finder integrated into the shell (`CTRL-R` for history, `CTRL-T` for files).
-   **`ranger` (`rr`):** Vim-style file explorer with instant previews.

## ⌨️ Custom Aliases & Functions

Added to `~/.zshrc` for maximum efficiency:

| Alias / Command | Purpose |
| :--- | :--- |
| `cat` | Uses `bat` for highlighted output. |
| `lg` | Opens `lazygit`. |
| `top` | Opens `btop`. |
| `rr` | Opens `ranger`. |
| `vi` / `vim` | Aliased to `nvim`. |
| `fe [query]` | **Fuzzy Edit:** Search for a file and open it in Neovim instantly. |

## 🔄 Ported Configurations

The following environments were successfully ported from `.bashrc` to ensure no loss of functionality:
-   **Conda:** Full environment management integration.
-   **NVM:** Node Version Manager for seamless JS development.
-   **LM Studio CLI:** Local LLM integration.

---
*Setup performed by Gemini CLI - March 2026*
