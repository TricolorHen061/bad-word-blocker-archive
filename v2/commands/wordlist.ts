import * as variables from "../variables"
import * as functions from "../functions"


export async function wordlistCommands(interaction) {
    const command = interaction.commandName
    const guildID = interaction.guild.id
    const options = interaction.options
    const wordsCollection = await functions.getCollection("custom_bad_words")
    const subCommand = options.getSubcommand(false)
    const member = interaction.member
    const user = interaction.user
    var query = await functions.find(wordsCollection, guildID)
    if(!query) {
        await functions.add(wordsCollection, "badwordlist", variables.defaultCollectionValues["en"]["exactMatchWordSublist"], guildID)
        query = await functions.find(wordsCollection, guildID)
    }
    const badwordlist = query["badwordlist"]
    if(command === "badwordlist") {
        
        await functions.reply(interaction, functions.createCommandMovedEmbed(user, "badwordlist", "blacklist"), null, false, functions.createHelpGuideComponents())
        return

        if(subCommand === "add") {

            const words = functions.convertToASCII(functions.getOptionValue(options.get("words")).toLowerCase()).split(" ")
            const wordsAlreadyAdded = []
            const wordsToAdd = []
            
                for(const x of words) {
                    if(badwordlist.includes(x)) {
                        wordsAlreadyAdded.push(x)
                    }
                    else {
                        wordsToAdd.push(x)
                    }
                }
                if(wordsAlreadyAdded.length > 0) {
                    await functions.reply(interaction, functions.createEmbed("Words already added", "One or more of the words you tried to add were already in the bad word list.", variables.colors["red"], user, {name : "Words", value : `\`${wordsAlreadyAdded.join("`, `")}\``}))
                    return
                }
                
                else {
                    await functions.modify(wordsCollection, "badwordlist", badwordlist.concat(wordsToAdd), guildID)
                    await functions.reply(interaction, functions.createEmbed("Words added", "Words have been added to the bad word list.", variables.colors["green"], user, {name : "Words added", value : `\`${wordsToAdd.join("`, `")}\``}, wordsToAdd.length === 1 ? "Tip: Add multiple words at one time by seperating them with spaces" : "Tip: Add phrases with the \"badphraselist add\" command"))
                }
        }

       else if(subCommand === "remove") {
            const words = functions.convertToASCII(functions.getOptionValue(options.get("words")).toLowerCase()).split(" ")
            const wordsToRemove = []
            const wordsNotInList = []
            if(functions.getValue(words, 0)) {
                for(const x of words) {
                    if(!badwordlist.includes(x)) {
                        wordsNotInList.push(x)
                    }
                    else {
                        wordsToRemove.push(x)
                    }
                }
    
                if(wordsNotInList.length > 0) {
                    await functions.reply(interaction, functions.createEmbed("Words not already added", "Some of the words you tried to remove were not already in the bad word list.", variables.colors["red"], user, {name : "Words", value : `\`${wordsNotInList.join("`, `")}\``}, ""))
                    return
                }
                        
                else {
                    for(const w of wordsToRemove) {
                        badwordlist.splice(badwordlist.indexOf(w), 1)
                    }
    
                    await functions.modify(wordsCollection, "badwordlist", badwordlist, guildID)
                    await functions.reply(interaction, functions.createEmbed("Words removed", "Words have been removed from the bad word list.", variables.colors["green"], user, {name : "Words removed", value : `\`${wordsToRemove.join("`, `")}\``}, "Tip: Remove multiple words by seperating them with spaces"))
                }
            }
            else {
                await functions.reply(interaction, variables.commandUsages["remove"])
            }
        }

        else if(subCommand === "view") {
            if(badwordlist.length === 0) {
                await functions.reply(interaction, functions.createEmbed("Empty bad word list", "The bad word list for this server is empty. You can put it back to the defaults with `/badwordlist reset`, or add your own ones with `/badwordlist add`/`/badwordlist remove`.", variables.colors["blue"], user, null, null))
                return
            }
            
            const optionEmbed = functions.createEmbed("Please choose", "Please choose a method of viewing the bad word list", variables.colors["blue"], user, null, null)

            await functions.reply(interaction, optionEmbed, null, null, await functions.createListButtons(interaction.guild), user)

        }

        else if(subCommand === "preset") {
            const preset = functions.getOptionValue(options.get("preset"))
            await functions.modify(await functions.getCollection("custom_bad_words"), "badwordlist", variables.defaultCollectionValues["en"]["exactMatchWordSublist"], guildID)
            await functions.reply(interaction, functions.createEmbed("Preset used", "The bad word list has been set to a preset.", variables.colors["green"], user, [{name : "Moderator", value : user.toString()}, {name : "Preset used", value : preset}], null))
        }
        else if(subCommand === "clear") {
            if(!member.permissions.has("MANAGE_MESSAGES")) {
                await functions.reply(interaction, functions.createMissingPermissionsEmbed(user, "Manage Messages"))
            return
        }
            await functions.modify(wordsCollection, "badwordlist", [], guildID)
            await functions.reply(interaction, functions.createEmbed("Word list cleared", "The word list has been cleared", variables.colors["green"], user, null, null))
        }

    }
    
}
