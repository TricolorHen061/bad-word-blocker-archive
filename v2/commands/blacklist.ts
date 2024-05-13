import * as functions from "../functions"
import * as variables from "../variables"

export async function blacklistCommands(interaction) {
    const command = interaction.commandName
    const user = interaction.user
    const member = interaction.member
    const options = interaction.options
    const subCommand = options.getSubcommand(false)
    const guildID = interaction.guild.id
    if(command === "blacklist") {
        let selectedType = functions.getOptionValue(options.get("type"))
        let enteredItems = functions.getOptionValue(options.get("items"))
        enteredItems = enteredItems && enteredItems.toLowerCase()
        const trimmedEnteredItems = enteredItems && functions.trimEveryString(enteredItems.split(","), " ")
        const enteredItemList = enteredItems && selectedType === "link" ? functions.replaceInEveryItem(trimmedEnteredItems, {"https://" : "http://"}) : trimmedEnteredItems
        const sentenceListName = variables.sentenceListTranslations[selectedType]

        if(selectedType === "words" && subCommand === "add") {
            await functions.reply(interaction, functions.createEmbed("Detecting words", `Would you like the bot to block the words you just added if they are found in other words, or only if an exact match is found?

**Exact-match**- Block the words if found exactly as added. 
**In-word match**- Block the words if found exactly as added, or if in another word.

This is a **test** (exact match)
I am **test**ing (not exact match, since "ing" is on the end)

Selecting "In-word-match" will do fine for most words.
`, variables.colors["blue"], user, null, null), null, false, functions.createMessageActionRow([functions.createMessageButton("Exact-match", `wordsChoice exactmatch ${interaction.id} ${interaction.guild.id}`, variables.messageButtonStyles["primary"]), functions.createMessageButton("In-word-match", `wordsChoice inwordmatch ${interaction.id} ${interaction.guild.id}`, variables.messageButtonStyles["primary"])]), user)
    variables.pendingWords[interaction.id] = enteredItemList
    return
}
        if(selectedType === "words") {
            selectedType = "exactmatch"
        }
        if(subCommand === "add") {
            await functions.addItemsToCollection(interaction, enteredItemList, selectedType)
        }
        else if(subCommand === "remove") {
            const [validItems, invalidItems, invalidReasons] = await functions.removeItemsFromCollection(interaction, enteredItemList, selectedType, selectedType === "exactmatch")
            if(!validItems) {
                return
            }
            let [inWordMatchValidItems, inWordMatchInvalidItems, inWordMatchInvalidReasons] = await functions.removeItemsFromCollection(interaction, enteredItemList, "inwordmatch", selectedType === "exactmatch")
            let allValidItems = functions.removeDuplicates(functions.addToArray(validItems, inWordMatchValidItems))
            let allInvalidItems = functions.removeDuplicates(functions.removeFromArray(functions.addToArray(invalidItems, inWordMatchInvalidItems), validItems))
            const allInvalidReasons = functions.replaceInEveryItem(functions.addToArray(invalidReasons, inWordMatchInvalidReasons), {"exact-match section" : "word section", "in-word-match section" : "word section"})
            await functions.sendCollectionOperationResults(interaction, "remove", allValidItems, allInvalidItems, allInvalidReasons, "both")    
        }
        else if(subCommand === "view") {
            await functions.reply(interaction, functions.createEmbed("Please choose", `Please choose a method of viewing the blacklist`, variables.colors["blue"], user, null, null), null, null, await functions.createListButtons(interaction.guild), user)
        }

        else if(subCommand === "reset") {
            await functions.reply(interaction, functions.createEmbed("Are you sure?", `You are about to reset the section to its defaults. You cannot get the current set of items back. You might wanna use the \`/blacklist view\` command to get a downloadable copy of the current one, in case you wish to go back. 

            Are you sure you want to continue?`, variables.colors["red"], user, [{name : "Section", value : variables.sentenceListTranslations[variables.checkTypeNamesToNumbers[functions.getOptionValue(options.get("section"))]]}, {name : "Language", value : functions.getOptionValue(options.get("language"))}], null, false), null, null, functions.createMessageActionRow([functions.createMessageButton("Yes", "resetSection", variables.messageButtonStyles["danger"]), functions.createMessageButton("No", "cancel", variables.messageButtonStyles["secondary"])]))
        }

        else if(subCommand === "clear") {
            await functions.reply(interaction, functions.createEmbed("Are you sure?", `You are about to remove all items from the section. You cannot get the current set of items back. You might wanna use the \`/blacklist view\` command to get a downloadable copy of the current one, in case you wish to go back. 

            Are you sure you want to continue?`, variables.colors["red"], user, [{name : "Section", value : variables.sentenceListTranslations[variables.checkTypeNamesToNumbers[functions.getOptionValue(options.get("section"))]]}], null, false), null, null, functions.createMessageActionRow([functions.createMessageButton("Yes", "clearSection", variables.messageButtonStyles["danger"]), functions.createMessageButton("No", "cancel", variables.messageButtonStyles["secondary"])]))

        }

    }

}