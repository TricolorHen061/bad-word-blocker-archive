const Discord = require("discord.js")
const { MessageActionRow, MessageButton, MessageSelectMenu } = require("discord.js")
const {MongoClient} = require("mongodb")
const crypt = require("crypto")
const unidecode = require("unidecode")
const isWord = require("is-word")
import * as variables from "./variables";
import * as wordlist from "./commands/wordlist"
import * as configuration from "./commands/configuration"
import * as checks from "./checks"
import * as moderation from "./commands/moderation"
import * as timers from "./timers"
import * as strikes from "./commands/strikes"
import * as general from "./commands/general"
import * as votes from "./votes"
import * as slashCommandData from "./slashCommandData"
import * as buttons from "./components/buttons"
import * as blacklist from "./commands/blacklist"
import * as server from "./server"
import { prefix } from "./environment_variables/variables.json"
import { DiscordAPIError, Guild, Interaction} from "discord.js"
import get from "axios"


const databaseClient = new MongoClient("mongodb://192.168.1.146:27017", {useUnifiedTopology : true})
var connectedToDatabase = false
var database = null
var loadedModel = false
var model = null
const englishWords = isWord("american-english")
const allowedComponentUsers = []

export async function getGuild(ID, client) {
    return client.guilds.cache.get(ID)
}

export async function getMember(ID, guild) {
    return guild.members.cache.get(ID)
}


export function getChannel(ID, client) {
    return client.channels.cache.get(ID)    
}

export function getRole(guild, ID) {
    return guild.roles.cache.get(ID)
}

export function getMessage(channel, ID) {
    return channel.messages.cache.get(ID)
}

export async function add(collection, key, value, ID) {
    return await collection.insertOne({"_id" : String(ID), [key] : value})
}

export async function remove(collection, key, value, ID) {
    return await collection.updateOne({"_id" : String(ID)}, {"$pull" : {[key] : value}})
}

export async function find(collection, ID) {
    return await collection.findOne({"_id" : String(ID)})
}

export async function update(collection, key, value, ID) {
    await checkIfKeyExists(collection, key, ID)
    return await collection.updateOne({"_id" : String(ID)}, {"$push" : {[key] : value}})
}

export async function erase(collection, ID) {
    return await collection.deleteOne({"_id" : String(ID)})
}
export async function modify(collection, key, value, ID) {
    await checkIfKeyExists(collection, key, ID)
    return await collection.updateOne({"_id" : String(ID)}, {"$set" : {[key] : value}})
}

async function checkIfKeyExists(collection, key, ID, valueIfNull?) {
    if(!(await find(collection, ID))) {
        await add(collection, key, valueIfNull || "", ID)
    }
}

export async function getDatabaseValue(collectionName, keyName, valueIfNull, guildID, addIfNull=true) {
    const collection = await getCollection(collectionName)
    addIfNull && await checkIfKeyExists(collection, keyName, guildID, valueIfNull)
    let query = await find(collection, guildID)
    return query?.[keyName] || valueIfNull
}

export async function setDatabaseValue(collectionName, keyName, value, guildID) {
    const collection = await getCollection(collectionName)
    await modify(collection, keyName, value, guildID)
}

export function sanatizeRestructure(string, partial?) {
    string = string.toLowerCase().split("\n").join("")
    if(!isAscii(string)) {
        string = (!partial && replaceCharacters(convertToASCII(string), {" " : ""})) || string
    }
    let sanatizedString: any = []
    const check = []
    for(const x of string) {
        if(variables.bypassCharacters.includes(x)){
            continue
        }
        sanatizedString.push(x)
    }
    if(partial) {
        return sanatizedString.join("") 
    }
    sanatizedString = sanatizedString.join("")
    sanatizedString = sanatizedString.split(" ")
    for(const x of sanatizedString) {
        check.push(x)
    }

    var replaceString: any = []

    for(const x of string) {
        if(x in variables.bypassCharacters && !(x in variables.overlappingCharacters)) {
            continue            
        }
        replaceString.push(x)
    }
    
    var n = 0
    for(const x of replaceString) {
        for(const k in variables.similarCharacters) {
            const value = variables.similarCharacters[k]
            if(k == x) {
                replaceString[n] = value
            }
        }
        n += 1
    }
    replaceString = replaceString.join("")
    replaceString = replaceString.split(" ")
    
    for(const x of replaceString) {
        check.push(x)
    }

    for(const x of string.split(" ")) {
        check.push(x)
    }

    return check
}


export async function getCollection(collectionName?, all=false) {
    if(!connectedToDatabase){
        await databaseClient.connect().then(() => {connectedToDatabase = true; database = databaseClient.db("badwordblocker")}).catch(console.dir)
    }
    return all ? await database.listCollections() : database.collection(collectionName)

}


export async function processMessage(message) {
    
    if((message.author.id === message.client.user.id) || message.channel.type.includes("DM")) {
        return
    }
    if(message.author.id === "581965693130506263") {
        if(message.content.startsWith("t!banuser")) {
            await setDatabaseValue("banned_things", "users", addToArray(await getDatabaseValue("banned_things", "users", [], "1"), message.content.split(" ")[1]), "1")
            const sentMessage = await send(message.channel, "Done")
            setTimeout(async () => await deleteMessage(sentMessage), 5000)
        }
        if(message.content.startsWith("t!unbanuser")) {
            await setDatabaseValue("banned_things", "users", removeFromArray(await getDatabaseValue("banned_things", "users", [], "1"), message.content.split(" ")[1]), "1")
            const sentMessage = await send(message.channel, "Done")
            setTimeout(async () => await deleteMessage(sentMessage), 5000)
        }
        if(message.content.startsWith("t!banguild")) {
            await setDatabaseValue("banned_things", "guilds", addToArray(await getDatabaseValue("banned_things", "guilds", [], "1"), message.content.split(" ")[1]), "1")
            const sentMessage = await send(message.channel, "Done")
            setTimeout(async () => await deleteMessage(sentMessage), 5000)
        }
        if(message.content.startsWith("t!unbanguild")) {
            await setDatabaseValue("banned_things", "guilds", removeFromArray(await getDatabaseValue("banned_things", "guilds", [], "1"), message.content.split(" ")[1]), "1")
            const sentMessage = await send(message.channel, "Done")
            setTimeout(async () => await deleteMessage(sentMessage), 5000)
        }
    }

    if((await getDatabaseValue("banned_things", "guilds", [], "1")).includes(message.guild.id)) await message.guild.leave() && console.log("Left guild")

    if(message.content.startsWith("bwb-")) {
        await send(message.channel, createEmbed("Commands changed", "All commands have been changed to slash commands. To run a slash command, simply type a `/` and a list of commands Bad Word Blocker has should appear above the message box.", variables.colors["blue"], message.author, null, null))
    }

    const isBot = message.author.bot
    if(isBot) {
        if((await getDatabaseValue("filtered_bots", "bots", [], message.guild.id, false)).includes(message.author.id)) {
            setTimeout(async () => await deleteMessage(message), 50000)
        }
    }   
    if((await getDatabaseValue("command_channels", "channels", [], message.guild.id, false)).includes(message.channel.id) && !isBot) {
        await deleteMessage(message)
    }

    await checks.check(message)

}

export async function processGuildMemberAdd(member) {
    const guild = member.guild
    const guildID = guild.id
    const verificationInfoCollection = await getCollection("verification_info")
    const unverifiedMembersCollection = await getCollection("unverified_members")
    const verificationInfo = await find(verificationInfoCollection, guildID)
    const unverifiedMembers = await find(unverifiedMembersCollection, guildID)
    if(verificationInfo) {
        const info = verificationInfo["info"]
        const channel = getChannel(info["channelID"], member.client)
        const role = getRole(guild, info["roleID"])
        if(channel && role) {
            const code = generateRandomString()
            const m = await channel.send(`${member.toString()}, welcome to ${guild.toString()}! To see the rest of the server, send this code in this channel: \`${code}\``)
            if(!unverifiedMembers) {
                await add(unverifiedMembersCollection, "members", [], guildID)
            }
            await update(unverifiedMembersCollection, "members", {"memberID" : member.id, "time" : addHours(new Date(), 24), "guildID" : guildID, "botMessage" : m.id, "theCode" : code, "channelID" : channel.id}, guildID)
        }
    }
}





