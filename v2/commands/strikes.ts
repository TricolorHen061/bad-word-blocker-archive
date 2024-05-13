import * as functions from "../functions"
import * as variables from "../variables"

export async function strikeCommands(interaction) {
    const command = interaction.commandName
    const guildID = interaction.guild.id
    const options = interaction.options
    const subCommand = options.getSubcommand(false)
    const member = interaction.member
    const user = interaction.user


    if(command === "limits") {

        const punishmentsCollection = await functions.getCollection("punishments")
        const query = await functions.find(punishmentsCollection, guildID)
        if(subCommand === "add") {
            const amount = functions.getOptionValue(options.get("amount"))
            const action = functions.getOptionValue(options.get("action"))
            let minutes = functions.getOptionValue(options.get("minutes"), variables.defaultMinutesValue)
            if(action === "kick" && minutes !== variables.defaultMinutesValue) {
                await functions.reply(interaction, functions.createEmbed("Cannot kick with time limit", `You cannot set a time limit "${minutes}" minutes with the kick action. Please either choose another action, or remove the time limit.`, variables.colors["red"], user, null, null))
                return
            }
            const limitsLength = (await functions.find(await functions.getCollection("punishments"), guildID))?.punishments.length
            if(limitsLength >= variables.commandItemLimits["limits"]) {
                await functions.reply(interaction, functions.createEmbed("Too many limits", `You may only have up to 25 limits. You have ${limitsLength}. Please remove some before trying to add more.`, variables.colors["red"], user, null, null))
                return
            }
            if(!await functions.isValidModerationNumber(interaction, minutes, 1, variables.punishmentTimeLimits[action])) {
                return
            }
            await functions.addPunishment(interaction.guild, amount, action, minutes)
            let fields = [{name : "Strikes", value : String(amount)}, {name : "Action", value : action}]
            if(action !== "kick") {
                fields = functions.addToArray(fields, {name : "Minutes", value : (minutes === variables.defaultMinutesValue && action === "timeout") ? `${variables.punishmentTimeLimits["timeout"]} (default)` : String(minutes)})
            }
            await functions.reply(interaction, functions.createEmbed("Limit added!", "A new limit was added.", variables.colors["green"], user, fields))
    }
    else if(subCommand === "remove") {
            const amount = functions.getOptionValue(options.get("limit"))
            await functions.removePunishment(interaction.guild, amount)
            await functions.reply(interaction, functions.createEmbed("Limit removed", "A limit has been removed", variables.colors["green"], user, {name : "Amount", value : String(amount)}, null))
        
    }

    else if(subCommand === "view") {

        if(!query) {
            await functions.reply(interaction, functions.createEmbed("No limits", "There are currently no limits set in this server. Add some with `/limit add`.", variables.colors["blue"], user, null, null))
            return
        }

        const punishments = []
        for(const x in query["punishments"]) {
            const value = query["punishments"][x]
            var limitAction = value["action"] 
            limitAction = limitAction === "mute" ? "timeout" : limitAction
            var limitHours = value["minutes"] || functions.convertHoursToMinutes(Number(value["hours"]))
            if(limitAction === "kick") {
                limitHours = "N/A"
            }
            if(!limitHours) {
                limitHours = limitHours === "timeout" ? `${variables.punishmentTimeLimits["timeout"]} (default)` : variables.defaultMinutesValue
            }

            punishments.push({name : `${x} strikes`, value : `
action : \`${limitAction}\` 
minutes : \`${limitHours}\``})
        } 
        
        if(punishments.length === 0) {
            await functions.reply(interaction, functions.createEmbed("No limits", "There are no limits set in this server. To add one, use the `add` option on the command.", variables.colors["blue"], user, null, null))
            return
        } 

        await functions.reply(interaction, functions.createEmbed("Limits", "Here are the limits for this server", variables.colors["blue"], user, punishments, null))

    }
    }

    if(command === "change") {
        await functions.reply(interaction, functions.createCommandMovedEmbed(user, "change", "strikes change"), null, false, functions.createHelpGuideComponents())
    }

    if(command === "strikes") {
        if(subCommand === "view") {
            const memberView = functions.getOptionValue(options.get("member"), member)
            const amountOfStrikes = await functions.getStrikes(memberView)
            await functions.reply(interaction, functions.createEmbed("Strikes", `${memberView.toString()} has \`${amountOfStrikes || 0}\` strikes`, variables.colors["blue"], user, null, null))

        }
        else if(subCommand === "change") {
            const memberChange = functions.getOptionValue(options.get("member"))
            const amount = functions.getOptionValue(options.get("amount"))
            await functions.deleteStrikes(memberChange)
            await functions.addStrikes(memberChange, amount)
            await functions.reply(interaction, functions.createEmbed("Strikes changed", "A member's amount of strikes has been changed", variables.colors["green"], user, [{name : "Member", value : memberChange.toString()}, {name : "Amount", value : String(amount)}], null))    
            await functions.doPunishmentIfNecessary(memberChange, interaction.channel)
        }
    }

}