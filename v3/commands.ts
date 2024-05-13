import { ApplicationCommandOptionTypes, ApplicationCommandTypes, InteractionCallbackTypes, MessageComponentButtonStyles, MessageFlags, Permissions } from "detritus-client/lib/constants";
import { addExtraFeatureCommands, db, interactionClient } from "./bot";
import { BotUtils, Database, Limits, SavedMessages, Strikes, StringUtils } from "./utils";
import { databaseNames, colors, limits, embedDefaults, serverInviteLink, documentationLink } from "../../information.json"
import { blacklistModal, bypassesEditButton, commandChannelCommand, customizeModal, limitsEditButton, logChannelRemoveButton, strikesEditButton } from "./interaction_functions";
import { ParsedArgs } from "detritus-client/lib/command";
import { InteractionContext } from "detritus-client/lib/interaction";
import { Channel, ChannelGuildText, Member, Role } from "detritus-client/lib/structures";
import { ComponentContext } from "detritus-client/lib/utils";
import { ClusterClient } from "detritus-client";


export function addCommands() {

    interactionClient.add({
        name : "ping",
        description : "Pings the bot",
        run : async (context, args) => {
            return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {
                embed : BotUtils.createEmbed("Pong!", `${(await context.client.ping()).gateway}ms ping`, context.user)
            })
        }
    })

    interactionClient.add({
        name : "help",
        description : "Get help with the bot",
        run : async (context, args) => {
            return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Help", "Need help? You can visit the help guide, or join the Bad Word Blocker server.", context.user, undefined, colors.blue), components : [BotUtils.createButton(BotUtils.createActionRow(), "something", "Help Guide", null, false, MessageComponentButtonStyles.LINK, null, documentationLink), BotUtils.createButton(BotUtils.createActionRow(), "something", "Server", null, false, MessageComponentButtonStyles.LINK, null, serverInviteLink)]})
        }
    })

