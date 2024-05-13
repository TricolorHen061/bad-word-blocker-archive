import * as functions from "../functions"
import * as variables from "../variables"

export async function buttonInteractions(buttonInteraction) {
    const customID = buttonInteraction.customId
    const guild = buttonInteraction.guild
    const user = buttonInteraction.user
    const guildID = buttonInteraction.guild.id

    if(customID === "ping") {
        await functions.reply(buttonInteraction, functions.createEmbed("Pong!", `${user.toString()}, button interaction received`, variables.colors["green"], user, null, null), null, true)
    }
    
    else if(customID === "leaveserver") {
        await functions.reply(buttonInteraction, functions.createEmbed("Bye!", "Thanks for using Bad Word Blocker!", variables.colors["blue"], user, null, null), null, true, functions.createMessageActionRow([functions.createMessageButton("Invite bot", null, variables.messageButtonStyles["link"], false, false, variables.inviteLink)]))
        await functions.processGuildDelete((await guild.leave()), buttonInteraction.message.embeds[0].fields[0].value, buttonInteraction.user)
    }

    else if(customID === "cancel") {
        await functions.reply(buttonInteraction, functions.createEmbed("Canceled", `Canceled by ${user.toString()}`, variables.colors["blue"], user, null, null), null, true, null, null)
    }

    else if(customID === "resetSection") {
        const sentenceSectionName = buttonInteraction.message.embeds[0].fields[0].value 
        const section = variables.checkTypeNumbersToNames[variables.reverseSentenceListTranslations[sentenceSectionName]]
        const language = buttonInteraction.message.embeds[0].fields[1].value
        const [collectionName, collectionKey, defaultValue, itemType] = variables.collectionData[section]
        await functions.modify(await functions.getCollection(collectionName), collectionKey, variables.defaultCollectionValues["en"][section], guildID)
        await functions.reply(buttonInteraction, functions.createEmbed("Reset", "Section was successfully reset. Use the `/blacklist view` command to view it.", variables.colors["green"], user, [{name : "Section", value : sentenceSectionName}, {name : "Language", value : language}], null), null, true)
    }

    else if(customID === "clearSection") {
        const sentenceSectionName = buttonInteraction.message.embeds[0].fields[0].value 
        const section = variables.checkTypeNumbersToNames[variables.reverseSentenceListTranslations[sentenceSectionName]]
        const [collectionName, collectionKey, defaultValue, itemType] = variables.collectionData[section]
        await functions.modify(await functions.getCollection(collectionName), collectionKey, defaultValue, guildID)
        await functions.reply(buttonInteraction, functions.createEmbed("Reset", "Section was successfully cleared. Use the `/blacklist view` command to view it.", variables.colors["green"], user, [{name : "Section", value : sentenceSectionName}], null), null, true)
    }

    else if(customID.startsWith("viewList")) {
        const [method, guildID] = buttonInteraction.customId.split(" ").splice(1)
        if(method === "website") {
            await functions.reply(buttonInteraction, functions.createEmbed("Link", `You can use ${functions.embedLink("this", "https://badwordblocker.tech/")} website to view and edit the blacklist, via the web.`, variables.colors["blue"], user, null, null), null, true, null, user, true)
        }
        else if(method === "file") {
            await functions.dmMessage(buttonInteraction, user, null, functions.stringToFile(await functions.getFullBlacklist(guild, true, true)), "blacklist.txt")
            await functions.reply(buttonInteraction, functions.createEmbed("Sent", "List sent via DMs or hidden message below", variables.colors["green"], user, null, "One line represents one item in the list"), null, true, null)
        }
    }

    else if(customID.startsWith("wordsChoice")) {
        const [choice, interactionID, guildID] = customID.split(" ").splice(1)
        let [collectionName, collectionKey, defaultValue, itemType] = variables.collectionData[choice]
        await functions.addItemsToCollection(buttonInteraction, variables.pendingWords[interactionID], choice)
    }

    else if(customID.startsWith("undoItemsAdded")) {
        const [guildID, selectedType] = customID.split(" ").splice(1)
        await functions.removeItemsFromCollection(buttonInteraction, variables.lastestAddedItems[guildID], selectedType, false)
        delete variables.lastestAddedItems[guildID]
    }

}