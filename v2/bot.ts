export const Discord = require("discord.js")
import * as functions from "./functions"
import { token, prefix } from "./environment_variables/variables.json"
const { AutoPoster } = require("topgg-autoposter")




export const client = new Discord.Client({intents : ["GUILD_MEMBERS", "GUILDS", "GUILD_MESSAGES"], shards : "auto"})

if(prefix !== "!") {
    var poster = AutoPoster("redacted", client)
    poster.on("posted", () => console.log("Posted stats to top.gg"))
}

client.on("messageCreate", async message => await functions.processMessage(message) )
.on("ready", () => functions.ready(client))
.on("guildMemberAdd", async member => await functions.processGuildMemberAdd(member))
.on("guildCreate", async guild => await functions.processGuildCreate(guild))
.on("messageUpdate", async (oldMessage, newMessage) => await functions.processMessage(newMessage))
.on("guildDelete", async guild => await functions.processGuildDelete(guild))
.on("interactionCreate", async interaction => await functions.processInteractionCreate(interaction))
.on("error", error => functions.errorHandler(error))
.on("guildMemberUpdate", async (oldMember, newMember) => await functions.processGuildMemberUpdate(oldMember, newMember))


client.login(token)
