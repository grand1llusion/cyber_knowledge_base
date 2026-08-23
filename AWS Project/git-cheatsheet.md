# Git & GitHub Cheat Sheet for Cyber Ops

## 1. Setup & Initialization
These commands are for starting a new project or "Op".

- `git init`: Initialize a new repository in the current folder.
- `git clone [url]`: Download an existing repository from GitHub to your machine.
- `git config --global user.name "Your Name"`: Set your identity for logs.
- `git config --global user.email "you@example.com"`: Set your email for logs.

## 2. Staging & Committing (The Save Game)
How to save your progress locally.

- `git status`: **CRITICAL.** Checks what files are changed, staged, or untracked. Run this constantly.
- `git add [filename]`: Stage a specific file.
- `git add .`: Stage ALL changed files in the folder (Use with care).
- `git commit -m "Message"`: Commit staged files to history. 
    - *Tip:* Use imperative mood: "Fix login bug" not "Fixed login bug".

## 3. Branching (Parallel Universes)
Used to test dangerous code without breaking the main tool.

- `git branch`: List all local branches.
- `git branch [name]`: Create a new branch.
- `git checkout [name]`: Switch to a specific branch.
- `git merge [name]`: Merge the specified branch into the one you are currently on.

## 4. Emergency Controls
- `git log`: Show the history of commits (hit `q` to exit).
- `git restore [file]`: Undo changes to a file that hasn't been staged yet.

## 5. Security Notes
- **.gitignore**: Always ensure this file exists before committing. 
- **Secrets**: NEVER commit API keys, passwords, or .env files.
