import { ComponentContext, ComponentSelectMenuOptionData, InteractionModalArgs, InteractionModalContext } from "detritus-client/lib/utils";
import { ArrayUtils, BotUtils, Strikes, StringUtils } from "./utils";
import { databaseNames, colors, limits, embedDefaults } from "../.././information.json"
import { InteractionCallbackTypes, Permissions } from "detritus-client/lib/constants";
import {  Channel, ChannelGuildText, Member } from "detritus-client/lib/structures";
import { InteractionContext } from "detritus-client/lib/interaction";
import { ParsedArgs } from "detritus-client/lib/command";
import { db } from "./bot";

export async function blacklistModal(context: InteractionModalContext, args: InteractionModalArgs) {
    console.log(context.guild.name)
    const guildId = context.guildId
    const [exactmatchInput, inexactmatchInput, phrasesInput, linksInput] = [ArrayUtils.trimEveryItem(args.exactmatch.toLowerCase().split(",")).filter(element => element !== ""), ArrayUtils.trimEveryItem(args.inexactmatch.toLowerCase().split(",")).filter(element => element !== ""), ArrayUtils.trimEveryItem(args.phrases.toLowerCase().split(",")).filter(element => element !== ""), ArrayUtils.trimEveryItem(args.links.toLowerCase().split(",")).filter(element => element !== "")]
    let [invalidExactMatchInput, invalidInexactMatchInput, invalidPhrasesInput, invalidLinksInput] = [[], [], [], []]
    invalidExactMatchInput = exactmatchInput.filter(item => item.split(" ").length > 1 || item.startsWith("http"))
    invalidInexactMatchInput = inexactmatchInput.filter(item => item.split(" ").length > 1 || item.startsWith("http"))
    invalidPhrasesInput = phrasesInput.filter(item => item.split(" ").length === 1)
    invalidLinksInput = linksInput.filter(item => (!item.startsWith("http://") && !item.startsWith("https://")) || item.split(" ").length > 1)
    const invalidSentences = [
        invalidExactMatchInput.length !== 0 && `${invalidExactMatchInput.length} items from exact-match section were not added because they were not one word.`,
        invalidInexactMatchInput.length !== 0 && `${invalidInexactMatchInput.length} items from inexact-match section were not added because they were not one word.`,
        invalidPhrasesInput.length !== 0 && `${invalidPhrasesInput.length} items from phrases section were not added because they were not a group of words.`,
        invalidLinksInput.length !== 0 && `${invalidLinksInput.length} items from links section were not added because they were not links (make sure they begin with \`http://\` or \`https://\`).`
    ].filter(item => item)
    const hasInvalidItems = invalidSentences.length > 0
    const embed = BotUtils.createEmbed("Blacklist modified", `

**If a word in inexact match is not being blocked, try putting an underscore \`_\` in front of it.**

Exact-match: **${exactmatchInput.length - invalidExactMatchInput.length}** items
Inexaxct-match: **${inexactmatchInput.length - invalidInexactMatchInput.length}** items
Phrases: **${phrasesInput.length - invalidPhrasesInput.length}** items
Links: **${linksInput.length - invalidLinksInput.length}** items`, context.user, null, hasInvalidItems ? colors.blue : colors.green, "NOTE: Only the first 300 items from each section are shown")
if(hasInvalidItems) embed.description += `

**NOTE:** 
- ${invalidSentences.join("\n- ")}`

    const blacklistNames = databaseNames.blacklist
    await db.set(blacklistNames.exactmatch.collectionName, blacklistNames.exactmatch.keyName, exactmatchInput.filter(item => !invalidExactMatchInput.includes(item)), guildId)
    await db.set(blacklistNames.inexactmatch.collectionName, blacklistNames.inexactmatch.keyName, inexactmatchInput.filter(item => !invalidInexactMatchInput.includes(item)), guildId)
    try {
        await db.set(blacklistNames.links.collectionName, blacklistNames.links.keyName, linksInput.filter(item => !invalidLinksInput.includes(item)).map(link => link.endsWith("/") ? link.slice(0, -1) : link), guildId)
    }
    catch(e) {
        console.log(e)
    }
    await db.set(blacklistNames.phrases.collectionName, blacklistNames.phrases.keyName, phrasesInput.filter(item => !invalidPhrasesInput.includes(item)), guildId)
    return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : embed})

}

