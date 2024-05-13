import * as functions from "./functions"
import * as variables from "./variables"

export async function check(message){
    if(!message.member) {
        return
    }
    await functions.oneIsTrue([bypassCheck, ignoreCheck, messageCheck, verificationCheck], message)
}


async function messageCheck(message) {
    if(false) {
        for(const x of functions.getMessageAttachmentLinks(message, true, [".webp", ".jpg", ".jpeg"], ".png")) {
            const results = await functions.getModelPredictions(x)
            const classifiedResults = functions.classifyModelResults(results, 70)
            if(classifiedResults[0] || message.content === "NSFWEmbed") {
                await sendMessageBlockedEmbed(message, 1, "nsfw", null, classifiedResults[1])
            }
        }
    }
    
    const messageContent = message.content
    const guildID = message.guild.id
    const settingsCollection = await functions.getCollection("settings")
    var guildSettings = (await functions.find(settingsCollection, guildID))?.settings
    if(message.content === "/" || (message.content.startsWith("/") && variables.commandPermissions[functions.replaceCharacters(message.content, {"/" : ""})])) {
        const respondToSlash = guildSettings?.respondToSlash
        if(respondToSlash === undefined || guildSettings?.respondToSlash) {
            await functions.send(message.channel, functions.createEmbed("How to run a command", "Type a `/` in the message box and a list of commands should appear.", variables.colors["blue"], message.author, null, "Moderators: Use the \"/settings\" command to disable this embed", null, "https://cdn.discordapp.com/attachments/722648908991299645/882464847474860042/Screenshot_2021-08-31_22-11-38.png"))
        }
    }
    let badItemsFound = null
    let checkTypeNumber = null
    for(const x of functions.range(1, 5)) {
        const result = await functions.checkString(message, message.guild, message.channel, x, true)
        badItemsFound = result[0]
        if(badItemsFound) {
            checkTypeNumber = result[1]
            break
        }
       
    }
    if(badItemsFound) {
        const adminBypass = guildSettings?.admin
        if((adminBypass === undefined || guildSettings?.admin) && functions.hasPermissions(message.member, "ADMINISTRATOR")) {
            if(!guildSettings?.alreadySentBypassMessage) {
                await functions.send(message.channel, functions.createEmbed("Administrator Bypass", "I would have blocked that message, but since you're an administrator, you get to bypass the bot! You can turn administator bypass with the `settings` command.", variables.colors["blue"], message.author, null, "This message will never be sent again"))
            }
            if(!guildSettings) {
                guildSettings = {}
            }
            guildSettings["alreadySentBypassMessage"] = true
            await functions.modify(settingsCollection, "settings", guildSettings, guildID)
            return
        }
        await functions.deleteMessage(message)
        await functions.sendInLogChannel(message, badItemsFound)
        const guildPunishments = (await functions.find(await functions.getCollection("punishments"), guildID))?.punishments
        const guildLimits = guildPunishments && Object.keys(guildPunishments).length > 0
        guildLimits && await functions.addStrikes(message.member, 1)
        return await functions.doPunishmentIfNecessary(message.member, message.channel) ?? await sendMessageBlockedEmbed(message, guildLimits, "word", checkTypeNumber, null)
        }
        
    }







async function verificationCheck(message) {
    const guildID = message.guild.id
    const unverifiedMembersCollection = await functions.getCollection("unverified_members")
    const unverifiedMembers = await functions.find(unverifiedMembersCollection, guildID)
    const channel = message.channel
    if(unverifiedMembers) {
        for(const x of unverifiedMembers["members"]) {
            if(x["memberID"] === message.member.id) {
                if(x["theCode"] === message.content) {
                    if(!await functions.verifyMember(message.member, message.channel)) {
                        return
                    }
                    const botMessageID = x["botMessage"]
                    var botMessage = functions.getMessage(functions.getChannel(x["channelID"], message.client), botMessageID)
                    if(!botMessage) {
                        botMessage = await channel.fetch(botMessage)
                    }
                    await functions.deleteMessage(botMessage)
                    await functions.deleteMessage(message)
                    await functions.remove(unverifiedMembersCollection, "members", x, guildID)
                }
            }
        }
    }

}