/*     interactionClient.add({
        name : "new",
        description : "Links to article explaining what changed in this new version",
        run : (context, args) => {
            return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("What's changed", "Please reference this article to know what has changed https://bwbdocs.readthedocs.io/en/latest/whats_changed.html", context.user)})
        }
    }) */

    interactionClient.add({
        name : "blacklist",
        description : "View/edit server blacklist",
        onBefore : context => BotUtils.hasAllPermissions(context.member, [Permissions.MANAGE_MESSAGES]),
        onCancel : context => BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createMemberMissingPermissionsEmbed(context.member, "Manage Messages")}),
        run : async (context : InteractionContext, args: ParsedArgs) => {
            const dbInfo = databaseNames.blacklist
            const guildId = context.guildId
            let exactMatchWords: Array<string> = await db.get(dbInfo.exactmatch.collectionName, dbInfo.exactmatch.keyName, [], guildId)
            let inexactMatchWords: Array<string> = await db.get(dbInfo.inexactmatch.collectionName, dbInfo.inexactmatch.keyName, [], guildId)
            let links: Array<string> = await db.get(dbInfo.links.collectionName, dbInfo.links.keyName, [], guildId)
            let phrases: Array<string> = await db.get(dbInfo.phrases.collectionName, dbInfo.phrases.keyName, [], guildId)
            if(exactMatchWords.length > 300) exactMatchWords.splice(301)
            if(inexactMatchWords.length > 300) inexactMatchWords.splice(301)
            if(links.length > 300) links.splice(301)
            if(phrases.length > 300) phrases.splice(301)
            return BotUtils.createResponse(context, InteractionCallbackTypes.MODAL, BotUtils.createModal("Server Blacklist", [
                {customId : "exactmatch", label : "Exact-Match Words", required : false, value : exactMatchWords.join(", "), style : 2, placeholder : "Words here will be blocked ONLY if found with no word modifications (no suffixes/prefixes added)"},
                {customId : "inexactmatch", label : "Inexact-Match Words", required : false, value : inexactMatchWords.join(", "), style : 2, placeholder : "Words here will be blocked regardless of prefixes or suffixes added (recommended)"},
                {customId : "phrases", label : "Phrases", required : false, value : phrases.join(", "), style : 2, placeholder : "For blocking groups of 2+ words"},
                {customId : "links", label : "Links", required : false, value : links.join(", "), style : 2, placeholder : "For website links (make sure they start with http or https)"},
            ], async (c, a) => await blacklistModal(c, a)))
        
        }
    })

    interactionClient.add({
        name : "strikes",
        description : "View/edit a person's strikes",
        options : [{name : "member", description : "Member whose strikes you want to view/edit", type : ApplicationCommandOptionTypes.USER}],
        onBefore : context => BotUtils.hasAllPermissions(context.member, [Permissions.BAN_MEMBERS, Permissions.KICK_MEMBERS]),
        onCancel : context => BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createMemberMissingPermissionsEmbed(context.member, ["Manage Messages", "Kick Members"])}),
        run : async (context: InteractionContext, args: ParsedArgs) => {
            let targetMember: Member = args.member
            if(!targetMember) targetMember = context.member 
            const userStrikes: number = await Strikes.getStrikes(db, targetMember)
            const actionRow = BotUtils.createActionRow()
            return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Strikes", `${targetMember.mention} currently has **${userStrikes}** strike(s)`, context.user), components : [
                BotUtils.createButton(actionRow, "viewstrikes", "Edit", async (c: ComponentContext) => await strikesEditButton(c, targetMember), !BotUtils.hasAllPermissions(context.member, [Permissions.BAN_MEMBERS, Permissions.KICK_MEMBERS]), MessageComponentButtonStyles.PRIMARY)
            ]})
        }
    })

    interactionClient.add({
        name : "limits",
        description : "Manage limits",
        options : [{name : "add", description : "Add a limit", type : ApplicationCommandOptionTypes.SUB_COMMAND, options : [{name : "strikes", description : "Strike amount needed to trigger this limit", type : ApplicationCommandOptionTypes.INTEGER, required : true}, {name : "action", description : "What to do when this limit is triggered", type : ApplicationCommandOptionTypes.STRING, choices : [{name : "Timeout member", value : "timeout"}, {name : "Kick member", value : "kick"}, {name : "Ban member", value : "ban"}], required : true}, {name : "minutes", description : "Minutes to wait before undoing the action. Does NOT work with \"kick\" action.", required : false}]}, {name : "manage", description : "View/remove existing limits", type : ApplicationCommandOptionTypes.SUB_COMMAND}],
        onBefore : context => BotUtils.hasAllPermissions(context.member, [Permissions.BAN_MEMBERS, Permissions.KICK_MEMBERS]),
        onCancel : context => BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createMemberMissingPermissionsEmbed(context.member, ["Manage Messages", "Kick Members"])}),
        run : async (context: InteractionContext, args: ParsedArgs) => {
            if(!BotUtils.hasVoted(context.user)) return BotUtils.handleUnvotedUser(context)
            const amount = args.strikes
            const isAddCommand = Boolean(amount)
            if(isAddCommand) {
                const amount = args.strikes
                const action = args.action
                let minutes = Number(args.minutes) || null
                if(action === "timeout" && !minutes) minutes = limits.timeout.max
                if(!Limits.isValidData(amount, action, minutes)) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed: BotUtils.createEmbed("Invalid input", `You put invalid data. Caused by one of the following:

    - You put a number thats too small or large for the \`minutes\` parameter. **Make sure you put a number in minutes that's appropriate**.
    - You selected "Kick Member", and put a time in minutes. **Leave the \`minutes\` option blank if you selected "Kick Member"**.`, context.user, null, colors.red)})
                
                await Limits.add(context.guild, amount, action, minutes, db)
                return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Limit added", `When a member gets **${amount}** strikes, they will receive a ${action}` + (minutes ? ` for **${minutes}** minutes` : "."), context.user, null, colors.green)})
            }
            else {
                const guildLimits: Map<string, Map<string, string | number>> = await db.get(databaseNames.limits.collectionName, databaseNames.limits.keyName, [], context.guildId)
                const guildLimitsLength = Object.keys(guildLimits).length
                if(guildLimitsLength >= limits.limits.max) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Limit reached", "You can only have up to 25 limits. Please remove some before adding more.", context.user, null, colors.orange)})
                if(guildLimitsLength === limits.limits.min) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("No limits", "This server currently has no limits. You can add some using the `/limits add` command.", context.user)})
                let guildLimitsString = ""
                for(const strikes in guildLimits) {
                    const data = guildLimits[strikes]
                    guildLimitsString += `\n- **${StringUtils.capitalize(data["action"])}** after **${strikes}** strikes for **${data["minutes"] || "N/A"}** minutes`
                }
                    return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Limits", `