export async function strikesEditButton(context: ComponentContext, targetMember: Member) {
    return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, BotUtils.createModal("Change Member Strikes", [
{label : "Strikes", value : String(await Strikes.getStrikes(db, targetMember)), customId : "strikes"}
    ], async (c, a) => await strikesEditModal(c, a, targetMember)))
}

export async function strikesEditModal(context: InteractionModalContext, args: InteractionModalArgs, targetMember: Member) {
    const targetStrikes = Number(args.strikes)
    console.log(targetStrikes)
    if(!StringUtils.containsOnlyNumbers(args.strikes) || Number(targetStrikes > limits.strikes.max) || targetStrikes < limits.strikes.min) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Invalid strike amount", "Strike amount needs to be a number between 0 and 9999.", context.member, null, colors.red)})
    await Strikes.setStrikes(db, targetMember, targetStrikes)
    // await context.message.delete()
    return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed: BotUtils.createEmbed("Strikes set", `Strikes for ${targetMember.mention} successfully set to **${targetStrikes}**`, context.user)})
}

export async function limitsEditButton(context: ComponentContext, guildLimits: Map<string, Map<string, string | number>>) {
    // await context.message.delete()
    const selectMenuOptions: Array<ComponentSelectMenuOptionData> = []
    for(const strikes in guildLimits) {
        const data = guildLimits[strikes]
        selectMenuOptions.push({label : `${strikes} strikes, ${data["action"]}`, value : strikes})
    }
    return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {content : "Please select the items you wish to remove", components : [BotUtils.createSelectMenu(BotUtils.createActionRow(), "Ok", selectMenuOptions, c => console.log("SelectMenu works"), 1, Object.keys(guildLimits).length, "limitsRemoveSelectMenu")]})
}

export async function bypassesEditButton(context: ComponentContext, guildBypasses: Map<string, Array<string>>, entity: "channel" | "role") {
    let selectMenuOptions: Array<ComponentSelectMenuOptionData> = []
    const alreadyAdded = []
    console.log("Ok got here!")
    if(entity === "channel") { 
        for(const channelId of guildBypasses["channels"]) {
            console.log(`${context.guild.name} channels 1`)
            selectMenuOptions.push({label : context.guild.channels.get(channelId).name, value : channelId})
            console.log(`${context.guild.name} channels 2`)
        }
    }

    else if(entity === "role") { 
        for(const roleId of guildBypasses["roles"]) {
            console.log(`${context.guild.name} roles 1`)
            selectMenuOptions.push({label : context.guild.roles.get(roleId).name, value : roleId})
            console.log(`${context.guild.name} channels 2`)
        }
    }

    console.log(selectMenuOptions)
    selectMenuOptions = selectMenuOptions
        .filter((item, pos) => {
            console.log(alreadyAdded)
            return alreadyAdded.includes(item.value) ? false : alreadyAdded.push(item.value) || true
        })
    console.log(selectMenuOptions)
    try {
        const t = await BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {content : `Please select the ${entity}s that you'd like to remove`, components : [BotUtils.createSelectMenu(BotUtils.createActionRow(), `${entity}s`, selectMenuOptions, c => console.log("Ok"), 1, selectMenuOptions.length, "bypassesRemove")]})
        console.log("Try")
        console.log(t["errors"]["data"]["components"]["0"])
    }
    catch(e) {console.log("Catch"); (console.log(e["errors"]["data"]["components"]["0"]))}

}

export async function logChannelRemoveButton(context: ComponentContext, existingLogChannel: ChannelGuildText) {
    // await context.message.delete()
    await db.delete(databaseNames.log.collectionName, context.guildId)
    await BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Removed log channel", `Log channel ${existingLogChannel.mention} has been removed.`, context.user, null, colors.green)})
} 

