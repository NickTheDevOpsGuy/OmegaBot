export function buildOverviewHelp(args: { isAdmin: boolean }): string {
  const { isAdmin } = args;

  return [
    "**OmegaBot Help**",
    "",
    "**Getting Started**",
    "Type `/` and pick a command from the menu.",
    "Profile, info, and achievements default to private; use `private:false` to show in channel.",
    "Most games support `private` to control visibility.",
    "",
    "**Topics**",
    "Use `/help topic:<topic>` for detailed help:",
    `\`overview\`, \`fun\`, \`games\`, \`profile\`, \`quotes\`, \`info\`, \`summary\`, \`status\`${isAdmin ? ", `admin`" : ""}, \`commands\`, \`changelog\``,
    "",
    "**Quick Commands**",
    "`/fun daily`       Daily check-in for points",
    "`/fun trivia`      Answer trivia questions",
    "`/fun slots`       Spin the slot machine",
    "`/profile view`    See your stats & achievements",
    "`/info user`       Look up user info",
    "`/achievements`    View unlockable achievements",
    "",
    "**Popular Games**",
    "`/fun blackjack`   Play blackjack",
    "`/fun wordle`      Daily word puzzle",
    "`/fun hangman`     Guess the word",
    "`/fun rps @user`   Challenge to Rock Paper Scissors",
    "",
    "**Web / API**",
    "An optional HTTP API can power a separate website (profiles, leaderboards, events, games). See the project docs: Web platform.",
  ].join("\n");
}