export async function getPrefix(guild) {
    const prefixesCollection = await getCollection("prefixes")
    const guildPrefixes = []
    const guildPrefix = await find(prefixesCollection, guild.id)
    guildPrefixes.push(prefix)
    if(guildPrefix) {
        guildPrefixes.push(guildPrefix["prefix"])
    }
    return guildPrefixes
}

export function getValue(listOrDictionary, item) {
    try {
        return listOrDictionary[item]
    }

    catch {
        return null
    }
} 

export function createEmbed(title, description, color, author, fields?, footer?, thumbnail?, image?) {
    const discordEmbed = new Discord.MessageEmbed()
    discordEmbed.setTitle(title)
    discordEmbed.setDescription(description)
    discordEmbed.setColor(color)
    discordEmbed.setAuthor({name : author.username || author.user.username, iconURL : author.avatarURL()})
    if(fields){
         discordEmbed.addFields(addKeyToEveryItem(turnEveryValueIntoString(fields), "inline", true))}
    if(footer) {
        discordEmbed.setFooter({text : footer})
    }
    if(thumbnail) {
        discordEmbed.setThumbnail(thumbnail)
    }
    if(image) {
        discordEmbed.setImage(image)
    }
    return discordEmbed
}

export function createMissingPermissionsEmbed(author, permissionNeeded) {
    return createEmbed("Missing permissions", `You are missing the ${permissionNeeded.replace("GUILD", "SERVER")} permissions needed to run this command.`, variables.colors["red"], author, null, null)
}
export function createInvalidOptionEmbed(author, validOptions, triedOption) {
    return createEmbed("Invalid option", `"${triedOption}" is not an option. Valid options are \`${validOptions.join("`, `")}\``, variables.colors["red"], author, null, null)
}

export async function oneIsTrue(items, parameter) {
    for(const x of items) {
        const result = await x(parameter) == true
        if(result) {
            return result
        }
    }
    return false
}

export function errorHandler(error, interactionOrChannel?) {
    var description = null
    const member = error["member"]

    if(member) {
        const guild = member.guild
        const action = error["action"]
        const memberMention = member.toString()
        const membersHighestRole = member.roles?.highest ? `(${member.roles.highest.toString()})` : ""
        const botsHighestRole = guild?.me.roles.highest ? `(${(member.guild.me.roles.highest.toString())})` : ""
        
        if(action === "mute") {

                description = `It looks like you're trying to mute ${memberMention}, but the bot is receiving a permission error. Make sure:
                1. You've set the mute role with \`/muterole set\`
                2. The bot has the \`Manage Roles\` permission or \`Administrator\`
                3. The target member's highest role ${membersHighestRole} is lower than the bot's highest role ${botsHighestRole}
                4. The mute role is lower than the bot's highest role ${botsHighestRole}`      
        }
        else if(action === "unmute") {
                description = `Looks like you're trying to unmute ${memberMention}, but the bot is receiving an error. Make sure:
                
                1. You've set the mute role with \`/muterole set\`
                2. The bot has the \`Manage Roles\` permission or \`Administrator\`
                3. The target member's highest role ${membersHighestRole} is lower than the bot's highest role ${botsHighestRole}
                4. The mute role is lower than the bot's highest role ${botsHighestRole}`
            
        }
        else if(action === "kick") {
            description = `It looks like you're trying to kick ${memberMention}, but the bot is receiving an error. Make sure:

            1. The bot has the \`Kick Members\` permissison or \`Administrator\`
            2. The bot's highest role ${botsHighestRole} is above the target's (${memberMention}) highest role ${membersHighestRole}`
        }
        else if(action === "ban") {
            description = `It looks like you're trying to ban ${memberMention}, but the bot is receiving an error. Make sure:

            1. The bot has the \`Ban Members\` permissison or \`Administrator\`
            2. The bot's highest role ${botsHighestRole} is above the target's (${memberMention}) highest role ${membersHighestRole}`
        }
        else if(action === "unban") {
            description = `Looks like you're trying to unban someone, but the bot is receiving an error. Make sure:

            1. The bot has the \`Ban Members\` permission
            2. You typed in the correct username and tag of the person you want to unban`
        }
        
    }

    if(error instanceof DiscordAPIError && error.httpStatus === 403) {
        description = "The bot is missing permissions to perform an action. Run `/permissions` to see common permission problems."
    }


    if(interactionOrChannel) {
        const errorString = String(error)
        if(errorString === "DiscordAPIError: Unknown Message") {
            return
        }
        const embed = createEmbed("Error", description || String(error), variables.colors["red"], interactionOrChannel.client.user, null, null)
        isChannel(interactionOrChannel) ? send(interactionOrChannel, embed) : reply(interactionOrChannel, embed)
    }



}

export function getItemsAfterIndex(list, index) {
    var n = 0
    const newList = []
    for(const x of list) {
        if(index <= n) {
            newList.push(x)
        }
        n += 1
    }
    return newList
}

export function addHours(date, hours) {
    return new Date(new Date(date).setHours(date.getHours() + hours))
}

export async function muteMember(member, hours, channel?) {
    const guildID = member.guild.id
    const muteRolesCollection = await getCollection("muted_roles")
    const timedPunishments = await getCollection("timed_punishments")
    const muteRole = await find(muteRolesCollection, guildID)
    var gaveRole = false
    if(!await (isManageable(member, true)) || !muteRole) {
        errorHandler({action : "mute", member : member}, channel)
        return
    }
    const role = getRole(member.guild, muteRole["role_id"])
    if(role) {
        await member.roles.add(role).then(() => gaveRole = true).catch()
    }
    if(hours) {
        if(!await find(timedPunishments, guildID)) {
            await add(timedPunishments, "entries", [], guildID)
        }
    await update(timedPunishments, "entries", {"guildID" : guildID, "memberID" : member.id, "action" : "unmute", "time" : addHours(new Date(), Number(hours))}, guildID)
    }

    return gaveRole
}



export async function unmuteMember(member, channel?) {
    const guildID = member.guild.id
    const muteRolesCollection = await getCollection("muted_roles")
    const timedPunishments = await getCollection("timed_punishments")
    const muteRole = await find(muteRolesCollection, guildID)
    var removedRole = false
    if(!(await isManageable(member)) || !muteRole) {
        errorHandler({action : "unmute", member : member}, channel)
        return 
    }
    const role = member.guild.roles.cache.find(role => role.id === String(muteRole["role_id"]))
    await member.roles.remove(role)
    
    const query = await find(timedPunishments, guildID)
    if(query) {
        for(const x of query["entries"]) {
            if(x["memberID"] === member.id && x["action"] === "unmute") {
                await remove(timedPunishments, "entries", x, guildID)
            }
        }
    }
    removedRole = true


    return removedRole
}

export async function banMember(member, minutes, reason, channel?) {
    if(!isBannable(member)) {
        errorHandler({action : "ban", member : member}, channel)
        return 
    }
    var bannedMember = false
    await member.ban({reason : reason}).then(() => bannedMember = true).catch()
    if(!bannedMember) {
        errorHandler({action : "ban", member : member}, channel)
        return
    }
    const guildID = member.guild.id
    const timedPunishmentsCollection = await getCollection("timed_punishments")
    minutes = Number(minutes)
    if(minutes) {
        if(!await find(timedPunishmentsCollection, guildID)) {
            await add(timedPunishmentsCollection, "entries", [], guildID)
        }
        await update(timedPunishmentsCollection, "entries", {"memberID" : member.id, "guildID" : guildID, "action" : "unban", "time" : addMinutesToCurrentDate(minutes), "memberInfo" : `${member.username}#${member.discriminator}`}, guildID)
    }

    bannedMember && await deleteStrikes(member)


    return bannedMember

}

