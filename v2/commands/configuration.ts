import * as functions from "../functions"
import * as variables from "../variables"
export async function configurationCommands(interaction) {
    const command = interaction.commandName
    const guildID = interaction.guild.id
    const options = interaction.options
    const subCommand = options.getSubcommand(false)
    const member = interaction.member
    const user = interaction.user
    const channel = interaction.channel


    if(command === "log") {        

        const logsChannelsCollection = await functions.getCollection("logchannels")
        if(subCommand === "set") {
            const channel = functions.getOptionValue(options.get("channel"))
            if(channel.type === "GUILD_TEXT") {
                await functions.modify(logsChannelsCollection, "Channel", channel.id, guildID)
                await functions.reply(interaction, functions.createEmbed("Channel set", "A new log channel has been set.", variables.colors["green"], user, {name : "Channel", value : channel.toString()}, null))
            }
            else {
                await functions.reply(interaction, functions.createEmbed("Invalid channel type", `Please mention a text channel, not a ${channel.type} channel.`, variables.colors["red"], user, null, null))
                return
            }
        }
        else if(subCommand === "remove") {
            await functions.erase(logsChannelsCollection, guildID)
            await functions.reply(interaction, functions.createEmbed("Log channel removed", "Server log channel removed", variables.colors["green"], user, null, null))
        }

    }
    
    if(command === "cleanup") {

        const whenToDeleteTheBadWordBlockedMessage = await functions.getCollection("when_to_delete_the_bad_word_blocked_message")
        if(subCommand === "set") {
            const seconds = functions.getOptionValue(options.get("seconds"))
            if(Number.isNaN(seconds)) {
                await functions.reply(interaction, functions.createEmbed("Invalid value", `seconds has to be a number, not "${seconds}".`, variables.colors["red"], user, null, null))                
                return
            }
            else {
                await functions.modify(whenToDeleteTheBadWordBlockedMessage, "Seconds", String(seconds * 1000), guildID)
                await functions.reply(interaction, functions.createEmbed("Cleanup seconds changed", `Bad Word Blocker will delete its own messages after ${seconds} seconds.`, variables.colors["green"], user, null, null))
            
                                    
            }
        }
        else if(subCommand === "remove") {
            await functions.erase(whenToDeleteTheBadWordBlockedMessage, guildID)
            await functions.reply(interaction, functions.createEmbed("Removed cleanup seconds", "The bot won't delete its own messages anymore.", variables.colors["green"], user, null, null))

        }
    }   
    if(command === "muterole") {

        await functions.reply(interaction, functions.createEmbed("Command moved", "This command is no longer in use. **Use `/timeout` instead**", variables.colors["blue"], user, null, null))
        return

        const mutedRolesCollection = await functions.getCollection("muted_roles")
        if(subCommand === "set") {
            const role = functions.getOptionValue(options.get("role"))
            if(role) {
                await functions.modify(mutedRolesCollection, "role_id", role.id, guildID)
                await functions.reply(interaction, functions.createEmbed("Mute role set", `Bad Word Blocker will use role ${role.toString()} when muting people.`, variables.colors["green"], user, null, null))
            }

            }
        else if(subCommand === "remove") {
            await functions.erase(mutedRolesCollection, guildID)
            await functions.reply(interaction, functions.createEmbed("Role removed", "Bad Word Blocker will not use that role anymore.", variables.colors["green"], user, null, null))
        }
}
    if(command === "verification") {

        const verificationInfoCollection = await functions.getCollection("verification_info")
        if(subCommand === "set") {
            return await functions.reply(interaction, functions.createEmbed("Feature Deprecated", "This feature is deprecated and will be removed in the near future. Please run `/verification undo` to undo the verification system.", variables.colors["yellow"], user))
            const channel = functions.getOptionValue(options.get("channel"))
            const role = functions.getOptionValue(options.get("role"))
            if(channel && role) {
                if(channel.type !== "GUILD_TEXT") {
                    await functions.reply(interaction, functions.createEmbed("Invalid channel type", `The channel needs to be a textchannel, not ${channel.type}.`, variables.colors["red"], user, null, null))
                    return
                }
                if(!await functions.find(verificationInfoCollection, guildID)) {
                    await functions.modify(verificationInfoCollection, "info", {}, guildID)
                }
                await functions.modify(verificationInfoCollection, "info", {"channelID" : channel.id, "roleID" : role.id}, guildID)
                await functions.reply(interaction, functions.createEmbed("Verification system setup", "When a user joins, they will be mentioned in the verification channel, where they will be prompted to verify by entering a code. When they verify, they will be given the verified role.", variables.colors["green"], user, [{name : "Verification Channel", value : channel.toString()}, {name : "Verified Role", value : role.toString()}], "Run `/verification undo` to undo the verification system."))
            }
            else {
                
            }
        }
        else if(subCommand === "undo") {
            await functions.erase(verificationInfoCollection, guildID)
            await functions.reply(interaction, functions.createEmbed("Verification system undone", "Bad Word Blocker's verification has been removed.", variables.colors["green"], user, null, null))
        }
    }
    if(command === "links") {

        await functions.reply(interaction, functions.createCommandMovedEmbed(user, "links", "blacklist"), null, false, functions.createHelpGuideComponents())
        return

        const customBadLinksCollection = await functions.getCollection("custom_bad_links")
        const customBadLinks = await functions.find(customBadLinksCollection, guildID)
        const linksNotAlreadyAdded = []
        const linksAlreadyAdded = []
        const notLinks = []
        const links = functions.getOptionValue(options.get("links"))?.toLowerCase().split(" ")
        if(!customBadLinks) {
            await functions.add(customBadLinksCollection, "Links", [], guildID)
        }
        const newQuery = await functions.find(customBadLinksCollection, guildID)
        const badLinks = newQuery["Links"]
        if(subCommand === "add") {
            for(var x of links) {
                if(!x.startsWith("http")) {
                    notLinks.push(x)
                } 
                else {
                    x = x.replace("https://", "http://")
                }
                if(badLinks.includes(x)) {
                    linksAlreadyAdded.push(x)
                }
                else {
                    linksNotAlreadyAdded.push(x)
                }
            }
            if(notLinks.length > 0) {
                await functions.reply(interaction, functions.createEmbed("Not links", "It looks like you tried to add words, not links. If you'd like to add words, use `/badwordlist add`.", variables.colors["red"], user, {name : "Words", value : `\`${notLinks.join("` `")}\``}, "Make sure \"http://\" or \"https://\" is at the beginning of the link."))
                return
            }                    
            if(linksAlreadyAdded.length > 0) {
                await functions.reply(interaction, functions.createEmbed("Some links already added", "Some of the links you gave were already in the bad link list.", variables.colors["red"], user, {name : "Links", value : `\`${linksAlreadyAdded.join("`, `")}\``}, null))
            }
            
            else {
                await functions.modify(customBadLinksCollection, "Links", badLinks.concat(linksNotAlreadyAdded), guildID)
                await functions.reply(interaction, functions.createEmbed("Links Added", "Some links were added to the bad link list.", variables.colors["green"], user, {name : "Links", value : `\`${linksNotAlreadyAdded.join("`, `")}\``}, "Tip: Add multiple bad links at one time by seperating them with spaces"))
            }
        }

        else if(subCommand === "remove") {
            for(var x of links) {
                x = x.replace("https://", "http://")
                if(badLinks.includes(x)) {
                    linksAlreadyAdded.push(x)
                }
                else {
                    linksNotAlreadyAdded.push(x)
                }
            }
            if(linksNotAlreadyAdded.length > 0) {
                await functions.reply(interaction, functions.createEmbed("Some links not already added", "Some of the links you tried to remove were not already in the bad link list.", variables.colors["red"], user, {name : "Links", value : `\`${linksNotAlreadyAdded.join("`, `")}\``}, null))
            }
            else {
                for(const m of linksAlreadyAdded) {
                    badLinks.splice(badLinks.indexOf(m), 1)
                }
                await functions.modify(customBadLinksCollection, "Links", badLinks, guildID)
                await functions.reply(interaction, functions.createEmbed("Links removed", "Some links were removed from the bad link list.", variables.colors["green"], user, {name : "Links", value : `\`${linksAlreadyAdded.join("`, `")}\``}, null))
            }

        } 

        else if(subCommand === "view") {
            
            if(badLinks.length === 0) {
                await functions.reply(interaction, functions.createEmbed("No links", "There are currently no links in the bad link list. You can add some with `/links add`.", variables.colors["blue"], user, null, null))
                return
            }

            const optionEmbed = functions.createEmbed("Please choose", "Please choose a method of viewing the bad link list", variables.colors["blue"], user, null, null)

            await functions.reply(interaction, optionEmbed, null, null, await functions.createListButtons(interaction.guild), user)
        }
    } 
    if(command === "bypass") {

        const role = functions.getOptionValue(options.get("role"))
        const bypassesCollection = await functions.getCollection("bypasses")
        var query = await functions.find(bypassesCollection, guildID)
        if(!query) {
            await functions.add(bypassesCollection, "roles", [], guildID)
        }
        var query = await functions.find(bypassesCollection, guildID)
        if(subCommand === "add") {
                await functions.update(bypassesCollection, "roles", role.id, guildID)
                await functions.reply(interaction, functions.createEmbed("Role added", "A role has been added to the bypass list", variables.colors["green"], user, [{name : "Moderator", value : member.toString()}, {name : "Role", value : role.toString()}], null))
        }
        else if(subCommand === "remove") {
            await functions.remove(bypassesCollection, "roles", role.id, guildID)
            await functions.reply(interaction, functions.createEmbed("Role removed", "A role has been removed from the bypass list.", variables.colors["green"], user, [{name : "Moderator", value : member.toString()}, {name : "Role", value : role.toString()}], null))
        }

        else if(subCommand === "view") {
            const bypassingRoles = query["roles"]
            if(bypassingRoles.length === 0) {
                await functions.reply(interaction, functions.createEmbed("No roles bypassing", "There are no roles that are bypassing the bot. You can add some with `/bypass add`.", variables.colors["blue"], user, null, null))
                return
            }

            const rolesBypassing = []
            var n = 1
            for(const x of bypassingRoles) {
                const role = functions.getRole(interaction.guild, x)
                const roleName = role ? role.name : "Deleted Role"
                const roleID = role ? role.id : "Deleted role"
                rolesBypassing.push({name : `@${roleName}`, value : `ID: ${roleID}`})
                n += 1
            }

            await functions.reply(interaction, functions.createEmbed("Roles bypassing", "These are the roles bypassing the bot", variables.colors["blue"], user, rolesBypassing, null))

        }

    }

    if(command === "ignore") {

        const channel = functions.getOptionValue(options.get("channel"))
        const ignoresCollection = await functions.getCollection("ignores")
        const query = await functions.find(ignoresCollection, guildID)
        if(!query) {
            await functions.add(ignoresCollection, "channels", [], guildID)
        }
        
        if(channel && !functions.isChannel(channel)) {
            await functions.reply(interaction, functions.createEmbed("Invalid channel type", `channel needs to be a text channel or a thread channel, not a ${channel.type} channel.`, variables.colors["red"], user, null, null))
            return
        }
        
        if(subCommand === "add") {
            await functions.update(ignoresCollection, "channels", channel.id, guildID)
            await functions.reply(interaction, functions.createEmbed("Ignored channel added", "A channel has been added to the ignored channels list", variables.colors["green"], user, [{name : "Moderator", value : member.toString()}, {name : "Channel", value : channel.toString()}], null))
        }
        else if(subCommand === "remove") {
            await functions.remove(ignoresCollection, "channels", channel.id, guildID)
            await functions.reply(interaction, functions.createEmbed("Ignored channel removed", "A channel has been removed from the ignored channels list.", variables.colors["green"], user, [{name : "Moderator", value : member.toString()}, {name : "Channel", value : channel.toString()}]))
        }
        else if(subCommand === "view") {
            const ignoredChannels = query["channels"]
            if(ignoredChannels.length === 0) {
                await functions.reply(interaction, functions.createEmbed("No ignored channels", "No channels are being ignored", variables.colors["blue"], user, null, null))
                return
            }
            const channelsIgnored = []
            for(const x of ignoredChannels) {
                const channel = functions.getChannel(x, interaction.client)
                var type = channel?.type
                type = type && functions.replaceCharacters(type, {"GUILD" : "SERVER"})
                const channelName = channel ? channel.name : "Deleted channel"
                const channelType = type ? ` (${type})` : ""
                const channelID = channel ? channel.id : "Deleted channel"
                channelsIgnored.push({name : `#${channelName}${channelType}`, value : `ID: ${channelID}`})
            }
            await functions.reply(interaction, functions.createEmbed("Ignored Channels", "These are the channels that are being ignored by the bot.", variables.colors["blue"], user, channelsIgnored, null))
        }
    }

    if(command === "advertise") {
        

        const advertisingCollection = await functions.getCollection("advertising")
        const advertising = await functions.find(advertisingCollection, guildID)
        if(advertising) {
            await functions.reply(interaction, functions.createEmbed("Server already advertised", "This server was already advertised", variables.colors["red"], user, null, null))
            return
        }
        
        if(interaction.guild.channels.cache.find(channel => channel.nsfw)) {
            await functions.reply(interaction, functions.createEmbed("Cannot advertise NSFW server", "One of the channels in this server is NSFW. Please remove it and run this command again.", variables.colors["red"], user, null, null))
            return
        }
        await channel.createInvite({maxAge : 0}).then(async invite => {functions.send(functions.getChannel("752401548226855004", interaction.client), invite.url)}).catch(error => functions.errorHandler(error, channel))
        await functions.add(advertisingCollection, "Status", "This server has already advertised", guildID)
        await functions.reply(interaction, functions.createEmbed("Server advertised", "This server was advertised in the Bad Word Blocker community.", variables.colors["green"], user, null, null))

    }

    if(command === "custom") {
    
        const customMessagesCollection = await functions.getCollection("custom_messages")
        const customMessages = await functions.find(customMessagesCollection, guildID)

        if(!customMessages) {
            await functions.add(customMessagesCollection, "info", "", guildID)
        }

        if(subCommand === "set") {
            const content = functions.getOptionValue(options.get("content"))
            var isEmbed = functions.getOptionValue(options.get("is_embed"), false)
            var color = functions.getOptionValue(options.get("color"), variables.colors["red"])

            await functions.modify(customMessagesCollection, "info", {content : content, isEmbed : isEmbed, color : color}, guildID)
            await functions.reply(interaction, functions.createEmbed("Custom message set", "A custom message will be sent when Bad Word Blocker blocks a message", variables.colors["green"], user, null, null))
        }

        else if(subCommand === "remove") {
            await functions.erase(customMessagesCollection, guildID)
            await functions.reply(interaction, functions.createEmbed("Custom message removed", "Custom message removed, switched back to default", variables.colors["green"], user, null, null))
        }

    }

    if(command === "badphraselist") {

        await functions.reply(interaction, functions.createCommandMovedEmbed(user, "badphraselist", "blacklist"), null, false, functions.createHelpGuideComponents())
        return

        const badphraselistCollection = await functions.getCollection("bad_phrases")
        var badphrases = await functions.find(badphraselistCollection, guildID)
        const phrases = functions.getOptionValue(options.get("phrases"))?.toLowerCase()
        const add = []
        const remove = []
        if(!badphrases) {
            await functions.add(badphraselistCollection, "phrases", [], guildID)
        }

        badphrases = (await functions.find(badphraselistCollection, guildID))["phrases"]

        if(subCommand === "add") {
            var wordsBeingAdded = false
            var linksBeingAdded = false
            for(const x of phrases.split("  ")) {
                if(badphrases.includes(x)) {
                    remove.push(x)
                }
                else {
                    wordsBeingAdded = x.split(" ").length === 1
                    linksBeingAdded = x.startsWith("http://") || x.startsWith("https://")
                    add.push(x)
                }
            
            }

            if(linksBeingAdded) {
                await functions.reply(interaction, functions.createEmbed("Can't add links", "If you want the bot to block bad links, use `/links add` instead.", variables.colors["red"], user, null, null))
                return
            }

            if(wordsBeingAdded) {
                await functions.reply(interaction, functions.createEmbed("Can't add words",  "If you want the bot to block bad words, use `/badwordlist add` instead", variables.colors["red"], user, null, null))
                return
            }

            if(remove.length > 0) {
                await functions.reply(interaction, functions.createEmbed("Some phrases already added", "Some of the phrases you tried to add were already added", variables.colors["red"], user, {name : "Phrases already added", value : `\`${remove.join("` `")}\``}, null, null))
                return
            }

            await functions.modify(badphraselistCollection, "phrases", badphrases.concat(add), guildID)
            await functions.reply(interaction, functions.createEmbed("Phrases added", "Phrases were added to the bad phrase list", variables.colors["green"], user, {name : "Phrases added", value : `\`${add.join("` `")}\``}, wordsBeingAdded ? "If you're just trying to add individual words, use `/badwordlist add` instead" : "Tip: To add multiple phrases at one time, seperate them with 2 spaces"))
        }

        if(subCommand === "remove") {
            for(const x of phrases.split("  ")) {

                if(badphrases.includes(x)) {
                    remove.push(x)
                }
                else {
                    add.push(x)
                }
            
            }
            if(add.length > 0) {
                await functions.reply(interaction, functions.createEmbed("Some phrases not already added", "Some of the phrases you tried to remove were not already added", variables.colors["red"], user, {name : "Phrases not already added", value : `\`${add.join("` `")}\``}, null, null))
                return
            }

            for(const x of remove) {
                badphrases.splice(badphrases.indexOf(x), 1)
            }

            await functions.modify(badphraselistCollection, "phrases", badphrases, guildID)
            await functions.reply(interaction, functions.createEmbed("Phrases remove", "Phrases were removed from the bad phrase list", variables.colors["green"], user, {name : "Phrases removed", value : `\`${remove.join("` `")}\``}, null))
        }
        
        if(subCommand === "view") {
            if(badphrases.length === 0) {
                await functions.reply(interaction, functions.createEmbed("No bad phrases", "There are no bad phrases in the bad phrase list. You can add some with the `add` subcommand on this command.", variables.colors["blue"], user, null, null))
                return
            }

            const optionEmbed = functions.createEmbed("Please choose", "Please choose a method of viewing the bad phrase list", variables.colors["blue"], user, null, null)

            await functions.reply(interaction, optionEmbed, null, null, await functions.createListButtons(interaction.guild), user)
        }

    }


    if(command === "settings") {
        const setting = functions.getOptionValue(options.get("setting"))
        const enabled = functions.getOptionValue(options.get("enabled"))
        const settingsCollection = await functions.getCollection("settings")
        const query = await functions.find(settingsCollection, guildID)
        if(!query) {
            await functions.add(settingsCollection, "settings", {}, guildID)
        }
        const guildSettings = (await functions.find(settingsCollection, guildID))["settings"]
        guildSettings[setting] = enabled
        await functions.modify(settingsCollection, "settings", guildSettings, guildID)
        await functions.reply(interaction, functions.createEmbed("Setting changed", "A setting has been changed", variables.colors["green"], user, null, null))

    }

    if(command === "filterbot") {
        const memberBot = functions.getOptionValue(options.get("bot"))
        const memberBotToString = memberBot.toString()
        const filteredBotsCollection = await functions.getCollection("filtered_bots")
        if(!await functions.find(filteredBotsCollection, guildID)) await functions.add(filteredBotsCollection, "bots", [], guildID)
        if(subCommand === "add") {
            if(!memberBot.user.bot) {
                await functions.reply(interaction, functions.createEmbed("Not a bot", `${memberBotToString} is not a bot!`, variables.colors["red"], user))
                return
            }
            await functions.update(await functions.getCollection("filtered_bots"), "bots", memberBot.id, guildID)
            await functions.reply(interaction, functions.createEmbed("Filtered bot added", `Every message from ${memberBot.toString()} will be deleted after 50 seconds, except if in an ignored channel.`, variables.colors["green"], user))
        }
        else if(subCommand === "remove") {
            await functions.remove(await functions.getCollection("filtered_bots"), "bots", memberBot.id, guildID)
            await functions.reply(interaction, functions.createEmbed("Filtered bot removed", `Every message from ${memberBot.toString()} not will be deleted after 50 seconds`, variables.colors["green"], user))
        }
    }

    if(command === "commandchannel") {
        const commandChannelsGuildData = await functions.getDatabaseValue("command_channels", "channels", [], guildID)
        const targetChannel = functions.getOptionValue(options.get("channel"))
        const targetChannelID = targetChannel.id
        if(!functions.isChannel(targetChannel)) {
            await functions.reply(interaction, functions.createEmbed("Invalid channel type", "The channel needs to be a text channel", variables.colors["red"], user))
            return
        } 
        if(subCommand === "add") {
            commandChannelsGuildData.push(targetChannel.id)
            await functions.reply(interaction, functions.createEmbed("Channel added", `${targetChannel.toString()} was added as a command channel, meaning everything except commands will get deleted`, variables.colors["green"], user))
        }
        if(subCommand === "remove") {
            commandChannelsGuildData.splice(commandChannelsGuildData.indexOf(targetChannelID), 1)
            await functions.reply(interaction, functions.createEmbed("Channel removed", `${targetChannel.toString()} was is no longer a command channel`, variables.colors["green"], user))
        }
        await functions.setDatabaseValue("command_channels", "channels", commandChannelsGuildData, guildID)
    }

}
