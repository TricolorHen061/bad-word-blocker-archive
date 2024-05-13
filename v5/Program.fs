open Utils
open Discord
open GlobalVariables
open Handlers.Events.Ready
open Handlers.Events.InteractionCreate
open Handlers.Events.ModalSubmitted
open Handlers.Events.MessageCreate
open Handlers.Events.SelectMenuExecuted
open Handlers.Events.ButtonExecuted
open Handlers.Events.Log
open Handlers.Events.JoinedGuild
open Handlers.Events.LeftGuild
open Handlers.Events.MessageUpdated

task {
    client.add_ShardReady onReady
    client.add_InteractionCreated interactionCreate
    client.add_ModalSubmitted modalSubmitted
    client.add_MessageReceived messageCreate
    client.add_SelectMenuExecuted selectMenuExecuted
    client.add_ButtonExecuted buttonExecuted
    client.add_Log logEvent
    client.add_MessageUpdated messageUpdated


    if environmentVariables.isProduction then
        client.add_JoinedGuild joinedGuild
        client.add_LeftGuild leftGuild

    (*     "f u c k"
    |> getStringPermutations jsonInfo.alternativeCharacters jsonInfo.bypassCharacters
    |> Array.iter (fun x -> printfn $"{x}") *)


    do! client.LoginAsync(TokenType.Bot, environmentVariables.token)

    do! client.StartAsync()
    do! Async.Sleep -1
}
|> Async.AwaitTask
|> Async.RunSynchronously
