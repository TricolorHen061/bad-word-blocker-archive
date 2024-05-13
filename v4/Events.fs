module Events 

open System.Threading.Tasks
open Discord.WebSocket
open Discord.Interactions
open System.Reflection
open Handlers
open Utils.FileUtils
open Utils.EmbedUtils
open Utils.InteractionUtils
open Utils.GeneralUtils
open Utils.VoteUtils
open Utils
open Discord
open DiscordBotsList.Api
open System.Linq

let mutable botInteractionService = null


let ready (client: DiscordSocketClient) (shardClient:DiscordShardedClient): Task =
    task {
        Task.Run<unit> (fun () -> task {
            let! recommendShardCount = client.GetRecommendedShardCountAsync()            
            try
                if recommendShardCount = shardClient.Shards.Count then
                    printfn "Ready!"
                    botInteractionService <- new InteractionService (client)
                    do! botInteractionService.AddModulesAsync ((Assembly.GetEntryAssembly ()), null) :> Task
                    try
                        do! botInteractionService.RegisterCommandsGloballyAsync (true) :> Task
                    with
                    | _ -> printfn "Failed to add slash commands"
                    let environment_variables = readJsonFromFile "./environment_variables.json"
                    topggClient <- AuthDiscordBotListApi(client.CurrentUser.Id, environment_variables |> getValue "topgg_token" |> string)
                    let isProduction = environment_variables |> getValue "isProduction"
                    if isProduction then
                        let! voters = topggClient.GetVotersAsync ()
                        voters.ToArray()
                        |> Array.iter (fun userData -> votes <- string userData.Id :: votes)
                        let shardCount = shardClient.Shards.Count
                        let serverCount =
                            (shardClient.Shards.Select(fun x -> x.Guilds.Count)).ToArray()
                            |> Array.sum
                        do! topggClient.UpdateStats(serverCount, shardCount)
                        printfn "Updated stats"
            with 
            | _ as e -> printfn $"{e}"
        }) |> ignore
    }     

let messageReceived (message: SocketMessage): Task =
    task {
        let _ = Task.Run<unit>(fun () -> task {
           do! messageHandler message
        } )
        ()
    }
   
let interactionCreated (client: DiscordShardedClient) (interaction: SocketInteraction): Task =
    task {
        try
            let runCommand (slashCommand:SocketSlashCommand) (guildName:string) =
                task {
                    let context = new ShardedInteractionContext (client, interaction)
                    try
                        do! botInteractionService.ExecuteCommandAsync (context, null) :> Task
                        let bwbLogsChannel = client.GetChannel (uint64 "887359608669233182") :?> SocketTextChannel
                        do! bwbLogsChannel.SendMessageAsync $"User {interaction.User.Username}#{interaction.User.Discriminator} ran command {slashCommand.CommandName} in guild \"{guildName}\"" :> Task 
                    with
                    | _ as e -> printfn $"{e}" 
                    return ()
                }
            if interaction.Type = InteractionType.ApplicationCommand then
                printfn "Ok got here"
                let slashCommand = interaction :?> SocketSlashCommand
                let guild = (interaction.Channel :?> IGuildChannel).Guild
                let! hasVoted = getVoteStatus interaction.User.Id
                if (isVoteCommand slashCommand.CommandName) && not hasVoted then
                    let voteLink = getInformationKey "voteLink"
                    let embed =
                        createEmbed "Not yet voted" $"You need to vote for the bot at least one time this month to use that command. Please vote [here]({voteLink}). It's free." interaction.User
                        |> withColor Color.Orange
                    do! interaction |> interactionRespondWithEmbed embed None
                else if not interaction.IsDMInteraction then
                    let permissionsNeeded = getCommandPermissions slashCommand.CommandName
                    let guildUser = (interaction.User :> IUser) :?> IGuildUser
                    match permissionsNeeded with
                    | Some permissions when hasPermissions (permissions.ToObject<string array>()) guildUser -> do! runCommand slashCommand guild.Name
                    | None -> do! runCommand slashCommand guild.Name
                    | _ ->
                        try
                            let sentencePermissons = String.concat ", " (permissionsNeeded.Value.ToObject<string array>())
                            let embed =
                                createEmbed "Permissions missing" $"You're missing the {sentencePermissons} permission to run this command" interaction.User
                                |> withColor Color.Red
                            do! interaction |> interactionRespondWithEmbed embed None
                        with
                        | _ as e -> printfn $"{e}"
        with
        | _ as e -> printfn $"{e}"
    }
   
let modalSubmitted (modal:SocketModal): Task = 
    task {
        match modal.Data.CustomId with 
        | "blacklist_modal" -> do! blacklistModalHandler modal
        | "customizationModal" -> do! customizationModalHandler modal
        | _ -> ()
    }

let selectMenuExecuted (socketMessageComponent:SocketMessageComponent): Task = 
    task {
        match socketMessageComponent.Data.CustomId with
        | "bypassRemove" -> do! bypassRemoveHandler socketMessageComponent
        | "limitsSelectMenu" -> do! limitsSelectMenuHandler socketMessageComponent
        | _ -> ()

    }
    