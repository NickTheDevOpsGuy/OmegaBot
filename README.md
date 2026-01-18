# OmegaBot

OmegaBot is a modular, community-driven Discord bot focused on fun commands, utilities, and learning by building together.

---

## 🚀 Quick Start

1. Clone the repo
2. Copy `.env.example` to `.env`
3. Fill in required environment variables
4. Install deps and run

```bash
npm install
npm run build
npm run register
npm start
```

---

## 📚 Documentation

- [Discord Setup Guide](./setup-discord.md)
- [Commands Reference](./commands.md)
- [FAQ](./faq.md)
- [Transcripts & Examples](./transcripts.md)
- [Developer Notes](./dev-notes.md)

---

## 🔐 Admin & Moderation Commands

Some admin commands (timeout, kick, ban, health, stats) require:

- Proper bot permissions in the server
- The bot role to be **above** the target user’s role
- Required gateway intents enabled
- Correct OAuth2 scopes on invite

See the [Discord Setup Guide](./setup-discord.md) for full details.

---

## 🤝 Contributing

Pull requests are welcome.

If you want to contribute, help shape the bot, or just hang out and build together,
see [CONTRIBUTORS.md](./CONTRIBUTORS.md) or join the Discord.

---

## 📄 License

This project is licensed under the MIT License.  
See the [LICENSE](./LICENSE) file for full details.
