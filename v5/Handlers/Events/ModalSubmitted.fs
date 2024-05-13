module Handlers.Events.ModalSubmitted

open Discord.WebSocket
open System.Threading.Tasks
open Modals

let modalSubmitted (modal: SocketModal) : Task =
  task {
    Task.Run<unit>(fun () ->
      task {
        let isInGuild = modal.GuildId.HasValue

        match modal.Data.CustomId with
        | "blacklist" when isInGuild -> do! blacklistModalHandler modal
        | "custom_embed" when isInGuild -> do! customEmbedModalHandler modal
        | _ -> ()
      })
    |> ignore

    return Task.CompletedTask

  }