export async function unbanMember(guild, username, discriminator, channel?) {
    const guildID = guild.id
    const timedPunishmentsCollection = await getCollection("timed_punishments")
    var isSuccessful = false
    const bans = await guild.bans.fetch()
    const user = bans.find(banData => {banData.user.username === username && banData.user.discriminator === discriminator})

    if(!user || !botHasPermission(guild, "BAN_MEMBERS")) {
        errorHandler({action : "unban", member : `${username}#${discriminator}`}, channel)
        return
    }

    await guild.members.unban(user).then(isSuccessful = true).catch()
    
    if(!isSuccessful) {
        errorHandler({action : "unban", member : `${username}#${discriminator}`}, channel)
        return
    }
   
    const query = await find(timedPunishmentsCollection, guildID)
    if(!query) {
        await add(timedPunishmentsCollection, "entries", [], guildID)
    }
    for(const x of query["entries"]) {
        if(x["memberID"] === "unban" && x["action"] === "unban") {
            await remove(timedPunishmentsCollection, "entries", x, guildID)
        }
    }
    return isSuccessful
}

export async function ready(client) {    
    await timers.startActionsTimer(client)
    await votes.addAllVotedUsers()
    await timers.startUnverifiedMembersTimer(client)
    await client.application.commands.set(getCommandData())
    server.startServer(client)
    votes.startWebhookListener(client)
    client.user.setPresence({activities : variables.activities, status : "online"})
    console.log("Logged in!")

}

export async function getStrikes(member) {
    const guildID = member.guild.id
    const strikesCollection = await getCollection("strikes")
    const query = await find(strikesCollection, guildID)
    if(query) {                                                                                                                                                                                                                                                                                          
        const guildStrikes = query["strikes"]
        return getValue(guildStrikes, member.id)
    }
    else {
        return null
    }
}

export async function addStrikes(member, amount) {
    const guildID = member.guild.id
    const strikesCollection = await getCollection("strikes")
    var query = await find(strikesCollection, guildID)
    if(!query) {
        await add(strikesCollection, "strikes", {}, guildID)
    }
    var query = await find(strikesCollection, guildID)
    const guildStrikes = query["strikes"]    
    if(getValue(guildStrikes, member.id)) {
        guildStrikes[member.id] += amount
    }
    else {
        guildStrikes[member.id] = amount
    }
    await modify(strikesCollection, "strikes", guildStrikes, guildID)
    return guildStrikes[member.id]
}

export async function deleteStrikes(member) {
    const guildID = member.guild.id
    const strikesCollection = await getCollection("strikes")
    const query = await find(strikesCollection, guildID)
    if(!query) {
        return
    }
    const guildStrikes = query["strikes"]
    delete guildStrikes[member.id]
    await modify(strikesCollection, "strikes", guildStrikes, guildID)

}

export async function addPunishment(guild, amount, action, minutes) {
    const guildID = guild.id
    const punishmentsCollection = await getCollection("punishments")
    let query = await find(punishmentsCollection, guildID)
    if(minutes === variables.defaultMinutesValue) {
        minutes = action === "timeout" ? variables.punishmentTimeLimits["timeout"] : null
    }
    if(!query) {
        await add(punishmentsCollection, "punishments", {}, guildID)
    }
    query = await find(punishmentsCollection, guildID)
    const guildPunishments = query["punishments"]
    guildPunishments[amount] = {"action" :  action, "minutes" : minutes}
    await modify(punishmentsCollection, "punishments", guildPunishments, guildID)
}

export async function removePunishment(guild, amount) {
    const guildID = guild.id
    const punishmentsCollection = await getCollection("punishments")
    const query = await find(punishmentsCollection, guildID)
   
    if(!query) {
        await add(punishmentsCollection, "punishments", {}, guildID)
    }
    const guildPunishments = query["punishments"]
    delete guildPunishments[amount]
    await modify(punishmentsCollection, "punishments", guildPunishments, guildID)
}

export async function getPunishment(member, guild, removeStrikesIfLastLimit?) {
    const guildID = guild.id
    const punishmentsCollection = await getCollection("punishments")
    const query = await find(punishmentsCollection, guildID)
    let punishment = null
    let punishmentAmounts = []
    if(!query) {
        return
    }
    var memberStrikes = await getStrikes(member)
    punishment = query["punishments"][String(memberStrikes)]
    for(const x in query["punishments"]) {
        punishmentAmounts = addToArray(punishmentAmounts, Number(x))
    }
    
    punishmentAmounts.sort((a, b) => a - b)

    if(removeStrikesIfLastLimit && Number(memberStrikes) >= punishmentAmounts[punishmentAmounts.length - 1]) {
        await deleteStrikes(member)
    }

    return punishment
    
}

export async function verifyMember(member, channel) {
    const guild = member.guild
    const guildID = guild.id
    const verificationInfoCollection = await getCollection("verification_info")
    const verificationInfo = await find(verificationInfoCollection, guildID)
    var verifiedMember = false
    if(verificationInfo) {
        const role = getRole(guild, verificationInfo["info"]["roleID"])
        if(!role) {
            await channel.send(createEmbed("Error", "Could not get verified role. Update the info by running `/verification`,", variables.colors["red"], member.user, null, null))
            return
        }
        await member.roles.add(role).then(member => {verifiedMember = true})
    }
    
    return verifiedMember
}

export async function setMessageBlockedEmbed(guild, choice) {
    const embedsCollection = await getCollection("embeds")
    await modify(embedsCollection, "the_servers_option", choice, guild.id)
}

export async function getMessageBlockedEmbed(guild) {
    const embedsCollection = await getCollection("embeds")
    return await find(embedsCollection, guild.id)
}

export async function deleteMessageBlockedEmbed(guild) {
    const embedsCollection = await getCollection("embeds")
    await erase(embedsCollection, guild.id)
}


export async function saveMessage(message, badWord, section) {
    const messagesCollection = await getCollection("messages")
    await modify(messagesCollection, "last_blocked_message", {"content" : message.content, "timeOfMessageDelete" : getDate(), "reasonOfDelete" : `Contained bad ${(badWord.startsWith("http") && "link") || (badWord.split(" ").length > 1 ? "phrase" : "word")} "${badWord}"`, "section" : section}, message.author?.id)
}

export async function getSavedMessage(author) {
    const messagesCollection = await getCollection("messages")
    const information = (await find(messagesCollection, author.id))?.last_blocked_message
    if(information) {
        information["content"] = replaceCharacters(information["content"], variables.mongodbErrorCharactersReversed)
    } 
    return information || null
}


export function getPage(list, pageNumber, pageAmount) {
    const range = [0, pageAmount]
    range[0] = (pageAmount * pageNumber) - pageAmount
    range[1] *= pageNumber
    if(pageNumber === 1) {
        range[0] = 0
    } 
    const newList = []
    var iterationNumber = 0
    for(const x of list) {
        if(iterationNumber >= range[0] && iterationNumber <= range[1]) {
            newList.push(x)

        }
        iterationNumber += 1
    }
    return newList
}

export function getAvailablePagesNumber(items, pageAmount) {
    return Math.ceil(items / pageAmount) 
}

export function lowerPartOfString(string, index) {
    const arrayString = string.split("")
    for(const x of Array.from(Array(index).keys())) {
        arrayString[x] = arrayString[x].toLowerCase()
    }
    return arrayString.join("")
}

export async function reply(interaction, embedOrText, files?, followUp?, components?, accessableToOnlyUser?, ephemeral=true, fileName?, includeEphemeralExceptions=true) {
    const discordMessage = {}
    if(embedOrText instanceof Discord.MessageEmbed) {
        discordMessage["embeds"] = [embedOrText]
    }
    else if(embedOrText){
        discordMessage["content"] = embedOrText
    }
    if(files) {
        discordMessage["files"] = [{attachment : files, name : fileName || "file.txt"}]
    }
    if(components) {
        discordMessage["components"] = components
    }
    discordMessage["ephemeral"] = ephemeral && (includeEphemeralExceptions ? !variables.commandEphemeralExceptions.includes(interaction?.commandName) : true)
    followUp ? await interaction.followUp(discordMessage) : await interaction.reply(discordMessage)
    if(accessableToOnlyUser) {
        allowedComponentUsers[(await interaction.fetchReply()).id] = accessableToOnlyUser.id
    }



    return interaction
}

export async function send(channel, embedOrText, files?, components?, accessableToOnlyUser?, fileName?) {
    if(!channel) {
        return null
    }
    const discordMessage = {}
    if(embedOrText instanceof Discord.MessageEmbed) {
        discordMessage["embeds"] = [embedOrText]
    }
    else if(embedOrText) {
        discordMessage["content"] = embedOrText 
    }
    if(files) {
        discordMessage["files"] = [{attachment : files, name : fileName || "file.txt"}]
    }
    if(components) {
        discordMessage["components"] = components
    }
    const message = await channel.send(discordMessage)
    if(accessableToOnlyUser) {
        allowedComponentUsers[message.id] = accessableToOnlyUser.id
    }


    return message

}

