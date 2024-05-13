open Discord
open Discord.WebSocket
open Events
open System
open Utils.FileUtils
open System.Threading.Tasks
open Handlers
open Webserver

printfn "Ok"

let main () = task {
    try
        let socketConfig = new DiscordSocketConfig (
            GatewayIntents = (GatewayIntents.AllUnprivileged ||| GatewayIntents.GuildMembers ||| GatewayIntents.GuildMessages),
            LogLevel = LogSeverity.Verbose
        )
        let client = new DiscordShardedClient(socketConfig)
        let environment_variables = readJsonFromFile "./environment_variables.json"
        let token = environment_variables |> getValue "token"
        do! client.LoginAsync (TokenType.Bot, token)
        do! client.StartAsync ()
        let onInteractionCreate interaction = interactionCreated client interaction
        let onJoinedGuild (guild:SocketGuild) = joinedGuild guild client
        let onLeftGuild (guild:SocketGuild) = leftGuild guild client
        let onReady (socketClient:DiscordSocketClient) = ready socketClient client
        client.add_ShardReady onReady
        client.add_MessageReceived (Func<_, _>(messageReceived))
        client.add_InteractionCreated (Func<_, _>(onInteractionCreate))
        client.add_ModalSubmitted (Func<_, _>(modalSubmitted))
        client.add_SelectMenuExecuted (Func<_, _>(selectMenuExecuted))
        client.add_MessageUpdated (Func<_,_,_,_> (fun a b c -> Task.Run<unit> (fun () -> task { do! messageUpdatedHandler a b c})))
        client.add_JoinedGuild (Func<_,_>(onJoinedGuild))
        client.add_LeftGuild (Func<_, _>(onLeftGuild))
        let log (logM:LogMessage): Task = task { printfn $"{logM}" }
        // client.add_Log (Func<_, _>(log))
        runWebserver () |> ignore
        Task.Run<unit> (fun () -> task {
            while true do
                try
                    do! Async.Sleep 1000
                    do! handleTimedPunishments client
                with
                | _ as e -> printfn $"{e}"
            
            }) |> ignore
        do! Async.Sleep -1 // Stop forever so the bot will stay online
    
    with
    _ as e -> printfn $"{e}"
    }
main ()
|> Async.AwaitTask
|> Async.RunSynchronously
