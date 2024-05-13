module Handlers.Commands.Get

open Types
open Discord.WebSocket
open System.Threading.Tasks
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers

let getCommand (commandInteraction: SocketSlashCommand) =
  task {
    let! savedMessageData = getSavedMessage commandInteraction.User.Id commandInteraction.GuildId.Value

    let embed =
      if savedMessageData.IsSome then
        { Title = "Last blocked message"
          Description =
            $"Your last blocked message has the following data:
                    
                    **Blacklisted Item Found:** `{savedMessageData.Value.blacklistedItem}`
                    **Content:** `{savedMessageData.Value.content}`
                    **Time:** `{savedMessageData.Value.time}`
                    "
          Footer = None
          Color = Blue }
      else
        { Title = "No blocked message"
          Description = "None of your past messages have been blocked in this server"
          Footer = None
          Color = Blue }

    do!
      send
        (Interaction(commandInteraction, Some true))
        { MessageType = Embed embed
          Components = None }
      :> Task

  }