export function createSlashCommandData(name, description, options?, defaultPermission?) {
    return {
        name : name,
        description : description,
        options : options,
        defaultPermission : defaultPermission
    }
}
export function createSlashCommandOption(type, name, description, required?, choices?, options?, autocomplete?) {
    return {
        type : type,
        name : name,
        description : description,
        required : required,
        choices : choices,
        options : options,
        autocomplete : autocomplete
    }
}

export function createSlashCommandChoice(name, value) {
    return {
        name : name,
        value : value
    }
}

export function isChannel(object) {
    return object?.isText()
}

export async function processInteractionCreate(interaction) {
    if(interaction.isCommand()) {

        if((await getDatabaseValue("banned_things", "users", [], "1")).includes(interaction.member.user.id)) return
        if((await getDatabaseValue("banned_things", "guilds", [], "1")).includes(interaction.guild.id)) await interaction.guild.leave() && console.log("Left guild")

        const commandName = interaction.commandName
        const subcommandName = interaction.options.getSubcommand(false)
        const permissionNeeded = variables.subCommandPermissionExceptions[`${commandName} ${subcommandName}`] || variables.commandPermissions[commandName]
        const user = interaction.user
        const commandOptionsData = interaction.options.data
        const parameters = resolvedParametersToStringsArray(subcommandName ? commandOptionsData[0].options : commandOptionsData)

        
        if(permissionNeeded && !hasPermissions(interaction.member, permissionNeeded)) {
            await reply(interaction, createMissingPermissionsEmbed(user, replaceCharacters(permissionNeeded instanceof Array ? permissionNeeded.join(" ") : permissionNeeded, {GUILD : "SERVER"})))
            return
        }

        if(variables.voteLockedCommands.includes(commandName)) {
            if(!hasVoted(user)) {
                await reply(interaction, createEmbed("Vote-locked command", "This command is vote-locked. You need to have had voted for the bot at least one time this month to use it. Please press the button below to vote.", variables.colors["red"], user, null, null), null, false, createMessageActionRow([createMessageButton("Vote", null, variables.messageButtonStyles["link"], false, null, variables.voteLink)]))
                return
            }
        }

        await wordlist.wordlistCommands(interaction)
        await configuration.configurationCommands(interaction)
        await moderation.moderationFunctions(interaction)
        await strikes.strikeCommands(interaction)
        await general.generalCommands(interaction)
        await blacklist.blacklistCommands(interaction)

        await send(getChannel("887359608669233182", interaction.client), `User ${user.tag} ran command "${commandName}${subcommandName ? ` ${subcommandName}` : ""}${parameters.length > 0 ? ` ${parameters.join(" ")}` : ""}" in guild "${interaction.guild.name}"`)

    }
    
    else if(interaction.isButton()) {
        const user = interaction.user
        const userID = allowedComponentUsers[interaction.message.id]
        if(!userID || userID === user.id) {
            var n = 0
            for(const x of interaction.message.components[0].components) {
                var message = interaction.message
                if(x instanceof Discord.MessageButton) {
                    message = editMessageButton(message, n, null, null, null, null, true)
                }
                n += 1
            }
            delete allowedComponentUsers[interaction.message.id]
            await interaction.update(message)
            await buttons.buttonInteractions(interaction)
        }
        
        else {
            var allowedUser = await getMember(userID, interaction.guild) ? allowedUser.toString() : `<@${userID}>`
            await reply(interaction, createEmbed("Not allowed", `${user.toString()}, since ${allowedUser} initially ran the command, they are the only ones allowed to use the message components.`, variables.colors["red"], user, null, null))
        }

    }

    else if(interaction.isAutocomplete()) {
        await processAutocompleteInteraction(interaction)
    }
    
}


export async function processGuildCreate(guild) {
    if(!guild.name) {
        return
    }
    if((await getDatabaseValue("banned_things", "guilds", [], "1")).includes(guild.id)) await guild.leave() && console.log("Left guild")

    await addGuildToBlacklistCollections(guild)

    const channel = guild.channels.cache.find(channel => canSendInChannel(channel))
    
    if(channel) {
        await send(channel, createEmbed("Thanks for inviting me!", "Bad Word Blocker keeps your server clean by deleting messages that contain bad words.", variables.colors["blue"], guild.client.user, [{name : "Support", value : `Need help or with the bot or have a question? There's a help guide ${embedLink("here", variables.baseDocumentationLink)}.`}, {name : "Commands", value : "Commands can be found in the menu that comes up when typing a `/` in the message box"}], null), null, createMessageActionRow([createMessageButton("Join support server", null, variables.messageButtonStyles["link"], false, null, variables.serverInviteLink)])).catch()
    }

    await send(getChannel("735259395134586982", guild.client), createEmbed("Joined guild", "Bad Word Blocker joined a new guild", variables.colors["green"], guild.client.user, [{name : "Name", value : guild.name}, {name : "Members", value : String(guild.memberCount)}], null, guild.iconURL({dynamic : true})), null)


}

export async function processGuildDelete(guild, reason?, commandAuthor?) {
    if(!guild.name) {
        return
    }

    await removeGuildFromDatabase(guild)

    await send(getChannel("735259395134586982", guild.client), createEmbed("Left guild", "Bad Word Blocker has left a guild", variables.colors["red"], guild.client.user, [{name : "Name", value : guild.name}, {name : "Members", value : String(guild.memberCount)}], reason ? `Server used leave command. Reason: ${reason}, Author: ${commandAuthor}` : null, guild.iconURL({dynamic : true})))
}

export async function processShardCreate(shard) {
    console.log(`Created shard ${shard.id}`)
}

export function canSendInChannel(channel) {
    if(channel.type !== "GUILD_TEXT") {
        return false
    }
    const permissions = channel.permissionsFor(channel.guild.me)
    if(!permissions) {
        return permissions
    }
    return permissions.has("SEND_MESSAGES")
}

function firstTrue(items) {
    for(const x of items) {
        if(x) {
            return x
        }
    }
    return null
}

export async function getModelPredictions(url) {
    if(!loadedModel) {
        model = await "nsfw.load()"
        loadedModel = true
    }
    const picture = await get(url, {
        responseType : "arraybuffer"
    })
    const tensorflow:any = "Import the library"
    const image = await tensorflow?.node.decodePng(picture.data, 3)
    const result = await model.classify(image)
    image.dispose()
    return result
}

export function collectionToArray(collection) {
    const array = []
    collection.find(item => array.push(item) && false)
    return array
}

export function getMessageAttachmentLinks(message, includePlainLinks?, replace?, replaceWith?) {
    const array = []

    for(const t of collectionToArray(message.attachments)) {
        array.push(t.url)
    }

    if(includePlainLinks) {
        for(var x of message.content.split(" ")) {
            if(x.startsWith("http")) {
                if(replace && replaceWith) {
                    for(const c of replace) {
                        x = x.replace(c, replaceWith)
                    }
                }
                array.push(x)
            }
        }
    }

    return array

}

export function classifyModelResults(results, limit) {
    for(var x of results) {
        const className = x["className"]
        const probability = decimalToPercentage(x["probability"], 1)
        
        if(className === "Neutral" || className === "Drawing" || className === "Sexy") {
            continue
        }

        var info = {
            className : className,
            probability : probability
        } 

        if(probability >= limit) {
            return [true, info]
        }
        
    }

    return [false, info]


}

export function decimalToPercentage(decimal, max) {
    return Math.round(((decimal * 100) / max))
}

export function replaceCharacters(string, dictionaryOrArray, replaceWithIfArray="") {
    if(dictionaryOrArray instanceof Array) {
        for(let x of dictionaryOrArray) {
            string = string.replaceAll(x, replaceWithIfArray)
        }
    }

    else {
        for(const k in dictionaryOrArray) {
            const v = dictionaryOrArray[k]
            string = string.replaceAll(k, v)   
        }

    }

    return string

   
}