export async function customizeModal(context: InteractionModalContext, args: InteractionModalArgs) {
    const cleanupSeconds = Number(args.cleanup)
    const isInvalidSeconds = cleanupSeconds > limits.cleanup.max
    const isInvalidColorInt = !StringUtils.containsOnlyNumbers(args.color) || args.color.length > 8
    await db.set(databaseNames.custom.collectionName, databaseNames.custom.keyName, {content : args.content.trim() ? args.content : embedDefaults.content, color: (isInvalidColorInt || cleanupSeconds < 1) ? embedDefaults.color : Number(args.color), cleanup : isInvalidSeconds ? 0 : Number(args.cleanup)}, context.guildId)
    return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Customization settings saved", `
The customization settings were saved.` + (isInvalidSeconds || isInvalidColorInt ? `

**Note:**
The \`delete self after\` and/or \`color\` fields have been omitted because the values were either too big, or not numbers.` : ""), context.user, null, (isInvalidColorInt || isInvalidSeconds) ? colors.blue : colors.green)})
}

export async function commandChannelCommand(context: InteractionContext, args: ParsedArgs) {
    console.log("Ayo")
    const channel: Channel = args.channel
    const subCommand = context.invoker
    if(!BotUtils.hasAllPermissions(context.member, [Permissions.MANAGE_MESSAGES])) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createMemberMissingPermissionsEmbed(context.member, ["Manage Messages"])})
    if(!channel.isText) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Invalid channel type", "The channel needs to be a text channel.", context.user, null, colors.red)})
    const guildExtraFeaturesData = await db.get(databaseNames.extras.collectionName, databaseNames.extras.keyName, {}, "1")
    if(subCommand.name === "add") {
        guildExtraFeaturesData[context.guildId]["command_channels"].push(channel.id)
        await db.set(databaseNames.extras.collectionName, databaseNames.extras.keyName, guildExtraFeaturesData, context.guildId)
        return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Command channel added", `Every message in ${channel.mention} will deleted unless it's from a bot`, context.user, null, colors.green)})    
    }
    else {
        guildExtraFeaturesData[context.guildId]["command_channels"].splice(guildExtraFeaturesData[context.guildId]["command_channels"].indexOf(channel.id), 1)
        await db.set(databaseNames.extras.collectionName, databaseNames.extras.keyName, guildExtraFeaturesData, context.guildId)
        return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Command channel remove", `Every message in ${channel.mention} will no longer get deleted if it's not from a bot`, context.user, null, colors.green)})    
    }
}

export async function cleanupBotCommand(context: InteractionContext, args: ParsedArgs) {
    const targetUser = args.bot
    const subCommand = context.invoker
if(!BotUtils.hasAllPermissions(context.member, [Permissions.MANAGE_MESSAGES])) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createMemberMissingPermissionsEmbed(context.member, ["Manage Messages"])})
    if(!targetUser.bot) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Not a bot", "That user is not a bot", context.user, null, colors.red)})
    const guildExtraFeaturesData = await db.get(databaseNames.extras.collectionName, databaseNames.extras.keyName, {}, "1")
    if(subCommand.name === "add") {
        const seconds = Number(args.seconds)
        if(seconds > limits.cleanup_bot.max || seconds < limits.cleanup_bot.min) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Invalid seconds amount", `That number goes out of the limits. Please use a number between ${limits.cleanup_bot.min} and ${limits.cleanup_bot.max}.`, context.user, null, colors.red)})
        guildExtraFeaturesData[context.guildId]["cleanup_bots"].push([targetUser.id, seconds])
        await db.set(databaseNames.extras.collectionName, databaseNames.extras.keyName, guildExtraFeaturesData, "1")
        return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Added filtered bot", `${context.user.mention}'s messages will be cleaned up (deleted) after ${seconds} seconds.`, context.user, null, colors.green)})
    
    }
    else {
        guildExtraFeaturesData[context.guildId]["cleanup_bots"].splice(guildExtraFeaturesData[context.guildId]["cleanup_bots"].indexOf(guildExtraFeaturesData[context.guildId]["cleanup_bots"].find(item => item[0] === targetUser.id)), 1)
        await db.set(databaseNames.extras.collectionName, databaseNames.extras.keyName, guildExtraFeaturesData, "1")
        return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Removed filtered bot", `${context.user.mention}'s messages will not be cleaned up (deleted) after seconds.`, context.user, null, colors.green)}) 
    }
}
