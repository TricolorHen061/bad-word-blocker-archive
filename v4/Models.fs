module Models

open Discord
open Discord.Interactions

module Modals = 
    
    type BlacklistModal () = 

        interface IModal with 
            member this.Title = "Server Blacklist"

        [<InputLabel("Exact-match words")>]
        [<ModalTextInput("exactmatchItems", TextInputStyle.Paragraph, "word1, word2, word3, etc")>]
        [<RequiredInput(false)>]
        member val exactmatch:string = null with get, set

        [<InputLabel("Inexact-match words")>]
        [<ModalTextInput("inexactmatchItems", TextInputStyle.Paragraph, "word1, word2, word3, etc")>]
        [<RequiredInput(false)>]
        member val inexactmatch:string = null with get, set

        [<InputLabel("Phrases")>]
        [<ModalTextInput("phraseItems", TextInputStyle.Paragraph, "Some phrase 1, some other phrase 2, another phrase 3, etc")>]
        [<RequiredInput(false)>]
        member val phrases:string = null with get, set

        [<InputLabel("Links")>]
        [<ModalTextInput("linkItems", TextInputStyle.Paragraph, "https://link1.com, http://link2.com, https://link3.com, etc")>]
        [<RequiredInput(false)>]
        member val links:string = null with get, set

module Types =

    type BlacklistModalRawInput = { ExactMatch: string; InexactMatch: string; Phrases: string; Links: string }
    type filterIntoTwoResult<'T> = {Passed: 'T List; Failed: 'T List}
    type BlacklistModalProcessedInput = 
        { ExactMatch: filterIntoTwoResult<string>;
        InexactMatch: filterIntoTwoResult<string>;
        Phrases: filterIntoTwoResult<string>;
        Links: filterIntoTwoResult<string> }
    
    type LimitData = 
        { action:string;
        amount:int;
        minutes:int Option}

    type WordSearchResult = 
        | WordFound of string
        | WordNotFound

    type SurroundingWordSearchResult = 
        | OneWord of string
        | TwoWords of string * string
        | NotFound
    
    type LinkSearchResult = 
        | LinkFound of string
        | LinkNotFound
    
    type PhraseSearchResult = 
        | PhraseFound of string
        | PhraseNotFound

    type DatabaseResultPossibilities<'T> = 
        | NoDocumentFound
        | DocumentFoundNullValue
        | DocumentFound of 'T

    type DatabaseReturnValue = 
        | DbValue of string * uint64

    type DatabaseReturnType = 
        | String
        | Int
        | Array

    type BypassTypes = 
        | Channel of uint64
        | Role of uint64

    type StringSearchResult = 
        | BlacklistedItemFound of string * string
        | NoBlacklistedItemFound

    type Limits = 
        | Ban of int * (int Option)
        | Kick of int
        | Timeout of int * (int Option)
    
    type TriedPunishment = 
        | Tried of string * int option * bool
        | DidNotTry

    type GuildBanTimerEntry = {time:int; userId:uint64; guildId:uint64}

    type LimitStatus = 
        | IsOverLimit
        | IsNotOverLimit

