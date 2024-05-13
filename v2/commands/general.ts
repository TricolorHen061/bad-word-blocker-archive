import * as functions from "../functions"
import * as variables from "../variables"
export async function generalCommands(interaction) {
    const command = interaction.commandName
    const guildID = interaction.guild.id
    const options = interaction.options
    const subCommand = options.getSubcommand(false)
    const member = interaction.member
    const user = interaction.user

    if(command === "ping") {
        await functions.reply(interaction, functions.createEmbed("Pong!", `API latency is ${interaction.client.ws.ping}`, variables.colors["blue"], user, null, null), null, false, functions.createMessageActionRow([functions.createMessageButton("Test", "ping", variables.messageButtonStyles["primary"])]), user)
    }

    if(command === "view") {
        await functions.reply(interaction, functions.createCommandMovedEmbed(user, "view", "strikes view"), null, false, functions.createHelpGuideComponents())
    }
    if(command === "vote") {
        await functions.reply(interaction, functions.createEmbed("Vote link", "Thank you for wanting to vote for Bad Word Blocker. Press the button to vote", variables.colors["blue"], user, null, null), null, null, functions.createMessageActionRow([functions.createMessageButton("Vote", null, variables.messageButtonStyles["link"], false, false, variables.voteLink)]))
    }

    if(command === "invite") {
        await functions.reply(interaction, functions.createEmbed("Bot invite", "Thank you for wanting to invite Bad Word Blocker. Press the button to invite the bot to a new server.", variables.colors["blue"], user, null, null), null, null, functions.createMessageActionRow([functions.createMessageButton("Invite", null, variables.messageButtonStyles["link"], false, false, variables.inviteLink)]))
    }


    if(command === "get") {
        const memberToGetMessageFrom = functions.getOptionValue(options.get("member"), member)
        const isNotSamePerson = memberToGetMessageFrom.id !== user.id
        if(!(await interaction.guild.members.resolve(memberToGetMessageFrom.id))) {
            return functions.reply(interaction, functions.createEmbed("User not in this server", "The user has to be in this server to get their message", variables.colors["red"], user, null, null))
        }
        if(isNotSamePerson && !functions.hasPermissions(member, "MANAGE_MESSAGES")) {
            await functions.reply(interaction, functions.createEmbed("Missing Permissions", "You need the `Manage Messages` permission to get other people's messages. You can only view your own.", variables.colors["red"], user, null, null))
            return
        }
        const info = await functions.getSavedMessage(memberToGetMessageFrom)
        if(info) {
            const messageContent = info["content"]
            const time = info["timeOfMessageDelete"]
            const reason = info["reasonOfDelete"]
            const section = info["section"]
            const embed = functions.createEmbed("Last blocked message", `The following is info about ${memberToGetMessageFrom.id === member.id ? "your" : `${memberToGetMessageFrom.toString()}'s`} last blocked message`, variables.colors["blue"], user, [{name : "Time message was deleted", value : time}, {name : "Reason of deletion", value : reason}, {name : "Found in section", value : section || "Unknown"}, {name : "Content", value : messageContent}])
            await functions.send(user, embed).then(async (member) => await functions.reply(interaction, functions.createEmbed("Message sent", "Please check your DMs", variables.colors["green"], user, null, null))).catch(async error => await functions.reply(interaction, embed, null, null, null, null, true))
        }
        else {
            await functions.reply(interaction, functions.createEmbed("No messages blocked yet", `None of ${!isNotSamePerson ? "your" : "their"} messages have gotten blocked yet.`, variables.colors["red"], user, null, null))
        }
    }

    if(command === "servercount") {
        await functions.reply(interaction, functions.createEmbed("Server count", `Bad Word Blocker is currently in ${interaction.client.guilds.cache.size} servers.`, variables.colors["blue"], user, null, null))
    }

    if(command === "suggestion") {
        const suggestion = functions.getOptionValue(options.get("suggestion"))
        const suggestionsCollection = await functions.getCollection("suggestions")
        var suggestions = await functions.find(suggestionsCollection, user.id)
            if(!suggestions) {
                await functions.add(suggestionsCollection, "suggestions", [], user.id)
            }
            suggestions = await functions.find(suggestionsCollection, user.id)
            const userSuggestions = suggestions["suggestions"]
            userSuggestions.push(suggestions)
            await functions.modify(suggestionsCollection, "suggestions", suggestion, user.id)
            await functions.reply(interaction, functions.createEmbed("Suggestion submitted", "Your suggestion was submitted", variables.colors["green"], user, null, null))
    }

    if(command === "permissions") {
        await functions.reply(interaction, functions.createEmbed("Common permission issues", "If the bot is not able to do something because of a permission error, please make sure you did all of these things.", variables.colors["blue"], user, [{name : "If the bot fails to delete a message", value : "Make sure it has the `Manage Messages` permission. Or just give it administrator."}, {name : "If you're trying to mute a member", value : "Make sure the bot's role is above the target's highest role and the mute role, and that the bot has the `Manage Roles` permission (or give it administator)."}, {name : "If it fails to ban/kick", value : "It needs the `Ban Members` permission to ban people and the `Kick Members` permission to kick people. Or just give it administrator."}]))
    }

    if(command === "joke") {

        await functions.reply(interaction, functions.createEmbed("Command not released yet", "This command is not released to the public yet", variables.colors["blue"], user, null, null))

        const authorID = user.id
        const suggestedJokesCollection = await functions.getCollection("suggested_jokes")
        const jokesCollection = await functions.getCollection("jokes")
        var query = await functions.find(suggestedJokesCollection, authorID)
        if(!query) {
            await functions.add(suggestedJokesCollection, "jokes", [], authorID)
        }
        var query = await functions.find(suggestedJokesCollection, authorID)
        const submittedJokes = query["jokes"]
        const jokesSubmitted = await suggestedJokesCollection.find({})
        if(subCommand === "add") {
            const jokeToSuggest = functions.getOptionValue(options.get("joke"))
            if(submittedJokes.length >= 5) {
                await functions.reply(interaction, functions.createEmbed("Limit reached", "You can only have up to 5 pending jokes. Please wait until one is approved or denied, or delete one using the `remove` option.", variables.colors["red"], user, null, null))
                return
            }
            if(jokeToSuggest.length > 100) {
                await functions.reply(interaction, functions.createEmbed("Too long", `Your joke was too long. The maximum amount of characters a joke is allowed to have is 100. Your joke had ${jokeToSuggest.length}`, variables.colors["red"], user, null, null))
                return
            }
            await functions.update(suggestedJokesCollection, "jokes", jokeToSuggest, authorID)
            await functions.reply(interaction, functions.createEmbed("Joke submitted", "Your joke has been submitted and will be reviewed by the Bad Word Blocker team. You will receive a DM when your joke is approved or denied", variables.colors["green"], user, null, null))
        }
        else if(subCommand === "remove") {
            const indexes = functions.getOptionValue(options.get("jokes")).split(" ")
            if(submittedJokes.length === 0) {
                await functions.reply(interaction, functions.createEmbed("No jokes submitted yet", "You have not submitted any jokes yet. You can submit some by using the `add` option.", variables.colors["red"], user, null, null))
                return
            }
            const deletedJokes = []
            var c = 1
            for(var t of indexes) {
                if(t <= 0) {
                    await functions.reply(interaction, functions.createEmbed("Invalid value", `index needs to be greater than 0, not ${t}`, variables.colors["red"], user, null, null))
                }
                if(Number.isNaN(t)) {
                    await functions.reply(interaction, functions.createEmbed("Invalid option", `index must be the number of the joke you want to remove, not ${t}`, variables.colors["red"], user, null, null))
                }
                const deletedJoke = submittedJokes.splice(Number(t) - 1, 1)
                if(!deletedJoke) {
                    await functions.reply(interaction, functions.createEmbed("Joke not found", "The joke you tried to remove wasn't already submitted by you.", variables.colors["red"], user, {name : "Number", value : t}))
                }
                deletedJokes.push({name : `Deleted joke #${c}`, value : String(deletedJoke)})
                c += 1
            }
            await functions.modify(suggestedJokesCollection, "jokes", submittedJokes, authorID)
            await functions.reply(interaction, functions.createEmbed("Jokes deleted", "Some of the jokes you submitted were deleted", variables.colors["green"], user, deletedJokes, null))
        }
        else if(subCommand === "view") {
            const jokeOptions = []
            var n = 1
            if(submittedJokes.length === 0) {
                await functions.reply(interaction, functions.createEmbed("No jokes submitted yet", "You have not submitted any jokes yet. You can submit some by using the `add` option.", variables.colors["red"], user, null, null))
                return
            }
            for(const x of submittedJokes) {
                jokeOptions.push({name : `${n}. "${x}"`, value : `Run \`/jokes remove ${n}\` to remove`})
                n += 1
            }
            await functions.reply(interaction, functions.createEmbed("Pending jokes", "These are the jokes that you've submitted and have not been reviewed yet", variables.colors["blue"], user, jokeOptions, null))
        }
        else if(subCommand === "pending") {

            const availablePages = functions.getAvailablePagesNumber(jokesSubmitted.length, 5)

            var pageNumber = functions.getOptionValue(options.get("page number"))
            

            if(Number.isNaN(pageNumber)) {
                await functions.reply(interaction, functions.createEmbed("Invalid value", `page must be a number, not ${pageNumber}`, variables.colors["red"], user, null, null))
            }
            pageNumber = Number(pageNumber)
            if(!pageNumber || pageNumber < 0) {
                pageNumber = 1
            }
            if(pageNumber > availablePages) {
                pageNumber = availablePages
            }

            if(!(member.roles.cache.find(role => role.id === "739323165716774912") || user.id === "581965693130506263")) {
                await functions.reply(interaction, functions.createEmbed("Not a moderator", "You are not a moderator in the Bad word Blocker community", variables.colors["red"], user, null, null))
                return
            }
            const jokes = []
            var userCount = 1
            var joke = 1
            await jokesSubmitted.forEach(jokeInformation => {
                console.log(jokeInformation)
                const ID = jokeInformation["_id"]
                for(const m of jokeInformation["jokes"]) {
                    jokes.push({name : `"${m}"`, value : `User ID: ${ID}
User number: ${userCount}
Joke number: ${joke} `})
                    joke += 1
                }
            userCount += 1
            })
            await functions.reply(interaction, functions.createEmbed("Pending jokes", "These are a list of jokes that need to be approved or denied.", variables.colors["blue"], user, functions.getPage(jokes, pageNumber, 5), null))
        }
        else if(subCommand === "accept") {
            
            if(!(member.roles.cache.find(role => role.id === "739323165716774912") || user.id === "581965693130506263")) {
                await functions.reply(interaction, functions.createEmbed("Not a moderator", "You are not a moderator in the Bad word Blocker community", variables.colors["red"], user, null, null))
                return
            }
            const userIndex = functions.getOptionValue(options.get("user number"))
            const jokeIndex = functions.getOptionValue(options.get("joke number"))
            
            if(!userIndex || !jokeIndex) {
                await functions.reply(interaction, functions.createEmbed("Invalid format", "Please provide the user index and the joke index", variables.colors["red"], user, null, null))
                return
            }
            const jokesArray = await jokesSubmitted.toArray()
            console.log(jokesArray)
            const userItem = jokesArray[userIndex - 1]
            const userID = userItem["_id"]
            const deletedJokes = user["jokes"].splice(jokeIndex - 1, 1)
            await functions.update(jokesCollection, "the_jokes", deletedJokes[0], "all_jokes")
        }
    }

    if(command === "leave") {

        const reason = functions.getOptionValue(options.get("reason"), "None")
        await functions.reply(interaction, functions.createEmbed("Leave", "Are you sure you want to kick the bot? If you are having problems, you can always join our communnity server and ask for help.", variables.colors["red"], user, {name : "Reason", value : reason}, null), null, null, functions.createMessageActionRow([functions.createMessageButton("Yes", "leaveserver", variables.messageButtonStyles["danger"], false, false, false), functions.createMessageButton("No", "cancel", variables.messageButtonStyles["primary"], false, false, false), functions.createMessageButton("Join support server", null, variables.messageButtonStyles["link"], false, false, variables.serverInviteLink)]), user)
    }

    if(command === "help") {
        await functions.reply(interaction, functions.createEmbed("Help", `Bad Word Blocker filters messages containing blacklisted items. You can interact with this bot with the dashboard, or slash commands. There's also a server for Bad Word Blocker you can join, if you wish.`, variables.colors["blue"], user, null, null), null, null, functions.createHelpGuideComponents())
    }

}