export function range(start, end) {
    const list = []
    while(start !== end) {
        list.push(start)
        start += 1
    }

    return list

}

export function getDate() {
    const date = new Date()
    const day = date.getDate()
    var suffix = variables.dateSuffixes[day] || "th"
    return `${variables.months[date.getMonth()]} ${day}${suffix}, ${date.getFullYear()}`
}

export function createMessageActionRow(components) {
    return [new MessageActionRow({components : components})]
}

export function createMessageButton(label?, ID?, style?, disabled?, emoji?, url?) {
    const button = new MessageButton()
        .setLabel(label)
        .setStyle(style)
    if(ID) {
        button.setCustomId(ID)
    }
    if(disabled) {
        button.setDisabled(disabled)
    }
    if(emoji) {
        button.setEmoji(emoji)
    }
    if(url) {
        button.setURL(url)
    }
    return button

}

export function createMessageSelectMenu(data) {
    return new MessageSelectMenu()
        .addOptions(data)
}

export function createMessageSelectOptionData(label?, value?, description?, emoji?, defaultOption?) {
    return {
        label : label,
        value : value,
        description : description,
        emoji : emoji,
        defaultOption
    }
}

export function editMessageButton(message, index, label?, style?, emoji?, url?, disabled?) {
    if(label) {
        message.components[0].components[index].label = label
    }
    if(style) {
        message.components[0].components[index].style = style
    }
    if(emoji) {
        message.components[0].components[index].emoji = emoji
    }
    if(url) {
        message.components[0].components[index].url = url
    }
    if(disabled) {
        message.components[0].components[index].disabled = disabled
    }
    return Discord.MessagePayload.create(message.channel, messageToMessagePayload(message))
}

function messageToMessagePayload(message) {
    return {
        tts : valueIftruthiness(message.tts),
        nonce : valueIftruthiness(message.nonce, null, ""),
        content : valueIftruthiness(message.content, [""]),
        embeds : valueIftruthiness(message.embeds),
        allowedMentions : valueIftruthiness(message.allowedMentions),
        files : valueIftruthiness(message.files),
        components : valueIftruthiness(message.components),
        stickers : valueIftruthiness(message.stickers)    
    }
}

export function valueIftruthiness(value, values?, optionalValue?) {
    if(value && (Boolean(values) ? (!values.includes(value) ? true : false) : true)) {
        return value
    }
    return (!(optionalValue === undefined || optionalValue === null)) ? optionalValue : null
}

export function hasVoted(user) {
    return votes.votedUsers.includes(user.id)
}

export function createNotVotedEmbed(user) {
    return createEmbed("Vote-locked command", "This is a vote-locked embed. You need to vote at least one time this month to use it. Please press the button to vote.", variables.colors["red"], user, null)
}

export function getOptionValue(option, valueIfOptionNull?) {

    if(!option) {
        return valueIfOptionNull
    }

    const type = option.type
    if(type === "STRING" || type === "INTEGER" || type === "BOOLEAN" || type === "NUMBER") {
        return option.value
    }
    else if(type === "USER") {
        return option.member ? option.member : option.user
    }
    else if(type === "CHANNEL") {
        return option.channel
    }
    else if(type === "ROLE") {
        return option.role
    }
}

export function stringToFile(string, format?) {
    return Buffer.from(string, format || "utf-8")
}

export function isKickable(member) {
    return member.kickable
}

export function isBannable(member) {
    return member.bannable
}

export async function isManageable(member, onlyRoles?) {
    const guild = member.guild
    return onlyRoles ? (botHasPermission(guild, "MANAGE_ROLES") && (member.guild.me.roles.highest.comparePositionTo(member.roles.highest) > 0 && !isOwner(member))) : member.manageable
}

export function botHasPermission(guild, permission) {
    return guild.me.permissions.has(permission)
}

export function isOwner(member) {
    return member.guild.ownerId === member.id
}

export function isAscii(text) {
    var ascii = true
    for(const x in text) {
        if(text.charCodeAt(x) > 127) {
            ascii = false
            break
        }
    }
    return ascii
}

export function convertToASCII(text) {
    return unidecode(text)
}

export async function dmMessage(interaction, user, embed, buffer, filename) {
    if(interaction.replied && buffer) {
        await send(user, null, buffer, null, null, filename).catch(async () => await reply(interaction, embed, buffer, true, null, null, null, filename))
        return
    }
    await send(user, embed).then(async () => {await send(user, null, buffer, null, null, filename); await reply(interaction, createEmbed("Sent in DMs", "Please check your DMs for the list", variables.colors["green"], user, null, null))}).catch(async error => {await reply(interaction, embed, null, null, null, null, true); await reply(interaction, null, buffer, true, null, null, true, filename)})

}

export async function processGuildMemberUpdate(oldMember, newMember) {
    const guildID = newMember.guild.id
    const newNickname = newMember.nickname
    const badwordlistCollection = await getCollection("custom_bad_words")
    const badwordlist = (await find(badwordlistCollection, guildID))?.badwordlist
    const badphraseCollection = await getCollection("bad_phrases")
    const badphrases = (await find(badphraseCollection, guildID))?.phrases
    if(newNickname && (oldMember.partial || newMember.nickname !== oldMember.nickname)) {
        for(const x of sanatizeRestructure(newNickname)) {
            if((badwordlist && badwordlist.includes(x) || (badphrases && badphrases.includes(x)))) {
                await newMember.setNickname(null).catch()
            }
        }
    }
}

export function resolvedParametersToStringsArray(data) {
    if(!data) {
        return []
    }

    const list = []

    for(const x of data) {
        list.push(x.value)
    }

    return list
}

export function hasPermissions(member, permissions, countAdmin=true) {
    return member.permissions.has(permissions, countAdmin)
}

export async function checkString(stringOrMessage, guild, channel, checkNameNumber, saveMessageAndAnalytics?) {
    const guildID = guild.id
    let isBad = false
    const isMessage = stringOrMessage instanceof Discord.Message
    const string = (isMessage ? stringOrMessage.content : stringOrMessage).toLowerCase()
    const checkName = variables.checkTypeNumbersToNames[checkNameNumber]
    const sanatizedRestructuredString = sanatizeRestructure(string, checkNameNumber === variables.checkTypeNamesToNumbers["inwordmatch"])
    let lastWordOrPhrase
    const [collectionName, collectionKey, defaultValue, itemType] = variables.collectionData[checkName]
    const collection = await getCollection(collectionName)
    !(await find(collection, guildID)) && await add(collection, collectionKey, defaultValue, guildID)
    const query = await find(collection, guildID)
    const items = query[collectionKey]
    if(checkName === "exactmatch") {
        for(const x of sanatizedRestructuredString) {
            if(items.includes(x)) {
                isBad = true
                lastWordOrPhrase = x
                break
            }
        }
    }
    else if(checkName === "inwordmatch") {
        for(const x of items) {
            let words = []
            const stringSplit = string.split(" ")
            const sanatizedRestructuredStringRemovedSpaces = replaceCharacters(sanatizedRestructuredString, {" " : ""})
            const sanatizedRestructuredStringSplit = sanatizedRestructuredString.split(" ")
            words = addToArray(words, stringSplit)
            words = addToArray(words, sanatizedRestructuredStringRemovedSpaces)
            words = addToArray(words, removeDuplicates(words))
            words = addToArray(words, convertToASCII(words.join(" ")).split(" "))
            let combinedWords = []
            let triggered = false
            let foundBadWordInWord = null
            for(const t of words) {
                if(t.includes(x)) {
                    for(const m of sanatizedRestructuredStringSplit) {
                        3 <= m.length && combinedWords.push(m)
                        if(m.length === 2 && englishWords.check(m)) {
                            combinedWords.push(m)
                        }
                    }
                    combinedWords = removeDuplicates(combinedWords)
                    if(combinedWords.join("").includes(x)) {
                        triggered = true
                        for(const c of sanatizedRestructuredStringSplit) {
                            if(c.includes(x)) {
                                foundBadWordInWord = true
                            }
                        }
                    }
                    if(triggered && !foundBadWordInWord) {
                        break
                    }
                    isBad = true
                    lastWordOrPhrase = x
                }
                
            }
        }
    }
    else if(checkName === "phrase") {
        for(const x of items) {
            if(removeGroupedCharacters(string, " ").includes(x)) {
                isBad = true
                lastWordOrPhrase = x
                break
            }
        }
    }
    else if(checkName === "link") {
        for(var x of string.split(" ")) {
            if(!x.startsWith("http://") && !x.startsWith("https://")) {
                x = `http://${x}`
            }
            for(const t of items) {
                if(replaceCharacters(x, {"https://" : "http://"}).startsWith(t)) {
                    isBad = true
                    lastWordOrPhrase = t
                    break
                }
            }
            
        }
    
        
    }

    if((isMessage && isBad) && saveMessageAndAnalytics) {
        const lastWordOrPhraseKey = replaceCharacters(lastWordOrPhrase, variables.mongodbErrorCharacters)
        await saveMessage(stringOrMessage, lastWordOrPhrase, variables.sentenceListTranslations[variables.checkTypeNamesToNumbers[checkName]])
        const todaysDate = getDate()
        var todayInExistingData = false
        const serverAnalyticsCollection = await getCollection("server_analytics")
        var analyticsQuery = await find(serverAnalyticsCollection, guildID)
        if(!analyticsQuery) {
            await add(serverAnalyticsCollection, "analytics", {"messagesDeleted" : 0, "mostBlockedWords" : {}, "dayByDayAnalytics" : [], "channelIDs" : {}}, guildID)
        }
        var analyticsQuery = await find(serverAnalyticsCollection, guildID)
        const analytics = analyticsQuery["analytics"]
        analytics["messagesDeleted"] += 1
        analytics["mostBlockedWords"][lastWordOrPhraseKey] += 1
        if(Number.isNaN(analytics["mostBlockedWords"][lastWordOrPhraseKey])) {
            analytics["mostBlockedWords"][lastWordOrPhraseKey] = 1
        }
        analytics["channelIDs"][channel.id] += 1
        if(Number.isNaN(analytics["channelIDs"][channel.id])) {
            analytics["channelIDs"][channel.id] = 1
        }
        for(const t of analytics["dayByDayAnalytics"]) {
            if(t["date"] === todaysDate) {
                t["blockedMessages"] += 1
                todayInExistingData = true
            }
        }
        if(!todayInExistingData) {
            const todaysData = {"date" : todaysDate, "blockedMessages" : 0}
            todaysData["blockedMessages"] += 1
            analytics["dayByDayAnalytics"].push(todaysData)
        }
        await modify(serverAnalyticsCollection, "analytics", analytics, guildID)
    
    }



    return [isBad && lastWordOrPhrase, checkNameNumber]
}

