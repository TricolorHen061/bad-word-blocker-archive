module Handlers.Commands.Update

open Discord.WebSocket
open Utils
open System.Threading.Tasks
open Wrappers.DiscordWrappers
open Wrappers.DatabaseWrappers
open Types

let updateCommand (commandInteraction: SocketSlashCommand) =
  task { // Unused command
    let! isUpdated =
      getDocument<ExactMatchData> ExactMatch commandInteraction.GuildId.Value
      |> mapTask Option.isNone

    if not isUpdated then
      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Embed
                { Title = "What this does"
                  Description =
                    "
                    On December 2nd, 2022, the entire infrastructure of Bad Word Blocker was re-written to fix many bugs and improve stability.
                    In this update, the exact-match section and inexact-match section was merged into one and renamed into the 'words' section.

                    Pressing the button below will:
                    - Merge exactmatch and inexactmatch into one and rename it into 'words' section
                    - Update to the newest and most stable version of Bad Word Blocker 
                    "
                  Footer = None
                  Color = Blue }
            Components =
              Some
                { Buttons =
                    Some
                      [| { Label = "Update"
                           CustomId = Some "update"
                           Style = Discord.ButtonStyle.Danger
                           Url = None } |]
                  SelectMenu = None } }
        :> Task
    else
      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Embed
                { Title = "Already updated"
                  Description = "You already updated"
                  Footer = None
                  Color = Red }
            Components = None }
        :> Task
  }
