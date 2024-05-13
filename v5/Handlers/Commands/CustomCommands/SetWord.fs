module Handlers.Commands.CustomCommands.SetWord

open Discord.WebSocket
open Utils
open Types
open System.Threading.Tasks
open Wrappers.DiscordWrappers
open Wrappers.DatabaseWrappers

#nowarn "3391"

let setWordCommand (commandInteraction: SocketSlashCommand) (option: SocketSlashCommandDataOption) =
  task {
    printfn "It's working"
    let guildId = uint64 <| commandInteraction.GuildId.Value

    let word =
      getOption commandInteraction.Data.Options "word"
      |> Option.map (fun x -> x.Value :?> string)
      |> Option.get


    do! setDocument CustomEmbedWord word guildId

    do!
      (send (Interaction(commandInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Word set"
                Description = "That word will now be used when your message is censored"
                Footer = None
                Color = Green }
          Components = None
           })
      :> Task
  }