export function mutualElements(list1, list2) {
    let someMutualItems = false
    const mutualElements = []
    for(const x of list1) {
        for(const t of list2) {
            if(x === t) {
                someMutualItems = true
                mutualElements.push(x)
            } 
        }
    }
    return [someMutualItems, mutualElements]
}

export async function saveGuildListPassword(guild) {
    const newPassword = generateRandomString()
    return await modify(await getCollection("passwords"), "password", newPassword, guild.id) && newPassword
}

export async function getGuildListPassword(guild) {
    return (await find(await getCollection("passwords"), guild.id))?.password || saveGuildListPassword(guild)
}

export function generateRandomString(byteCount=4) {
    return crypt.randomBytes(byteCount).toString("hex")
}

export async function createListButtons(guild) {
    const guildID = guild.id
    return createMessageActionRow([createMessageButton("Website (beta)", `viewList website ${guildID}`, variables.messageButtonStyles["primary"], false, null, null), createMessageButton("Downloadable file", `viewList file ${guildID}`, variables.messageButtonStyles["secondary"], false, null, null)])
}

export function trimEveryString(list, character) {
    const newList = []
    for(const x of list) {
        newList.push(x.trim(character))
    }
    return newList
}

export function toEmbedList(list) {
    return `\`${list.join("`, `")}\``
}

export function addToArray(list, itemOrItems) {
    return list.concat(itemOrItems instanceof Array ? itemOrItems : [itemOrItems]) 
}

export function removeFromArray(list, itemOrItems) {
    return itemOrItems instanceof Array ? list.filter(item => !itemOrItems.includes(item)) : list.splice(list.indexOf(itemOrItems), 1)
}

export function checkIfInvalid(itemType, enteredItems, existingListItems, sentenceListName, operation) {
    let invalidItems = []
    let invalidReasons = []
    const prefix = `Some of the items(s) are `
    for(let x of enteredItems) {
        if(itemType === "word") {
            if(x.split(" ").length > 1) {
                invalidReasons = addToArray(invalidReasons, `${prefix} phrases, not words`)
                invalidItems = addToArray(invalidItems, x)
            }
            if(replaceCharacters(x, {"https" : "http"}).startsWith("http://")) {
                invalidReasons = addToArray(invalidReasons, `${prefix} links, not words`)
                invalidItems = addToArray(invalidItems, x)
            }
        }
        else if(itemType === "link") {
            if(x.split(" ").length > 1) {
                invalidReasons = addToArray(invalidReasons, `${prefix} phrases, not links`)
                invalidItems = addToArray(invalidItems, x)
            }
            if(!x.startsWith("http")) {
                invalidReasons = addToArray(invalidReasons, `${prefix} words, not links (make sure it starts with \`http://\`)`)
                invalidItems = addToArray(invalidItems, x)
            }
        }
        else if(itemType === "phrase") {
            if(x.split(" ").length === 1) {
                invalidReasons = addToArray(invalidReasons, `${prefix} words, not phrases`)
                invalidItems = addToArray(invalidItems, x)
            }
            if(replaceCharacters(x, {"https" : "http"}).startsWith("http://")) {
                invalidReasons = addToArray(invalidReasons, `${prefix} links, not phrases`)
                invalidItems = addToArray(invalidItems, x)
            }
        }
        if(operation === "add") {
            const existingListItemsLength = existingListItems.length
            if(existingListItemsLength >= variables.commandItemLimits["blacklist"]) {
                invalidReasons = addToArray(invalidReasons, `You many only have up to 1,000 items in a section. You have ${existingListItemsLength}. Please remove some before trying to add more.`)
                invalidItems = addToArray(invalidItems, x)
            }
            if(existingListItems.includes(x)) {
                invalidReasons = addToArray(invalidReasons, `${prefix} already in the ${sentenceListName}`)
                invalidItems = addToArray(invalidItems, x)
            }
        }
        
        if(operation === "remove") {
            if(!existingListItems.includes(x)) {
                invalidReasons = addToArray(invalidReasons, `${prefix} not already in the ${sentenceListName}`)
                invalidItems = addToArray(invalidItems, x)
            }
        }

    }
    return [removeDuplicates(invalidItems), removeDuplicates(invalidReasons)]
}

export function removeDuplicates(list) {
    const newList = []
    for(const x of list) {
        !newList.includes(x) && newList.push(x)
    }
    return newList
}

export function replaceInEveryItem(list, charactersToReplaceDictionary) {
    const newList = []
    for(const x of list) {
        newList.push(replaceCharacters(x, charactersToReplaceDictionary))
    }
    return newList
}

export async function deleteMessage(message) {
    return await message.delete().catch(error => errorHandler(error, message.channel))
}

export async function addGuildToBlacklistCollections(guild, language="en") {
    const guildID = guild.id
    for(const k in variables.collectionData) {
        const [collectionName, collectionKey, defaultValue, itemType] = variables.collectionData[k]
        const collection = await getCollection(collectionName)
        !(await find(collection, guildID)) && await add(collection, collectionKey, variables.defaultCollectionValues[language][k], guildID)
    }
}

export function removeDuplicatesFromItems(list) {
    const newList = []
    for(const x of list) {
        newList.push(removeDuplicates(x).join(" "))
    }
    return newList
}

export function createCommandMovedEmbed(user, oldCommand, newCommand) {
    return createEmbed("Command moved", `As a part of the December 2021 Update, \`${oldCommand}\` command was removed. **Use \`${newCommand}\` instead**.

Need help? There's a new help guide avaliable.`, variables.colors["blue"], user, null, null)
}

