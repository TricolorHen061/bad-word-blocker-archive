module Handlers.Commands.Serverc

open Discord.WebSocket
open GlobalVariables
open System.Threading.Tasks
open Utils
open Wrappers.DiscordWrappers
open Types

let servercCommand (commandInteraction: SocketSlashCommand) =
  task {

    let guildCount = getGuildCount client

    do!
      send
        (Interaction(commandInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Server count"
                Description = $"Bad Word Blocker is in {guildCount} servers"
                Footer = None
                Color = Blue }
          Components = None }
      :> Task
  }
