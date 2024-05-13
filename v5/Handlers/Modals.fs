module Modals

open Discord.WebSocket
open Types
open Utils
open MongoDB.Bson
open System.Threading.Tasks
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers


let blacklistModalHandler (modal: SocketModal) =
  task {
    let guildId = modal.GuildId.Value

    let words, phrases, links =
      (getModalComponent "words" modal).Value,
      (getModalComponent "phrases" modal).Value,
      (getModalComponent "links" modal).Value

    let toItems = split "," >> Array.map (trim >> toLower) >> Array.filter ((<>) "")

    let passed, failed =
      partitionBlacklistInput
        { Words = words |> toItems
          Phrases = phrases |> toItems
          Links = links |> toItems }

    let passedItems =
      passed.Words |> Array.append passed.Phrases |> Array.append passed.Links

    let failedItems =
      failed.Words |> Array.append failed.Phrases |> Array.append failed.Links

    do! setDocument InexactMatch <| BsonArray passed.Words <| guildId

    do!
      setDocument Links
      <| BsonArray(
        passed.Links
        |> Array.map (fun x -> x.Replace("http://", "").Replace("https://", ""))
      )
      <| guildId

    do! setDocument Phrases <| BsonArray passed.Phrases <| guildId


    let baseDescription =
      $" 
      **__Blacklist- {length passedItems} total items__**
      **Words:** {length passed.Words}
      **Phrases:** {length passed.Phrases}
      **Links:** {length passed.Links}
      "

    let invalidItemsDescription =
      $"
      **__Omitted__**
      - **{length failed.Words} words omitted** because they were not words. Make sure every item is one word.
      - **{length failed.Phrases} phrases omitted** because they were not phrases. Make sure every item is 2+ words.
      - **{length failed.Links} links omitted** because they were not links. Make sure every item starts with 'http://' or 'https://'. 
      "

    let description =
      if length failedItems > 0 then
        baseDescription + invalidItemsDescription
      else
        baseDescription

    let color = if length failedItems > 0 then Blue else Green

    do!
      (send
        (Interaction(modal, None))
        { MessageType =
            Embed
              { Title = "Blacklist Updated"
                Description = description
                Footer = Some "If word is not being blocked, put an underscore in front of it in the blacklist"
                Color = color }
          Components = None }

      )
      :> Task

  }

let customEmbedModalHandler (modal: SocketModal) =
  task {
    let title = (getModalComponent "title" modal).Value
    let content = (getModalComponent "content" modal).Value
    let color = (getModalComponent "color" modal).Value
    let cleanup = (getModalComponent "cleanup" modal).Value
    let! res = setCustomEmbed title content color cleanup modal.GuildId.Value

    match res with
    | Ok _ ->
      do!
        (send
          (Interaction(modal, None))
          { MessageType =
              Embed
                { Title = "Embed Updated"
                  Description = "Embed has been updated."
                  Footer = None
                  Color = Green }
            Components = None }

        )
        :> Task
    | Error errorMessage ->
      do!
        (send
          (Interaction(modal, None))
          { MessageType =
              Embed
                { Title = "Error"
                  Description = errorMessage
                  Footer = None
                  Color = Red }
            Components = None }

        )
        :> Task

  }