export function createHelpGuideComponents() {
    return createMessageActionRow([createMessageButton("Dashboard (recommended)", null, variables.messageButtonStyles["link"], false, null, variables.websiteBaseURL), createMessageButton("Slash command Guide", null, variables.messageButtonStyles["link"], false, null, variables.baseDocumentationLink), createMessageButton("Community/Support server", null, variables.messageButtonStyles["link"], false, null, variables.serverInviteLink)])
}

export function embedLink(text, link) {
    return `[${text}](${link})`
}

export function removeMutualItemsFromArrays(array1, array2) {
    const [newArray1, newArray2] = [[], []]
    for(const x of array1) {
        !array2.includes(x) && newArray1.push(x)
    }
    for(const x of array2) {
        !array1.includes(x) && newArray2.push(x)
    }
    return [newArray1, newArray2]
}

export async function addItemsToCollection(interaction, enteredItemList, selectedType) {
    const guildID = interaction.guild.id
    const [collectionName, collectionKey, defaultValue, itemType] = variables.collectionData[selectedType]
    const collection = await getCollection(collectionName)
    let query = await find(collection, guildID)
    if(!query) {
        await add(collection, collectionKey, defaultValue, guildID)
    }
    query = await find(collection, guildID)
    const existingListItems = query[collectionKey]
    const sentenceListName = variables.sentenceListTranslations[variables.checkTypeNamesToNumbers[selectedType]]
    const [invalidItems, invalidReasons] = checkIfInvalid(itemType, enteredItemList, existingListItems, sentenceListName, "add")
    const validItems = removeFromArray(enteredItemList, invalidItems)
    await modify(collection, collectionKey, addToArray(existingListItems, validItems), guildID)
    await sendCollectionOperationResults(interaction, "add", validItems, invalidItems, invalidReasons, selectedType)    
}

export async function removeItemsFromCollection(interaction, enteredItemList, selectedType, onlyReturnValues=false) {
    const guildID = interaction.guild.id
    let [collectionName, collectionKey, defaultValue, itemType] = variables.collectionData[selectedType]
    let collection = await getCollection(collectionName)
    let query = await find(collection, guildID)
    !query && await add(collection, collectionKey, defaultValue, guildID)
    query = await find(collection, guildID)
    const existingListItems = query[collectionKey]
    let sentenceListName =  variables.sentenceListTranslations[variables.checkTypeNamesToNumbers[selectedType]]
    let [invalidItems, invalidReasons] = checkIfInvalid(itemType, enteredItemList, existingListItems, sentenceListName, "remove")
    const validItems = removeFromArray(enteredItemList, invalidItems)
    await modify(collection, collectionKey, removeFromArray(existingListItems, validItems), guildID)
    if(onlyReturnValues) {
        return [validItems, invalidItems, invalidReasons]
    }
    await sendCollectionOperationResults(interaction, "remove", validItems, invalidItems, invalidReasons, selectedType)    
    return [undefined, undefined, undefined]
    
}

export async function sendCollectionOperationResults(interaction, operation, validItems, invalidItems, invalidReasons, checkName) {
    let [user, sentenceListTranslation, itemType, pastTenseOperation] = [interaction.user, variables.sentenceListTranslations[variables.checkTypeNamesToNumbers[checkName]], variables.collectionData[checkName]?.[3], operation]
    const validItemsLength = validItems.length 
    const unmodifiedCheckName = checkName
    if(checkName === "both" || checkName === "exactmatch" || checkName === "inwordmatch") {
        if(operation === "add") {
            sentenceListTranslation = replaceCharacters(`word section (${replaceCharacters(sentenceListTranslation, {"section" : ""})})`, {" )" : ")"})
        }
        itemType = "word"
    }
    if(operation === "remove") {
        pastTenseOperation = operation.split("")
        pastTenseOperation.pop()
        pastTenseOperation = pastTenseOperation.join("")
    } 
    const operationIsAdd = operation === "add"
    const word = operationIsAdd ? "to" : "from"
    validItemsLength > 0 && await reply(interaction, createEmbed(`${itemType}(s) ${pastTenseOperation}ed`, `${validItems.length} items have been ${pastTenseOperation}ed ${word} the ${sentenceListTranslation}`, variables.colors["green"], user, {name : `Items ${pastTenseOperation}ed`, value : toEmbedList(validItems)}, "Tip: Add or remove multiple items at one time by seperating them with commas"), null, interaction.replied, operationIsAdd && createMessageActionRow([createMessageButton("Undo", `undoItemsAdded ${interaction.guild.id} ${unmodifiedCheckName}`, variables.messageButtonStyles["secondary"], false, null, null)]))
    invalidItems.length > 0 && await reply(interaction, createEmbed(`Couldn't ${operation} some items`, `Some of the items couldn't be ${pastTenseOperation}ed because:\n- ${invalidReasons.join("\n- ")}`, variables.colors["red"], user, {name : `Item(s) not ${pastTenseOperation}ed`, value : toEmbedList(invalidItems)}, "Tip: Add or remove multiple items at one time by seperating them with commas"), null, interaction.replied)
    if(validItemsLength > 0) {
        variables.lastestAddedItems[interaction.guild.id] = validItems
    }
    if((Math.round(Math.random() * 4) === 1)) await reply(interaction, createEmbed("New way to interact", `Tired of tedious slash commands? The new Bad Word Blocker web dashboard has just been released. The dashboard is an eaiser way to interact with the bot, without slash commands. Please try it out ${embedLink("here", "https://badwordblocker.tech")}, and give us feedback in the support server.`, variables.colors["blue"], user), null, true, null, null, true)
}

export async function getFullBlacklist(guild, organize=false, returnString=false, placeHolder=true) {
    const guildID = guild.id
    let blacklist = []
    const listNames = {
        0 : `Exact-match
===========`,
        1 : `In-word-match
=============`,
        2 : `Links
=====`,
        3 :`Phrases
=======`
    }
    let n = 0
    for(const k in variables.collectionData) {
        const v = variables.collectionData[k]
        organize && blacklist.push(listNames[n])
        let existingItems = ((await find(await getCollection(v[0]), guildID))[v[1]])
        if(existingItems?.length === 0) {
            existingItems = null
        }
        blacklist = addToArray(blacklist, existingItems || (placeHolder && "(Empty list)"))
        n++
    }
    return returnString ? blacklist.join("\n") : blacklist
}

export function convertMinutesToMilliseconds(minutes, allowNullMinutes=false) {
    return allowNullMinutes ? minutes && minutes * 60000 : minutes * 60000
}

export async function timeoutMember(member, reason?, minutes?) {
    return await member.timeout(convertMinutesToMilliseconds(minutes, true), reason)
}

export async function isValidModeratedMember(interaction, author, moderatedMember, action) {
    let isValid = true
    let description = null
    if(author.id === moderatedMember.id) {
        isValid = false
        description = `Sorry, you can't ${action} yourself.`
    }
    if(moderatedMember.id === author.client.user.id) {
        isValid = false
        description = `I do ALL of this work for you for FREE, and *this* is how you treat me? You try to make me ${action} myself? My disappointment is immeasurable and my day is ruined.`
    }
    if(!isValid) {
        await reply(interaction, createEmbed("Invalid moderated member", description, variables.colors["red"], author, null, null))
    }
    return isValid
}

export async function isValidModerationNumber(interaction, numberOrString, min, max, allowStrings=false) {
    if(allowStrings && numberOrString instanceof String) {
        return true
    }
    let isValid = true
    let description = null
    if(min && numberOrString < min) {
        isValid = false
        description = `The number needs to be above ${min - 1}, not ${numberOrString}`
    }
    if(max && numberOrString > max) {
        isValid = false
        description = `The number needs to be below ${max + 1}, not ${numberOrString}`
    }
    if(!isValid) {
        await reply(interaction, createEmbed("Invalid number", description, variables.colors["red"], interaction.user, null, null))
    }
    return isValid
}

