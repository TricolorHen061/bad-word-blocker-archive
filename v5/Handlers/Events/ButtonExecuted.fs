module Handlers.Events.ButtonExecuted

open Discord.WebSocket
open Handlers.Buttons
open System.Threading.Tasks

let buttonExecuted (interaction: SocketMessageComponent) : Task =
  task {
    // let buttonInteraction = interaction :?> ButtonComponent
    let customId = interaction.Data.CustomId

    Task.Run<unit>(fun () ->
      task {
        try
          match customId with
          | "bypass_roles_button" -> do! bypassRolesButtonExecuted interaction
          | "bypass_channels_button" -> do! bypassChannelsButtonExecuted interaction
          | "remove_log_channel" -> do! logChannelRemoveButtonExecuted interaction
          | "extras_enable" -> do! extrasEnableButtonExecuted interaction
          | _ -> ()
        with e ->
          printfn $"{e}"
      })
    |> ignore

    return Task.CompletedTask

  }