async function bypassCheck(message) {
    const guildID = message.guild.id
    const bypassesCollection = await functions.getCollection("bypasses")
    const query = await functions.find(bypassesCollection, guildID)
    if(query) {
        for(const x of query["roles"]) {
            if(message.member.roles.cache.find(role => role.id === x)) {
                return true
            }
        }
    }
}

async function ignoreCheck(message) {
    const guildID = message.guild.id
    const messageContent = message.content
    const ignoresCollection = await functions.getCollection("ignores")
    const query = await functions.find(ignoresCollection, guildID)
    if(query) {
        for(const x of query["channels"]) {
            if(message.channel.id === x) {
                return true
            }
        }
    }
}

async function sendMessageBlockedEmbed(message, guildLimits?, type?, checkTypeNumber?, nsfwInfo?) {
    const guildID = message.guild.id
    const embedOption = await functions.getMessageBlockedEmbed(message.guild)
    const customMessageCollection = await functions.getCollection("custom_messages")
    const customMessageInfo = await functions.find(customMessageCollection, guildID)
    const whenToDeleteTheBadWordBlockedMessage = await functions.getCollection("when_to_delete_the_bad_word_blocked_message")
    const whenToDeleteTheMessage = await functions.find(whenToDeleteTheBadWordBlockedMessage, guildID)
    const user = message.author

        
    
    const memberStrikes = await functions.getStrikes(message.member)
    let embedOrContent = null

    const itemType = variables.collectionData[variables.checkTypeNumbersToNames[checkTypeNumber]][3]
    let [description, fields, footer] = [`${message.member.toString()}'s message contained a blacklisted ${itemType}`, [{name : "Strikes", value : String(memberStrikes)}], "Use `/get` to get your message back"]


    if(!guildLimits){
        fields = []
        footer = "Set limit on strikes with /limits command"
    }


    if(customMessageInfo) {

        const customMessage = customMessageInfo["info"]
        const infoContent = customMessage["content"]
        if(!infoContent) {
            await functions.erase(customMessageCollection, guildID)
            return
        }
        const content = functions.replaceCharacters(infoContent, {"{username}" : user.username, "{tag}" : user.discriminator, "{mention}" : user.toString(), "{deleted_message}" : message.content, "{strikes}" : String(memberStrikes)})
        const embedColor = customMessage["color"]
        
        embedOrContent = customMessage["isEmbed"] ? functions.createEmbed("Message Blocked", content, embedColor, message.author, null, null, null) : content
    }

    else if(!type || type === "word") {
        embedOrContent = functions.createEmbed("Message blocked", description, variables.colors["red"], message.author, fields, footer)
    }

    else if((type === "nsfw") && nsfwInfo) {
        embedOrContent = functions.createEmbed("NSFW message blocked", description, variables.colors["purple"], message.author, [{name : "Strikes", value : String(memberStrikes)}, {name : "Identified as", value : nsfwInfo["className"]}, {name : "Probability", value : `~${nsfwInfo["probability"]}%`}], "This feature is new. Please give feedback in the Bad Word Blocker Community server.")
    }
    else if(type === "phrase") {
        embedOrContent = functions.createEmbed("Bad phrase deleted", description, variables.colors["red"], message.author, fields, footer)
    }
    else if(type === "link") {
        embedOrContent = functions.createEmbed("Bad link deleted", description, variables.colors["red"], message.author, fields, footer)
    }


    const wordBlockedEmbedMessage = await functions.send(message.channel, embedOrContent)
    
    whenToDeleteTheMessage && setTimeout(async () => wordBlockedEmbedMessage && await functions.deleteMessage(wordBlockedEmbedMessage), Number(whenToDeleteTheMessage["Seconds"]))

    return embedOrContent
}
