module Handlers.Commands.Ping

open Types
open System.Threading.Tasks
open Discord.WebSocket
open Wrappers.DiscordWrappers
open GlobalVariables


let pingCommand (data: SocketSlashCommand) =
  task {
    try
      do!
        (send
          (Interaction(data, Some true))
          { MessageType =
              Types.Embed
                { Title = "Pong!"
                  Description = "Bot ping is " + (string <| getPing client)
                  Footer = None
                  Color = Blue }
            Components = None }
        :> Task)
    with e ->
      printfn $"{e}"
  }
