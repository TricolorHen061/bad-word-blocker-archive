module Handlers.Events.MessageCreate

open Discord.WebSocket
open System.Threading.Tasks
open Handlers.Messages

let messageCreate (message: SocketMessage) : Task =
  task {
    // Positive that it's in a guild because intents are only for
    // guild messages

    Task.Run<unit>(fun () -> processMessage message) |> ignore

    return Task.CompletedTask

  }