The following are the limits for this server.
${guildLimitsString}
`, context.user), components : [BotUtils.createButton(BotUtils.createActionRow(), "something", "Edit", async c => await limitsEditButton(c, guildLimits))]})
        }
    }})

    interactionClient.add({
        name : "bypass",
        description : "Allow a channel or role to bypass the bot's filter",
        options : [{name : "role", description : "Allow a role to bypass the bot", type : ApplicationCommandOptionTypes.SUB_COMMAND, options : [{name : "role", description : "Role that should bypass", type : ApplicationCommandOptionTypes.ROLE, required : true}]}, {name : "channel", description : "Allow a channel to bypass the bot", type : ApplicationCommandOptionTypes.SUB_COMMAND, options : [{name : "channel", description : "Channel that should bypass", type : ApplicationCommandOptionTypes.CHANNEL, required : true}]}, {name : "manage", description : "View/edit bypassing channels and roles", type : ApplicationCommandOptionTypes.SUB_COMMAND}],
        onBefore : context => BotUtils.hasAllPermissions(context.member, [Permissions.MANAGE_CHANNELS, Permissions.MANAGE_ROLES]),
        onCancel : context => BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createMemberMissingPermissionsEmbed(context.member, ["Manage Channels", "Manage Roles"])}),
        run : async (context: InteractionContext, args: ParsedArgs) => {
            const bypassesCollectionNames = databaseNames.bypasses
            const guildBypasses = await db.get(bypassesCollectionNames.collectionName, bypassesCollectionNames.keyName, {roles : [], channels : []}, context.guildId)
            let entityName
            let arg
            if(args.role) {
                entityName = "role"
                arg = args.role
                guildBypasses["roles"].push(arg.id)
                await db.set(bypassesCollectionNames.collectionName, bypassesCollectionNames.keyName, guildBypasses, context.guildId)
            }
            else if(args.channel) {
                entityName = "channel"
                arg = args.channel
                guildBypasses["channels"].push(arg.id)
                await db.set(bypassesCollectionNames.collectionName, bypassesCollectionNames.keyName, guildBypasses, context.guildId)
            }
            else { // Is the manage command
                let bypassingRoles: Array<Role | number> = guildBypasses.roles.map(roleId => context.guild.roles.get(roleId) || roleId)
                let bypassingChannels: Array<ChannelGuildText | number> = guildBypasses.channels.map(channelId => context.guild.channels.get(channelId) || channelId)
                bypassingRoles = bypassingRoles.filter(item => !Number(item))
                bypassingChannels = bypassingChannels.filter(item => !Number(item))
                await db.set(bypassesCollectionNames.collectionName, bypassesCollectionNames.keyName, {roles : bypassingRoles.map(role => (role as Role).id), channels : bypassingChannels.map(channel => (channel as ChannelGuildText).id)}, context.guildId)
                const hasPermissionsForButton = !BotUtils.hasAllPermissions(context.member, [Permissions.MANAGE_MESSAGES])
                return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Bypassing channels and roles", `
