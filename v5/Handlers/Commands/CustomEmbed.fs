module Handlers.Commands.CustomEmbed

open Discord.WebSocket
open Utils
open Types
open GlobalVariables
open System.Threading.Tasks
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers

let customEmbedCommand (commandInteraction: SocketSlashCommand) =
  task {
    let guildId = commandInteraction.GuildId.Value

    let! existingData =
      getDocument<CustomMessagesData> CustomMessages guildId
      |> taskDefaultValue
           { _id = string guildId
             info =
               { title = defaultEmbedTitle
                 content = defaultEmbedDescription
                 color = toColorCode >> int <| Blue
                 cleanup = 0 }

           }

    do!
      send
        (Interaction(commandInteraction, None))
        { MessageType =
            Modal
              { Title = "Customize Embed"
                CustomId = "custom_embed"
                TextInputs =
                  [| { Label = "Title"
                       CustomId = "title"
                       Required = true
                       Placeholder = Some "Title of the embed"
                       Style = Short
                       Value = Some existingData.info.title
                       MaxLength = Some 256
                       MinLength = None }
                     { Label = "Content"
                       CustomId = "content"
                       Required = true
                       Placeholder = Some "Description of the embed"
                       Style = Paragraph
                       Value = Some existingData.info.content
                       MaxLength = Some 4000
                       MinLength = Some 1 }
                     { Label = "Color"
                       CustomId = "color"
                       Required = true
                       Placeholder = Some "Color of the embed (Int value of color)"
                       Style = Short
                       Value = Some <| string existingData.info.color
                       MaxLength = Some 8
                       MinLength = Some 1 }
                     { Label = "Delete Embed After (seconds)"
                       CustomId = "cleanup"
                       Required = true
                       Placeholder =
                         Some "-1 = Don't send, 0 = Never delete, anything else = seconds the message will delete after"
                       Style = Short
                       Value = Some <| string existingData.info.cleanup
                       MaxLength = Some 4
                       MinLength = Some 1 } |] }
          Components = None }
      :> Task
  }
