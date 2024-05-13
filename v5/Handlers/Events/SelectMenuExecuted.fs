module Handlers.Events.SelectMenuExecuted

open Discord.WebSocket
open System.Threading.Tasks
open Utils
open Handlers.SelectMenus

let selectMenuExecuted (selectMenuInteraction: SocketMessageComponent) : Task =
  task {
    let customId = selectMenuInteraction.Data.CustomId

    Task.Run<unit>(fun () ->
      task {
        match customId with
        | _ when customId |> startsWith "bypass_roles_remove" -> do! bypassRolesRemove selectMenuInteraction
        | _ when customId |> startsWith "bypass_channels_remove" -> do! bypassChannelsRemove selectMenuInteraction
        // | _ when customId |> startsWith "role_select" -> do! limitRoleAdd selectMenuInteraction
        | "limits_remove" -> do! limitsRemove selectMenuInteraction
        | "comm_channels_remove" -> do! commChannelsRemove selectMenuInteraction
        | "cleanup_bots_remove" -> do! cleanupBotsRemove selectMenuInteraction
        | _ -> ()
      })
    |> ignore

  }