**Roles:**
- ${bypassingRoles.length > 0 ? bypassingRoles.map(role => (role as Role).mention).join("\n- ") : "None"}
**Channels:**
- ${bypassingChannels.length > 0 ? bypassingChannels.map(channel => (channel as ChannelGuildText).mention).join("\n- ") : "None"}`, context.user), components : [BotUtils.createButton(BotUtils.createActionRow(), "something", "Edit Roles", async c => await bypassesEditButton(c, guildBypasses, "role"), hasPermissionsForButton), BotUtils.createButton(BotUtils.createActionRow(), "something else", "Edit Channels", async c => await bypassesEditButton(c, guildBypasses, "channel"), hasPermissionsForButton)]})
            }
            entityName = StringUtils.capitalize(entityName)
            return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed(`${entityName} added`, `${entityName} ${arg.mention} will now bypass the bot.`, context.user, null, colors.green)})
        }
    })

    interactionClient.add({
        name : "log",
        description : "Sets or removes a log channel",
        options : [{name : "set", description : "Sets a channel where the bot will send logs", type : ApplicationCommandOptionTypes.SUB_COMMAND, options : [{name : "channel", description : "Channel that should receive logs", type : ApplicationCommandOptionTypes.CHANNEL, required : true}]}, {name : "manage", description : "View/remove the existing log channel", type : ApplicationCommandOptionTypes.SUB_COMMAND}],
        onBefore : context => BotUtils.hasAllPermissions(context.member, [Permissions.MANAGE_CHANNELS]),
        onCancel : context => BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createMemberMissingPermissionsEmbed(context.member, "Manage Channels")}),
        run : async (context: InteractionContext, args: ParsedArgs) => {
            if(!BotUtils.hasVoted(context.user)) return BotUtils.handleUnvotedUser(context)
            if(args.channel) { // log set command
                await db.set(databaseNames.log.collectionName, databaseNames.log.keyName, args.channel.id, context.guildId)
                return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Log channel set", `${args.channel.mention} will receive logs when a message gets deleted`, context.user, null, colors.green)})
            }
            else { // log manage command
                const existingLogChannelId = await db.get(databaseNames.log.collectionName, databaseNames.log.keyName, null, context.guildId)
                const existingLogChannel = context.guild.channels.get(existingLogChannelId)
                if(!existingLogChannelId || !existingLogChannel) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("No log channel", "There is no log channel set, or the bot doesn't have permission to view it. You can set a new one with `/log set`.", context.user)})
                return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Log channel", `The current log channel is ${existingLogChannel.mention}.`, context.user), components : [BotUtils.createButton(BotUtils.createActionRow(), "something", "Remove", async c => await logChannelRemoveButton(c, existingLogChannel as ChannelGuildText), !BotUtils.hasAllPermissions(context.member, [Permissions.MANAGE_CHANNELS]))]})
            }
        }
    })

    interactionClient.add({
        name : "get",
        description : "Retrieves your last blocked message",
        options : [{name : "member", description : "Member whose last deleted message you want to get", type : ApplicationCommandOptionTypes.USER}],
        run : async (context, args) => {
            const memberRequested: Member = args.member || context.member
            if((memberRequested.id !== context.member.id) && !BotUtils.hasAllPermissions(context.member, [Permissions.MANAGE_MESSAGES])) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Missing Permissions", `You need the Manage Messages permission to get someone else's message.`, context.user, null, colors.red)})
            const lastBlockedMessageInfo = await SavedMessages.get(memberRequested, db)
            if(!lastBlockedMessageInfo) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("No blocked messages", `${memberRequested.mention} hasn't not gotten a message blocked in this server yet.`, context.user)})
            return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed: BotUtils.createEmbed(`${memberRequested.username}'s last blocked message`,`The following is info about ${memberRequested.mention}'s last blocked message`, context.user,  [
                {name : "Date blocked", value : lastBlockedMessageInfo.time},
                {name : "Reason", value : `Contained blacklisted item "${lastBlockedMessageInfo.blacklistedItem}"`},
                {name : "Content", value : lastBlockedMessageInfo.content}
            ])})
        }
    })

    interactionClient.add({
        name : "servercount",
        description : "View how many servers Bad Word Blocker is in",
        run : (context, args) => {
            const guildCount = (interactionClient.client as ClusterClient).shards.reduce((x, shard) => x + shard.guilds.length, 0)
            BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Server count", `Bad Word Blocker is in ${guildCount} servers.`, context.user)})
        }
    })

    interactionClient.add({
        name : "clear",
        description : "Clear a certain number of messages in a channel",
        onBefore : context => BotUtils.hasAllPermissions(context.member, [Permissions.MANAGE_MESSAGES]),
        onCancel : context => BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createMemberMissingPermissionsEmbed(context.member, "Manage Messages")}),
        options : [{name : "amount", description : "Amount of messages to clear", type : ApplicationCommandOptionTypes.INTEGER, required : true}],
        run : async (context, args) => {
            console.log("1")
            if(!BotUtils.hasVoted(context.user)) {return console.log("2"); BotUtils.handleUnvotedUser(context)}
            console.log("3")
            const amount = Number(args.amount)
            console.log("4")
            if(amount > limits.clear.max || limits.clear.min > amount) {console.log("5"); return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Invalid number", `Number has to be bewteen ${limits.clear.min} and ${limits.clear.max}.`, context.user, null, colors.red)})}
            console.log("6")
            const messagesToDelete = await context.channel.fetchMessages({limit: amount + 1})
            console.log("7")
            try{await context.channel.bulkDelete(messagesToDelete.map((v, k) => k))}
            catch(e) {console.log(e)}
            console.log("8")
            return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Messages cleared", `${amount} messages were cleared`, context.user, null, colors.green)})
        }
    })

    interactionClient.add({
        name : "customize",
        description : "Customize behavior when a message gets blocked",
        onBefore : context => BotUtils.hasAllPermissions(context.member, [Permissions.MANAGE_MESSAGES]),
        onCancel : context => BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createMemberMissingPermissionsEmbed(context.member, "Manage Messages")}),
        run : async (context, args) => {
            if(!BotUtils.hasVoted(context.user)) return BotUtils.handleUnvotedUser(context)
            const guildCustomSettings = await db.get(databaseNames.custom.collectionName, databaseNames.custom.keyName, {content : embedDefaults.content, color : embedDefaults.color, cleanup : 0}, context.guildId)
            return BotUtils.createResponse(context, InteractionCallbackTypes.MODAL, BotUtils.createModal("Customization", [
                {label : "Content", value : guildCustomSettings.content, placeholder : `What's sent when the bot blocks a message. Placeholders can be found at documentation (run /help)`, style : 2, customId : "content", required : false},
{label : "Color (int value)", value : guildCustomSettings.color, placeholder : "The integer value of the color you want the embed to be", customId : "color", required : false},
{label : "Delete self after (in seconds)", value : guildCustomSettings.cleanup, placeholder : "Tells bot to delete it's messages after an amount of seconds. Set to 0 or below to disable", customId : "cleanup", required : false}
            ], async (c, a) => await customizeModal(c, a), "something"))
        }
    })

    interactionClient.add({
        name : "extras",
        description : "Enables helpful other features that don't exactly match the bot's purpose",
        onBefore : context => BotUtils.hasAllPermissions(context.member, [Permissions.MANAGE_MESSAGES]),
        onCancel : context => BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createMemberMissingPermissionsEmbed(context.member, "Manage Messages")}),
        run : async (context, args) => {
            const alreadyRequestedGuilds = await db.get(databaseNames.extras.collectionName, databaseNames.extras.keyName, {}, "1")
            console.log("Wow")
            console.log(alreadyRequestedGuilds)
            if(Object.keys(alreadyRequestedGuilds).includes(context.guildId)) return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Extra features already enabled", "Extra features are already enabled for this server", context.user, null, colors.red)})
           
            alreadyRequestedGuilds[context.guildId] = {
                command_channels : [],
                cleanup_bots : []
            }
            await addExtraFeatureCommands(context.guildId)
            await db.set(databaseNames.extras.collectionName, databaseNames.extras.keyName, alreadyRequestedGuilds, "1")

            return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Extra functionality enabled", "This server now has access to additional features. They are now avaliable via the slash command list.", context.user, null, colors.green)})
        }
        
    })

    interactionClient.add({
        name : "shutdown",
        description : "Shuts down the bot",
        run : async (context, args) => {
            if(context.user.id === "581965693130506263") {
                context.respond(InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, "Ok")
                context.client.kill()
            }
            else {
                return context.respond(InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, "No")
            }
        }
    })

}

