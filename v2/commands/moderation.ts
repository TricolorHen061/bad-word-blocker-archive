import * as functions from "../functions"
import * as variables from "../variables"
const ChartJsImage = require("chartjs-to-image")
export async function moderationFunctions(interaction) {
    const command = interaction.commandName
    const guildID = interaction.guild.id
    const options = interaction.options
    const subCommand = options.getSubcommand(false)
    const member = interaction.member
    const user = interaction.user


    if(command === "mute") {

        await functions.reply(interaction, functions.createEmbed("Command moved", "This command is no longer in use. **Use `/timeout` instead.**", variables.colors["blue"], user, null, null))
        return

        const memberMuting = functions.getOptionValue(options.get("member"))
        const reason = functions.getOptionValue(options.get("reason"), "None")
        var hours = functions.getOptionValue(options.get("hours"), "None specified")
        hours = Number(hours.value)
        if(0 >= hours) {
            await functions.reply(interaction, functions.createEmbed("Invalid number", "hours can't be less than or equal to 0", variables.colors["red"], user, null, null))
            return
        }
        if(await functions.muteMember(memberMuting, hours, interaction.channel)) {
            await functions.reply(interaction, functions.createEmbed("Member Muted", `${memberMuting.user.toString()} has been muted.`, variables.colors["yellow"], user, [{name : "Moderator", value : user.toString()}, {name : "Reason", value : reason}], null))
        }
    }
    
    if(command === "unmute") {

        await functions.reply(interaction, functions.createEmbed("Command moved", "This command is no longer in use. **Use `/timeout` instead.**", variables.colors["blue"], user, null, null))
        return

        const memberUnmuting = functions.getOptionValue(options.get("member"))
        const reason = functions.getOptionValue(options.get("reason"), "None")
        if(await functions.unmuteMember(memberUnmuting, interaction.channel)) {
            await functions.reply(interaction, functions.createEmbed("Member unmuted", `${memberUnmuting.toString()} was unmuted.`, variables.colors["green"], user, [{name : "Moderator", value : user.toString()}, {name : "Reason", value : reason}], null))
        }
    }


    if(command === "ban") {

        const memberBanning = functions.getOptionValue(options.get("member"))
        const reason = functions.getOptionValue(options.get("reason"), "None")
        let minutes = functions.getOptionValue(options.get("minutes"))
        if(!await functions.isValidModeratedMember(interaction, user, memberBanning, "ban") || !await functions.isValidModerationNumber(interaction, minutes, 1, variables.punishmentTimeLimits["ban"], true) || !functions.checkForModerationPermissions(interaction, "ban", memberBanning)) {
            return
        }        
        if(await functions.banMember(memberBanning, minutes, reason, interaction.channel)) {
            if(!minutes) {
                minutes = variables.defaultMinutesValue   
            } 
            await functions.reply(interaction, functions.createEmbed("Member banned", "A member was banned", variables.colors["red"], user, [{name : "Member", value : memberBanning.toString()}, {name : "Reason", value : reason}, {name : "Moderator", value : member.toString()}, {name : "Banned until", value : minutes === variables.defaultMinutesValue ? variables.defaultMinutesValue : String(functions.addMinutesToCurrentDate(minutes))}], null))
        }
    }
    if(command === "unban") {

        const reason = functions.getOptionValue(options.get("reason"), "None")
        const username = functions.getOptionValue(options.get("username"))
        const discriminator = functions.getOptionValue(options.get("tag"))
        if(!functions.checkForModerationPermissions(interaction, "ban")) {
            return
        }
        if(await functions.unbanMember(interaction.guild, username, discriminator, interaction.channel)) {
            await functions.reply(interaction, functions.createEmbed("Member unbanned", "A member was unbanned", variables.colors["green"], user, [{name : "Member", value : `${username}#${discriminator}`}, {name : "Moderator", value : member.toString()}, {name : "Reason", value : reason}], null))
        }
    }

    if(command === "warn") {

        const memberWarning = functions.getOptionValue(options.get("member"))
        const reason = functions.getOptionValue(options.get("reason"), "None")
        await functions.reply(interaction, functions.createEmbed("Member warned", "A member has been warned and one strike has been added to their strike count", variables.colors["orange"], user, [{name : "Member", value : memberWarning.toString()}, {name : "Reason", value : reason}, {name : "Moderator", value : member.toString()}, {name : "New Strikes", value : String(await functions.addStrikes(memberWarning, 1))}]))
        await functions.doPunishmentIfNecessary(memberWarning, interaction.channel)
    }


    if(command === "kick") {

        const memberKicking = functions.getOptionValue(options.get("member"))
        const reason = functions.getOptionValue(options.get("reason"), "None")
        if(!await functions.isValidModeratedMember(interaction, user, memberKicking, "kick") || functions.checkForModerationPermissions(interaction, "ban", memberKicking)) {
            return
        }
        await memberKicking.kick(reason).then(async member => await functions.reply(interaction, functions.createEmbed("Member kicked", "A member has been kicked", variables.colors["orange"], user, [{name : "Member", value : memberKicking.user.toString()}, {name : "Reason", value : reason}, {name : "Moderator", value : member.toString()}], null))).catch(error => functions.errorHandler({action : "kick", member : member}, interaction))
        await functions.deleteStrikes(member)
    }

    if(command === "clear") {

        const amount = functions.getOptionValue(options.get("amount"))
        if(amount <= 0 || amount > 99) {
            await functions.reply(interaction, functions.createEmbed("Invalid number", "Number must be over 0 and less than 100", variables.colors["red"], user, null, null))
            return
        }
        await interaction.channel.bulkDelete(amount + 1, true).catch(error => {functions.errorHandler(error, interaction.channel)})
        await functions.reply(interaction, functions.createEmbed("Messages cleared", "Messages in this channel have been cleared", variables.colors["green"], user, [{name : "Moderator", value : member.toString()}, {name : "Amount", value : String(amount)}], "Bad Word Blocker can only clear messages that are newer than two weeks"))
    }
    

    if(command === "analytics") {

        const serverAnalyticsCollection = await functions.getCollection("server_analytics")
        const serverAnalytics = await functions.find(serverAnalyticsCollection, guildID)
        if(!serverAnalytics) {
            await functions.reply(interaction, functions.createEmbed("No words blocked yet", "No messages in this server have gotten blocked yet. Please run this command again when words have been blocked.", variables.colors["red"], user, null, null))
            return
        }
        
        const analytics = serverAnalytics["analytics"]
        const dayByDayAnalytics = analytics["dayByDayAnalytics"]
        const dates = []
        const messagesBlocked = []
        for(const x of dayByDayAnalytics) {
            dates.push(x["date"])
            messagesBlocked.push(x["blockedMessages"])
        }
        const wordsChart = new ChartJsImage() 
        const wordsData = {
            labels : dates,
            datasets : [
                {
                    label : "Words",
                    data : messagesBlocked
                }
            ]
        }
        wordsChart.setConfig({
            type : "line",
            data : wordsData
        })
    

    
    
    
    
    const channelIDs = analytics["channelIDs"]
    const timesBlockedInChannel = [] 
    const channelNames = []
    for(const channelID in channelIDs) {
        const value = channelIDs[channelID]
        timesBlockedInChannel.push(value)
        const channel =functions.getChannel(channelID, interaction.client)
        if(!channel) {
            channelNames.push("Deleted Channel")
        }
        else {
            channelNames.push(`#${channel.name}`)
        }
    }
    
    const channelsChart = new ChartJsImage() 
        const channelsData = {
            datasets : [
                {
                    label : "Channels",
                    data : timesBlockedInChannel
                }
            ],
            labels : channelNames,
            options : {
                legend : {
                    display : true
                }
            }        
        }
        channelsChart.setConfig({
            type : "pie",
            data : channelsData
        })
    
    
    
    
    const wordsMostBlocked = analytics["mostBlockedWords"]
    const wordsBlockedTimes = []
    const mostBlocked = []
    const reversedMostBlockedWords = {}
    const blockedWords = []
    for(const n in wordsMostBlocked) {
        wordsBlockedTimes.push(wordsMostBlocked[n])
    }
    var n = 0
    for(const c of wordsBlockedTimes) {
        if(n >= 5) {
            break
        }
        mostBlocked.push(c)
        n += 1
    }
    wordsBlockedTimes.sort((a, b) => a - b)
    for(const key in wordsMostBlocked) {
        const value = wordsMostBlocked[key]
        reversedMostBlockedWords[value] = key
    }
    for(const s of mostBlocked) {
        blockedWords.push(reversedMostBlockedWords[s])
    }


    const analyticsEmbed = functions.createEmbed("Server analytics", "These are the analytics for this server", variables.colors["blue"], user, [{name : "Total Messages Deleted", value : String(analytics["messagesDeleted"])}, {name : "Top 5 blocked words", value : `||\`${blockedWords.join("`||, ||`")}\`||`}], null)
    await functions.dmMessage(interaction, user, analyticsEmbed, await wordsChart.toBinary(), "wordsChart.png")
    await functions.dmMessage(interaction, user, analyticsEmbed, await channelsChart.toBinary(), "channelsChart.png")

    }

    if(command === "timeout") {
        const timeoutMember = functions.getOptionValue(options.get("member"))
        const reason = functions.getOptionValue(options.get("reason"))

        if(subCommand === "add") {
            const minutes = functions.getOptionValue(options.get("minutes"))
            if(!await functions.checkForModerationPermissions(interaction, "timeout", timeoutMember) || !await functions.isValidModeratedMember(interaction, user, timeoutMember, "timeout") || !await functions.isValidModerationNumber(interaction, minutes, 1, variables.punishmentTimeLimits["timeout"])) {
                return
            } 
            if(await functions.timeoutMember(timeoutMember, reason, minutes)) {
                await functions.reply(interaction, await functions.createEmbed("Timeout", "A member has been put into timeout", variables.colors["yellow"], user, [{name : "Member", value : timeoutMember.toString()}, {name : "Moderator", value : user.toString()}, {name : "Reason", value : reason}, {name : "Timed out until", value : String(timeoutMember.communicationDisabledUntil)}]))
            }
        }
        if(subCommand === "undo") {
            const reason = functions.getOptionValue(options.get("reason"), "None")
            if(!await functions.isValidModeratedMember(interaction, user, timeoutMember, "timeout")) {
                return
            }
            if(!timeoutMember.isCommunicationDisabled()) {
                await functions.reply(interaction, functions.createEmbed("Member not already in timeout", `${timeoutMember.toString()} is not already in timeout.`, variables.colors["red"], user, null, null))
                return
            }
            if(await functions.timeoutMember(timeoutMember, reason, null)) {
                await functions.reply(interaction, await functions.createEmbed("Timeout removed", "A timeout has been removed from a user", variables.colors["green"], user, [{name : "Member", value : timeoutMember.toString()}, {name : "Moderator", value : user.toString()}, {name : "Reason", value : reason}]))
            }        
        }
    }


}