export async function checkForModerationPermissions(interactionOrChannel, action, targetMember?) {
    const guild = targetMember.guild
    const botMember = guild.me
    let description = null
    const targetMemberHighestRole = targetMember?.roles.highest
    const botMemberHighestRole = botMember.roles.highest
    const targetMemberToString = targetMember?.toString()
    if((targetMember && targetMember.id) === guild.ownerId) {
        description = `${targetMemberToString} is the owner of this server. I cannot moderate them.`
    }
    if(!description && (targetMember && hasAdmin(targetMember))) {
        description = `${targetMemberToString} is an administrator. I cannot moderate them.`
    }
    if(!description && (targetMember && !botHighestRoleHigher(targetMember))) {
        description = `${targetMember.toString()}'s highest role (${targetMemberHighestRole.toString()}) is higher than or equal to the bot's highest role (${botMemberHighestRole.toString()}). Please move the bot's highest role above their's, or put their highest role below the bot's.`
    } 
    if(!description && action === "timeout") {
        if(!botHasPermission(guild, "MODERATE_MEMBERS")) {
            description = "The bot is missing the `MODERATE_MEMBERS` permission."
        }
    }

    if(action === "ban") {
        if(!description && !botHasPermission(guild, "BAN_MEMBERS")) {
            description = "The bot is missing the `BAN_MEMBERS` permission."
        }
    }

    if(action === "kick") {
        if(!description && !botHasPermission(guild, "KICK_MEMBERS")) {
            description = "The bot is missing the `KICK_MEMBERS` permission."
        }
    }

    if(description) {
        const embedUser = targetMember || interactionOrChannel.client.user
        isChannel(interactionOrChannel) ? await send(interactionOrChannel, createEmbed("Permission error", description, variables.colors["red"], embedUser, null, null)) : await reply(interactionOrChannel, createEmbed("Permission error", description, variables.colors["red"], embedUser, null, null))
    }

    return !description

}

export function botHighestRoleHigher(member) {
    return member.guild.me.roles.highest.comparePositionTo(member.roles.highest) >= 1
}

export function hasAdmin(member) {
    return member.permissions.has("ADMINISTRATOR")
}

export function convertHoursToMinutes(hours) {
    return hours * 60
}

export function addMinutesToCurrentDate(minutes) {
    return new Date((new Date()).getTime() + minutes*60000);
}

export async function doPunishmentIfNecessary(member, channel) {
    const newStrikes = await getStrikes(member)
    const punishment = await getPunishment(member, member.guild, true)
    if(punishment) {
        const whenToDeleteTheBadWordBlockedMessage = await getCollection("when_to_delete_the_bad_word_blocked_message")
        const whenToDeleteTheMessage = await find(whenToDeleteTheBadWordBlockedMessage, member.guild.id)
        const action = punishment["action"]
        const minutes = punishment["minutes"] || convertHoursToMinutes(punishment["hours"])
        let sentMessage
        if(!await checkForModerationPermissions(channel, action, member)) {
            return false
        }
        if(action === "mute" || action === "timeout") {
            if(await timeoutMember(member, `Reached ${newStrikes} strikes`, minutes)) {
                sentMessage = await send(channel, createEmbed("Member Timed Out", "A member has been timed out", variables.colors["yellow"], member, [{name : "Member", value : member.toString()}, {name : "Reason", value : `Reached ${newStrikes} strikes.`}, {name : `Timed out until`, value : String(member.communicationDisabledUntil)}], null)) 
            }
        }
        if(action === "kick") {
            sentMessage = await send(channel, createEmbed("Member kicked", "A member has been kicked", variables.colors["orange"], member, [{name : "Member", value : member.toString()}, {name : "Reason", value : `Member reached ${newStrikes} strikes.`}], null))
            await member.kick(`Member reached ${newStrikes} strikes.`).catch(error => errorHandler({action : "kicked", member : member}, channel))
        }
        if(action === "ban") {
            if(await banMember(member, minutes, `Member reached ${newStrikes} strikes`, channel)) {
                sentMessage = await send(channel, createEmbed("Member banned", "A member has been banned", variables.colors["red"], member, [{name : "Member", value : member.toString()}, {name : "Reason", value : `Member received ${newStrikes} strikes.`}, {name : "Banned until", value : String(addMinutesToCurrentDate(minutes))}]))
            }
        }
        whenToDeleteTheMessage && setTimeout(async () => sentMessage && await deleteMessage(sentMessage), Number(whenToDeleteTheMessage["Seconds"]))
        return punishment
    }
}

export async function processAutocompleteInteraction(interaction) {
    const interactionOptions = interaction.options
    const focusedOption = interactionOptions.getFocused(true)
    const guildID = interaction.guild.id
    let returnChoices = []
    let values = []
    if(interaction.commandName === "limits" && interactionOptions.getSubcommand(false) === "remove" && focusedOption.name === "limit") {
        const punishmentInfo = (await find(await getCollection("punishments"), guildID))?.punishments
        if(!punishmentInfo) {
            return
        }
        for(const k in punishmentInfo) {
            const v = punishmentInfo[k]
            returnChoices = addToArray(returnChoices, `${k} strikes, ${v["action"]}`)
            values = addToArray(values, k)
        }
    }

    return await interaction.respond(getOptionChoices(returnChoices, focusedOption, values))
}

export function getOptionChoices(array, option, values?) {
    let n = 0
    const returnChoices = []
    for(const x of array) {
        x.startsWith(getOptionValue(option)) && returnChoices.push(createSlashCommandChoice(x, values ? values[n] : x))
        n++
    }
    return returnChoices
}

function getCommandData() {
    const slashData = []
    for(const x of slashCommandData.getSlashCommandData()) {
        !variables.commandExceptions.includes(x["name"]) && slashData.push(x)
    }
    console.log(slashData)
    return slashData
}

export async function removeGuildFromDatabase(guild) {
    const guildID = guild.id
    for(const x of await (await getCollection(null, true)).toArray()) {
        if(x["name"] === "advertising") {
            continue
        }
        await erase(await getCollection(x["name"]), guildID)
    }
}

export async function sendInLogChannel(message, badWordsFound) {
    const guildID = message.guild.id
    const logChannelCollection = await getCollection("logchannels")
    const logChannel = await find(logChannelCollection, guildID)
    if(!logChannel || !logChannel.Channel) {
        return
    }
    const channel = getChannel(logChannel["Channel"], message.client)
    if(!channel) {
        await send(message.channel, createEmbed("Cannot send log", "The bot couldn't send a message in the log channel because its either been deleted, or the bot doesn't have permission to see it. Please gave the bot permission to see it and make sure it still exists.", variables.colors["red"], message.author, null, null))
        await erase(logChannelCollection, guildID)
        return
    }
    if(!canSendInChannel(channel)) {
        await send(message.channel, createEmbed("Missing permissions in log channel", `Bad Word Blocker is missing the \`Send Messages\` permission in ${channel.toString()}. Please give it the permission so it can send log messages there.`, variables.colors["red"], message.author, null, null))
        return
    }
    await send(channel, createEmbed("Message deleted", `Message by ${message.member.toString()} was deleted by Bad Word Blocker`, variables.colors["red"], message.author, [{name : "Message", value : message.content}, {name : "Channel", value : message.channel.toString()}, {name : "Reason", value : `Contained word/phrase "${badWordsFound}"`}], null))

}

export function addKeyToEveryItem(array, key, value) {
    for(const x of array) {
        x[key] = value
    }
    return array
}

export function turnEveryValueIntoString(array) {
    for(const x of array) {
        for(const k in x) {
            const v = x[k]
            x[k] = String(v) 
        }
       
    }
    return array
}

export function getChangedKeys(oldDictionary, newDictionary) {
    const changedKeys = []
    for(const k in oldDictionary) {
        const v = oldDictionary[k]
        const newValue = newDictionary[k]
        if(v !== newValue) {
            changedKeys.push({"operationName" : k, "newValue" : newValue})
        }
    }
    return changedKeys
}

export function collectionToMultipleAttributeItems(collection, attributes, prefix?, prefixArrayIndex?, filterFunction?) {
    const itemsArray = []
    for(const x of collectionToArray(collection)) {
        if(filterFunction && !filterFunction(x)) continue
        const attributesArray = []
        let n = 0
        for(const attribute of attributes) {
            attributesArray.push((n === prefixArrayIndex ? prefix : "") + replaceCharacters(x[attribute], {[prefix] : ""}))
            n++
        }
        itemsArray.push(attributesArray)
    }
    return itemsArray
}

export function removeGroupedCharacters(string, character) {
    let newString = ""
    let n = 0
    for(const x of string) {
        if(!(x === character && (n > 0 && string[n - 1] === character))) {
            newString += x
        }
    n += 1
    }
    return newString
}
