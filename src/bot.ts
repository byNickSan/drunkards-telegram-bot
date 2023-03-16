import { Bot, Context, InlineKeyboard, webhookCallback } from "grammy";
import { I18n, I18nFlavor } from "@grammyjs/i18n";
import { chunk } from "lodash";
import express from "express";

// For TypeScript and auto-completion support,
// extend the context with I18n's flavor:
type MyContext = Context & I18nFlavor;

// Create a bot using the Telegram token
const bot = new Bot<MyContext>(process.env.TELEGRAM_TOKEN || "");

function getAdmins(text:string){
  let str = {}
  if(text.length > 3)
    str = JSON.parse(text)
  return str
}

let admins = {};

if(process.env.ADMINS)
  admins = getAdmins(process.env.ADMINS)

// Create an `I18n` instance.
// Continue reading to find out how to configure the instance.
const i18n = new I18n<MyContext>({
  defaultLocale: "en", // see below for more information
  directory: "locales", // Load all translation files from locales/.
});

// Finally, register the i18n instance in the bot,
// so the messages get translated on their way!
bot.use(i18n);

// Handle the /yo command to greet the user
bot.command("yo", (ctx) => ctx.reply(`Yo ${ctx.from?.username}`));

// Return empty result list for other queries.
bot.on("inline_query", (ctx) => ctx.answerInlineQuery([]));

// Handle the /about command
const aboutUrlKeyboard = new InlineKeyboard().url(
    "join",
  "https://t.me/+A7jKi9dbLTMzNDUy" // https://t.me/drunkardsbc
);

// https://apps.timwhitlock.info/emoji/tables/unicode
function unicodeToChar(text:string) {
  const splited = text.split(" ")
  let str = ""
  for(let i = 0;i < splited.length;i++){
    splited[i] = splited[i].replace('U','0')
    splited[i] = splited[i].replace('+','x')
    str += String.fromCodePoint(parseInt(splited[i],16))
  }
  return str
}

const changeLanguageKeyboard = new InlineKeyboard()
    .text(unicodeToChar("U+1F1F7 U+1F1FA") + " Russian", "lang_russian")
    .text(unicodeToChar("U+1F1FA U+1F1F8") + " English", "lang_english");

// Suggest commands in the menu
bot.api.setMyCommands([
  { command: "yo", description: "Be greeted by the bot" },
  {
    command: "help",
    description: "Get help information",
  },
  {
    command: "lang",
    description: "Change language",
  },
]);

// Handle all other messages and the /start command
const introductionMessage = `Hello! I'm a Telegram bot.
I'm powered by Cyclic, the next-generation serverless computing platform.

<b>Commands</b>
/yo - Be greeted by me`;

const replyWithIntro = (ctx: any) =>
  ctx.reply(introductionMessage, {
    reply_markup: aboutUrlKeyboard,
    parse_mode: "HTML",
  });

bot.command("start", async (ctx) => {
  await ctx.reply(ctx.t("start"), {
    reply_markup: aboutUrlKeyboard,
    parse_mode: "HTML",
  });
});
bot.command("lang", async (ctx) => {
  await ctx.reply(ctx.t("lang"), {
    reply_markup: changeLanguageKeyboard,
    parse_mode: "HTML",
  });
});

bot.callbackQuery("lang_russian", async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Добро пожаловать!",
  });
  ctx.reply(introductionMessage, {
    reply_markup: aboutUrlKeyboard,
    parse_mode: "HTML",
  })
});

bot.callbackQuery("lang_english", async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Welcome!",
  });
  ctx.reply(introductionMessage, {
    reply_markup: aboutUrlKeyboard,
    parse_mode: "HTML",
  })
});

bot.command("help", async (ctx) => {
  await ctx.reply(ctx.t("help"));
});
bot.on("message", replyWithIntro);

// Start the server
if (process.env.NODE_ENV === "production") {
  // Use Webhooks for the production server
  const app = express();
  app.use(express.json());
  app.use(webhookCallback(bot, "express"));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Bot listening on port ${PORT}`);
  });
} else {
  // Use Long Polling for development
  bot.start();
}
