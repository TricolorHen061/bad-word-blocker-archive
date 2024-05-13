module Handlers.Events.MessageUpdated

open Discord.WebSocket
open System.Threading.Tasks
open Handlers.Messages

let messageUpdated _ (after: SocketMessage) _ : Task =
  task {
    Task.Run<unit>(fun () -> processMessage after) |> ignore
    return Task.CompletedTask
  }
