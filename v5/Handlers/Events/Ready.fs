module Handlers.Events.Ready

open Discord.WebSocket
open System.Threading.Tasks
open GlobalVariables
open Utils
open Handlers.PunishmentTimer
open Discord

let mutable shardsReady = 0

let onReady (client: DiscordSocketClient) : Task =
  Task.Run<unit>(fun () ->
    task {
      (* let customCommand =
                SlashCommandBuilder()
            ignore <| customCommand.WithName("setword")
            ignore <| customCommand.WithDescription("Set word that'll be used when your message is censored")
            ignore <| customCommand.AddOption(
                (
                    let optionBuilder = SlashCommandOptionBuilder()
                    ignore <| optionBuilder.WithName("word")
                    ignore <| optionBuilder.WithDescription("Word that'll be used when your message is censored")
                    ignore <| optionBuilder.WithType(ApplicationCommandOptionType.String)
                    ignore <| optionBuilder.WithRequired(true)
                    optionBuilder))
            let g = getGuild <| uint64 "737428668816818216"
            do! g.Value.CreateApplicationCommandAsync(customCommand.Build()) :> Task *)
      // printfn "Done making that command"
      shardsReady <- shardsReady + 1
      let! recShardCount = client.GetRecommendedShardCountAsync()
      let isLastShard = shardsReady = recShardCount
      do! client.SetGameAsync("Please report any issues to support server")
      printfn $"Shard {client.ShardId} is ready"

      if isLastShard then
        printfn "Posted stats"

        Task.Run<unit>(fun _ ->
          task {

            while true do
              checkPunishments () |> ignore
              do! Async.Sleep 1000
          })
        |> ignore

        Task.Run<unit>(fun _ ->
          task {
            while true do
              do! postStats GlobalVariables.client
              do! Async.Sleep 100000
          })
        |> ignore


    })
