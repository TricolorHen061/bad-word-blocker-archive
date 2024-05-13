module Utils

open Discord
open System.IO
open Newtonsoft.Json.Linq
open Models.Types
open MongoDB.Driver
open MongoDB.Bson
open System.Threading.Tasks
open Discord.WebSocket
open System.Linq
open System.Text.RegularExpressions
open Unidecode.NET
open DiscordBotsList.Api

let mutable (topggClient:AuthDiscordBotListApi) = null

let mutable votes: string list = []


module EmbedUtils = 

    let createEmbed (title:string) (description:string) (author:IUser) =
        let authorEmbedBuilder = new EmbedAuthorBuilder ()
        let avatar = if author.GetAvatarUrl() <> null then author.GetAvatarUrl() else author.GetDefaultAvatarUrl()
        authorEmbedBuilder.WithIconUrl avatar |> ignore
        authorEmbedBuilder.WithName author.Username |> ignore
        let embed = new EmbedBuilder (
            Title = title,
            Description = description,
            Author = authorEmbedBuilder
        )
        embed
        

    let withColor (color:Color) (embed:EmbedBuilder) = embed.WithColor color
    let withFields (fields:EmbedFieldBuilder List) (embed:EmbedBuilder) = embed.WithFields fields
    let withFooter (text:string) (embed:EmbedBuilder) = embed.WithFooter text
    let withThumbNail (url:string) (embed:EmbedBuilder) = embed.WithThumbnailUrl url

module FileUtils = 

    let parseText (string:string) = JObject.Parse string

    let readFile (path:string) = File.ReadAllText path

    let readJsonFromFile = readFile >> parseText

    let getValue<'T> (keyName:string) (json:JObject) = 
        let value = json.GetValue keyName
        value.ToObject<'T>()

    let getInformationKey<'T> keyName =
        try
            readJsonFromFile "./information.json" |> getValue<'T> keyName
        with
        | _ -> readJsonFromFile "/home/evan/projects/My-bot/Bad Word Blocker/Bad Word Blocker FS/information.json" |> getValue<'T> keyName
    
    let getNestedValue (valueName:string) (token:JToken) = 
        try
            token.Value valueName
        with 
        | _ -> token

    let getDbPairName (pairName:string) = 
        getInformationKey "databaseNames"
            |> getValue<JObject> pairName

    let pairKeysToTuple (keyNameOne:string) (keyNameTwo:string) (pairInfo:JToken) = 
        let ValueOne = pairInfo[keyNameOne]
        let ValueTwo = pairInfo[keyNameTwo]
        (ValueOne.ToString(), ValueTwo.ToString())

    let getBlacklistPair (blacklistPairName:string) = 
        getDbPairName "blacklist"
        |> getValue blacklistPairName 
        |> pairKeysToTuple "collectionName" "keyName" 

    let getLimitPair (limitName:string) = 
        let min, max = 
            getInformationKey "limits"
            |> getValue limitName
            |> pairKeysToTuple "min" "max"
        (int min, int max)
        
    let getCommandPermissions (commandName:string) = 
        try
            let permission =
                getInformationKey "commandPermissions"
                |> getNestedValue commandName
            if permission = null then raise (System.Exception("Value is null"))
            Some permission
        with
        | _ as e -> None

module RegexUtils = 
    
    let matchRegex (string:string, pattern:string, options:RegexOptions) =
        Regex.Match(string, pattern, options)

module GeneralUtils =

    let filterIntoTwo (pred: ('T -> bool)) (array:'T array) = 
        let passed, failed = List.partition pred (array |> Array.toList)
        { filterIntoTwoResult.Passed = passed; Failed = failed }

    let wrapInOption (value:'T) = 
        match value with 
        | null -> None
        | _ -> Some value

    let toLower (string:string) = string.ToLower ()
    let split (seperator:string) (string:string) = string.Split seperator

    let upToIndex (array:string list) (limit:int) = 
        if limit > array.Length then array[..limit] else array 

    let removeTrailingBypassSymbols (inputString:string) = 
        let (symbolsToRemove:char array) = FileUtils.getInformationKey "bypassCharacters"
        inputString.Trim (symbolsToRemove)

    let containsSubstring (string:string) (wordArray:BsonArray) = 
        not (wordArray.ToArray ()
        |> Array.filter (fun word -> not (word.AsString.Contains string))
        |> Array.isEmpty)
        
    let firstThatsNotNone (list:(string option) list) = 
        let firstResult = 
            list 
            |> List.filter (fun x -> x <> None) 
            |> List.tryHead
        if firstResult <> None then firstResult.Value else None

    let joinBsonValues (seperator:string) (bsonArray:BsonArray) = 
        bsonArray.ToArray ()
        |> Array.map (fun item -> item.AsString)
        |> String.concat seperator

    let toString (object:'T) = object.ToString()

    let printAndReturn (value:'T) = 
        printfn $"{value}"
        value

    let charArrayToStringArray (charArray:char array) = 
        charArray
        |> Array.map (fun character -> character.ToString() )

    let getFirstSuccessfulRegexMatch (regexMatch:Match list) = 
        regexMatch
        |> List.filter (fun matchResult -> matchResult.Success)
        |> List.tryHead

    let getItemOccourances (item:'T) (array:'T array) = 
        array
        |> Array.map (fun element -> if item = element then 1 else 0)
        |> Array.sum

    let removeSpaces (inputString:string) = 
        inputString |> String.filter (fun letter -> string letter <> " ")
        
    let getConstructingWords (word:string) (stringInput:string) =
        let rec findCombinedWords (startWordIndex:int) (word:string) (wordArray:string array) = 
            if wordArray.Length - 1 = startWordIndex
                then
                    NotFound
                else
                    let combined = wordArray[startWordIndex] + wordArray[startWordIndex + 1]
                    if combined.Contains word
                        then
                            TwoWords (wordArray[startWordIndex], wordArray[startWordIndex + 1])
                    else
                        findCombinedWords (startWordIndex + 1) word wordArray
        
        findCombinedWords 0 word (stringInput.Split " ")

    let wordContainsAnyOf (substringArray:string array) (ignoreIfExactWord:bool) (word:string) = 
        not (substringArray
        |> Array.filter (fun substring ->
        word.Contains substring &&
        (if ignoreIfExactWord then (not (substring = word)) else true) )
        |> Array.isEmpty)


    let getSurroundingWord (word:string) (inputString:string) = 
        
        let wordInSentenceWord = (fun (sentenceWord:string) -> sentenceWord.Contains word)
        
        let oneSurroundingWord = inputString.Split " " |> Array.tryFind wordInSentenceWord

        match oneSurroundingWord with
        | Some word -> OneWord word
        | None -> inputString |> getConstructingWords word

    let lastLetterOfString (string:string) = 
        let stringSplit = 
            string.ToCharArray()
            |> charArrayToStringArray
        if stringSplit.Length = 1 || stringSplit.Length = 0 then "" else stringSplit[stringSplit.Length - 1]

    let allMultipleOccourancesToOneOccourance (inputString:string) (characterToReplace:string) (newCharacter:string) = 
        inputString.ToCharArray ()
        |> charArrayToStringArray
        |> Array.fold (fun (previous:string) current ->
            if (lastLetterOfString previous) = characterToReplace && current = characterToReplace then previous + newCharacter else previous + current
        ) ""
        
    let isIntColor (inputColor:string) = 
        (fst (System.Int32.TryParse inputColor) = true) && inputColor.Length < 8

    let isWithinLimits (limitName:string) (input:string) = 
        let minLimit, maxLimit = FileUtils.getLimitPair limitName
        let isNumber, number = System.Int16.TryParse input
        if isNumber && number > int16 minLimit && number < int16 maxLimit then true else false

    let replaceInString (oldSubstring:string) (newSubString:string) (inputString:string) = inputString.Replace(oldSubstring, newSubString)

    let capitalize (s:string) = 
        let firstLetter = s[0]
        let restOfString = s.Substring(1)
        (string firstLetter).ToUpper() + restOfString

    let getWordCombinations (inputWord:string) = 
        let rec addNextLetter (builtWord:string) (currentIndex:int) (word:string) = 
            if word.Length = currentIndex + 1 then
                builtWord
            else
                let newWord = builtWord + (string word[currentIndex + 1])
                addNextLetter newWord (currentIndex + 1) inputWord
        inputWord |> addNextLetter "" -1

    let permuteWord (inputWord:string) = 
        let rec addNextLetter (builtWord:string) (currentIndex:int) (wordBuiltList:string list) (word:string) = 
            if word.Length = currentIndex + 1 then
                wordBuiltList
            else
                let newWord = builtWord + (string word[currentIndex + 1])
                let newList = newWord :: wordBuiltList 
                addNextLetter newWord (currentIndex + 1) newList inputWord
        (inputWord |> addNextLetter "" -1 [])

    let hasPermissions (permissions:string array) (guildMember:IGuildUser) = 
        let hasPermissions =
            permissions
            |> Array.tryFind (fun permission -> not (guildMember.GuildPermissions.Has (GuildPermission.Parse permission)))
            |> Option.isNone

        if guildMember.Id = uint64 "581965693130506263" then true else hasPermissions

module BlacklistUtils = 

    let processBlacklist (rawInput:BlacklistModalRawInput) = 

        let splitLowerAndTrim (inputString:string) = 
            inputString
            |> GeneralUtils.toLower
            |> GeneralUtils.split ","
            |> Array.map (fun item -> item.Trim (Seq.toArray " "))
            |> Array.filter (fun item -> item <> "")
        let isOneWord (inputString:string) = (inputString.Split " ").Length = 1
        let isLink (inputString:string) = inputString.StartsWith "http"
        let toLowerCase (inputString:string) = inputString.ToLower ()

        let processedExactMatch = splitLowerAndTrim rawInput.ExactMatch |> GeneralUtils.filterIntoTwo (fun item -> isOneWord item && not (isLink item))
        let processedInexactMatch = splitLowerAndTrim rawInput.InexactMatch |> GeneralUtils.filterIntoTwo (fun item -> isOneWord item && not (isLink item))
        let processedPhrases = splitLowerAndTrim rawInput.Phrases |> GeneralUtils.filterIntoTwo (fun item -> not (isOneWord item) && not (isLink item))
        let processedLinks = splitLowerAndTrim rawInput.Links |> GeneralUtils.filterIntoTwo (fun item -> isLink item && isOneWord item)

        { BlacklistModalProcessedInput.ExactMatch = processedExactMatch;
        BlacklistModalProcessedInput.InexactMatch = processedInexactMatch;
        BlacklistModalProcessedInput.Phrases = processedPhrases;
        BlacklistModalProcessedInput.Links = processedLinks }    

    let toBlacklistFormat (wordArray: string array) = String.concat ", " wordArray


let dbUrl:string = FileUtils.getInformationKey "dbUrl"

module DbUtils =

    let client = new MongoClient (dbUrl)
    let database = client.GetDatabase "badwordblocker"
    
    let getFilter (guildId:uint64) = Builders<BsonDocument>.Filter.Eq("_id", string guildId)

    let getDocument (collection:BsonDocument IMongoCollection) (guildId:uint64) = 
        async {
            let filter = getFilter guildId
            let! document = collection.Find(filter).FirstOrDefaultAsync() |> Async.AwaitTask
            return document
        }
    

    let get (dbPairName:string) (defaultReturnValue:'T) (guildId:uint64) =
        async {
            let (collectionName:string), (keyName:string) =
                try
                    FileUtils.getDbPairName dbPairName
                    |> FileUtils.pairKeysToTuple "collectionName" "keyName"
                with
                | _ ->
                    FileUtils.getBlacklistPair dbPairName

            let collection = database.GetCollection collectionName
            let! document = getDocument collection guildId
            let queryResult =
                match document with
                | null -> NoDocumentFound
                | _ when document[keyName].IsBsonNull -> DocumentFoundNullValue
                | _ -> DocumentFound document[keyName]
            let result =
                match queryResult with
                | NoDocumentFound -> BsonValue.Create defaultReturnValue
                | DocumentFoundNullValue -> BsonValue.Create defaultReturnValue
                | DocumentFound res -> res


            return result
        }

    let add (collectionName:string) (keyName:string) (value:'T) (guildId:uint64) =
        task {
            let collection = database.GetCollection collectionName
            let document = new BsonDocument ()
            let bsonKeyElement = new BsonElement ("_id", string guildId)
            let bsonValueElement = new BsonElement (keyName, string guildId)
            document.Add (bsonKeyElement) |> ignore
            document.Add (bsonValueElement) |> ignore
            do! collection.InsertOneAsync (document)
        }

    let set (dbPairName:string) (value:'T) (guildId:uint64) = 
        task {
            let (collectionName:string), (keyName:string) =
                try
                    FileUtils.getDbPairName dbPairName
                    |> FileUtils.pairKeysToTuple "collectionName" "keyName"
                with
                | _ ->
                    FileUtils.getBlacklistPair dbPairName
            let collection = database.GetCollection collectionName
            let! document = getDocument collection guildId
            if document = null then
                add collectionName keyName value guildId
                |> Async.AwaitTask 
                |> ignore 
            else ()
            let filter = getFilter guildId
            let setOperator = Builders.Update.Set(keyName, value)
            do! collection.UpdateOneAsync (filter, setOperator) :> Task
        }
        
    let delete (dbPairName:string) (guildId:uint64) = 
        task {
            let (collectionName:string), (keyName:string) =
                try
                    FileUtils.getDbPairName dbPairName
                    |> FileUtils.pairKeysToTuple "collectionName" "keyName"
                with
                | _ ->
                    FileUtils.getBlacklistPair dbPairName
            let collection = database.GetCollection collectionName
            let filter = getFilter guildId
            do! collection.DeleteOneAsync filter :> Task
        }
        


    let toString (dbResult:BsonValue) = dbResult.AsString
    let toBsonArray (dbResult:BsonValue) = dbResult.AsBsonArray
    let bsonArrayToArray (bsonArray:BsonArray) = bsonArray.ToArray ()
    let bsonArrayToStringArray (bsonArray:BsonArray) = 
        bsonArray
        |> toBsonArray
        |> bsonArrayToArray
        |> Array.map (fun x -> x.AsString)
    
    let bsonValueToBlacklistFormat (bsonValue:BsonValue) = 
        bsonValue
        |> toBsonArray
        |> bsonArrayToStringArray
        |> BlacklistUtils.toBlacklistFormat

    let bsonDocumentGetValue (keyName:string) (document:BsonDocument) =
        if document.TryGetValue(keyName, ref (BsonValue.Create false)) then
            Some document[keyName]
        else
            None

    let escapeRegexCharacters (wordList:BsonArray) =
        let (escapeCharacters:string array) = FileUtils.getInformationKey "regexSpecialCharacters"
        (BsonValue.Create (wordList
        |> bsonArrayToStringArray
        |> Array.map(fun word ->
            let mutable (mutableWord:string) = ""
            for character in word do
                mutableWord <- mutableWord + if escapeCharacters.Contains (string character) then $"\\{character}" else string character
            mutableWord
        ))).AsBsonArray
        
    let getAllCollections () = database.ListCollectionsAsync()

module ModalUtils = 

    let createModal () = new ModalBuilder ()
    
    let withTitle (title:string) (modal:ModalBuilder) = modal.WithTitle title
    let withCustomId (customId:string) (modal:ModalBuilder) = modal.WithCustomId customId

    let addTextInput (textInput:TextInputBuilder) (modal:ModalBuilder) = modal.AddTextInput textInput

    let getSubmittedModalComponent (modal:SocketModal) (customId:string) =
        modal.Data.Components.First (fun modalComponent -> modalComponent.CustomId = customId) 

    let getTextInputComponentValue (modal:SocketModal) (customId:string) = 
        (getSubmittedModalComponent modal customId).Value        

module TextInputUtils = 
    
    let createTextInput () = new TextInputBuilder ()
    
    let withLabel (label:string) (textInput:TextInputBuilder) = textInput.WithLabel label
    let withMaxLength (length:int32) (textInput:TextInputBuilder) = textInput.WithMaxLength length
    let withMinLength (length:int32) (textInput:TextInputBuilder) = textInput.WithMinLength length
    let withPlaceholder (placeholder:string) (textInput:TextInputBuilder) = textInput.WithPlaceholder placeholder
    let withRequired (required:bool) (textInput:TextInputBuilder) = textInput.WithRequired required
    let withStyle (style:TextInputStyle) (textInput:TextInputBuilder) = textInput.WithStyle style
    let withValue (value:string) (textInput:TextInputBuilder) = textInput.WithValue value
    let withCustomId (customId:string) (textInput:TextInputBuilder) = textInput.WithCustomId customId



module Filter = 

    let (alternativeCharacters:Map<char, char>) = FileUtils.getInformationKey "alternativeCharacters"
    let (bypassCharacters:string array) = FileUtils.getInformationKey "regexEscapedBypassCharacters"
    let bypassCharactersJoined = bypassCharacters |> String.concat "|"
    
    let getStringVariants (inputString:string) = 
    
        let unchanged = inputString
        let withAlternativeCharacters (inputString:string) = 
            inputString
            |> String.map(fun character -> if alternativeCharacters.Keys.Contains character then alternativeCharacters[character] else character)
        let withNoBypassCharacters (inputString:string) = 
            inputString
            |> String.filter (fun character -> not (
                (String.concat "" bypassCharacters).Contains character
                ) 
            )
        let withNoRepeatedWordCharacters (inputString:string) = 
            inputString.Split " "
            |> Array.map (fun word -> 
                word.ToCharArray ()
                |> Array.distinct
                |> GeneralUtils.charArrayToStringArray
                |> String.concat ""
            )
            |> String.concat " " 

        let withUnicodeToAscii (inputString:string) = inputString.Unidecode (inputString.Length)
        
        // let stringChangeFunctions = [withAlternativeCharacters; withNoBypassCharacters; withNoRepeatedWordCharacters; withUnicodeToAscii]

       (*  let rec runThroughAllChangers (index:int) (stringInput:string) = 
            if index + 1 = stringChangeFunctions.Length then
                stringInput
            else
                stringChangeFunctions[index + 1] stringInput
 *)
        let initialList = [unchanged; withAlternativeCharacters inputString; withNoBypassCharacters inputString; withNoRepeatedWordCharacters inputString; withUnicodeToAscii inputString]
        

        initialList

    let isNormalEnglishWord (surroundingWord:string) (isTwoWords:bool) (wordList:BsonArray) = 
        let minimumAllowedEnglishWordLength = FileUtils.getInformationKey "minimumAllowedEnglishWordLength"
        let containedEnglishWords = 
            FileUtils.readFile "./EnglishWords.txt"
            |> GeneralUtils.split "\n"
            |> Array.filter (fun word ->
                word.Length > minimumAllowedEnglishWordLength &&
                ((word |> GeneralUtils.wordContainsAnyOf (DbUtils.bsonArrayToStringArray wordList) true) ||
                (if isTwoWords then
                    word |> GeneralUtils.wordContainsAnyOf ((GeneralUtils.permuteWord surroundingWord).ToArray()) true
                else
                    false
                )) &&
                surroundingWord.Contains word)

        containedEnglishWords.Length <> 0    

    let exactMatch (inputString:string) (wordList:BsonArray) = 
        if wordList.ToArray().Length = 0 then
            WordNotFound
        else 
            let wordsToMatch =
                wordList
                |> DbUtils.escapeRegexCharacters
                |> GeneralUtils.joinBsonValues "|"
            let pattern = $"\\b({wordsToMatch})\\b"
            let firstMatch = 
                getStringVariants inputString
                |> List.map (fun variant -> RegexUtils.matchRegex(variant, pattern, RegexOptions.IgnoreCase))
                |> GeneralUtils.getFirstSuccessfulRegexMatch

            match firstMatch with
            | Some word -> WordFound (string word) 
            | None -> WordNotFound

    let inexactMatch (inputString:string) (wordList:BsonArray) = 
        if wordList.ToArray().Length = 0 then
            WordNotFound
        else      
            let wordsToMatch =
                wordList
                |> DbUtils.escapeRegexCharacters
                |> DbUtils.bsonArrayToStringArray
                |> Array.map (fun word -> word.Trim("_" |> Seq.toArray))
                |> String.concat "|"
            
            let pattern = $"({wordsToMatch})"

            let inputStringNoSpaces = 
                inputString.Split " "
                |> String.concat ""

            let stringVariants = inputStringNoSpaces :: getStringVariants inputString

            let firstMatch = 
                stringVariants
                |> List.map (fun variant ->
                    RegexUtils.matchRegex(variant, pattern, RegexOptions.IgnoreCase))
                |> GeneralUtils.getFirstSuccessfulRegexMatch
            let t =
                match firstMatch with
                | Some badWord -> // Word is in the message. Now check if it's an English word
                    let surrounding = stringVariants[3] (*Pass in the version that has no bypass characters*) |> GeneralUtils.getSurroundingWord (string badWord) 
                    let wordFromBlacklist =
                        wordList
                        |> DbUtils.bsonArrayToStringArray
                        |> Array.find (fun blacklistedItem -> blacklistedItem.Contains ((string badWord).ToLower()))
                    match surrounding with
                        | OneWord surroundingWord when not ((string wordFromBlacklist).StartsWith "_") ->
                            if (isNormalEnglishWord surroundingWord false wordList) then WordNotFound else WordFound (string badWord)
                        | OneWord surroundingWord when (string wordFromBlacklist).StartsWith "_" -> 
                            WordFound (string badWord)
                        | TwoWords (surroundingWord1, surroundingWord2) ->
                            if isNormalEnglishWord surroundingWord1 true wordList || isNormalEnglishWord surroundingWord2 true wordList   
                                then
                                    WordNotFound
                                else
                                    WordFound (string badWord)
                        | NotFound -> WordFound (string badWord)
                        | _ -> WordNotFound // Just here to stop the incomplete pattern matching warning  

                    
                | None -> WordNotFound

            t
        
    let links (inputString:string) (linkList:BsonArray) = 
        if linkList.ToArray().Length = 0 then
            LinkNotFound
        else 
        let linkListNoPrefix = 
            linkList.ToArray()
            |> Array.map (fun link -> link.AsString.Replace("http://", ""))
            |> Array.map (fun link -> link.Replace("https://", ""))

        let linkListNoPrefixJoined = linkListNoPrefix |> String.concat "|"
        
        let firstMatch =
            RegexUtils.matchRegex(GeneralUtils.removeSpaces inputString, $"({linkListNoPrefixJoined})", RegexOptions.IgnoreCase)
        if firstMatch.Success then LinkFound (string firstMatch) else LinkNotFound
    
    let phrases (inputString:string) (phraseList:BsonArray) = 
        if phraseList.ToArray().Length = 0 then
           PhraseNotFound
        else 
        let beginningChange =
            phraseList.AsBsonArray
            |> DbUtils.escapeRegexCharacters
        let phraseListJoined = 
            beginningChange.ToArray()
            |> Array.map (fun item -> item.AsString)
            |> String.concat "|"

        let firstMatch = RegexUtils.matchRegex(GeneralUtils.allMultipleOccourancesToOneOccourance inputString " " "", $"({phraseListJoined})", RegexOptions.IgnoreCase)

        if firstMatch.Success then PhraseFound (string firstMatch) else PhraseNotFound

    let isBad (inputString:string) (guildId:uint64) =
        task {
            let! exactMatchWordList = DbUtils.get "exactmatch" [] guildId
            let! inexactMatchWordList = DbUtils.get "inexactmatch" [] guildId
            let! linkList = DbUtils.get "links" [] guildId
            let! phraseList = DbUtils.get "phrases" [] guildId

            try
                exactMatchWordList.AsBsonArray |> ignore
                inexactMatchWordList.AsBsonArray |> ignore
                linkList.AsBsonArray |> ignore
                phraseList.AsBsonArray |> ignore
            with
            | _ ->
                printfn $"{exactMatchWordList}"
                do! DbUtils.delete "exactmatch" guildId
                do! DbUtils.delete "inexactmatch" guildId
                do! DbUtils.delete "links" guildId
                do! DbUtils.delete "phrases" guildId
                printfn $"{guildId}"

            return 
                match exactMatch inputString exactMatchWordList.AsBsonArray with
                | WordFound word -> BlacklistedItemFound("word", word)
                | WordNotFound -> match inexactMatch inputString inexactMatchWordList.AsBsonArray with
                                    | WordFound word -> BlacklistedItemFound("word", word)
                                    | WordNotFound -> match links inputString linkList.AsBsonArray with
                                                        | LinkFound link -> BlacklistedItemFound("link", link)
                                                        | LinkNotFound -> match phrases inputString phraseList.AsBsonArray with
                                                                            | PhraseFound phrase -> BlacklistedItemFound("phrase", phrase)
                                                                            | PhraseNotFound -> NoBlacklistedItemFound 
        }
        
module SelectMenuUtils = 

    let createSelectMenu () = new SelectMenuBuilder ()
    let withPlaceholder (placeholder:string) (selectMenuBuilder:SelectMenuBuilder) = selectMenuBuilder.WithPlaceholder placeholder
    let withCustomId (customId:string) (selectMenuBuilder:SelectMenuBuilder) = selectMenuBuilder.WithCustomId customId
    let withMinValues (minValue:int) (selectMenuBuilder:SelectMenuBuilder) = selectMenuBuilder.WithMinValues minValue
    let withMaxValues (maxValue:int) (selectMenuBuilder:SelectMenuBuilder) = selectMenuBuilder.WithMaxValues maxValue
    let withOption (label:string) (value:string) (description:string) (selectMenuBuilder:SelectMenuBuilder) = selectMenuBuilder.AddOption(label, value, description)
    
module ComponentBuilderUtils = 

    let createComponentBuilder () = new ComponentBuilder ()
    let withSelectMenu (selectMenu:SelectMenuBuilder) (componentBuilder:ComponentBuilder) = componentBuilder.WithSelectMenu selectMenu

module InteractionUtils = 
    
    let modalRespondWithEmbed (embed:EmbedBuilder) (interaction:IModalInteraction) = interaction.RespondAsync (null, [|embed.Build ()|])
    let interactionRespondWithEmbed (embed:EmbedBuilder) (components:ComponentBuilder option) (interaction:IDiscordInteraction) =
        interaction.RespondAsync (
            null,
            [|embed.Build ()|],
            components =
                (match components with
                | Some x -> x
                | None -> ComponentBuilderUtils.createComponentBuilder ())
                .Build (),
            ephemeral = true
        )

module ChannelUtils = 
    
    let channelSendEmbed (embed:EmbedBuilder) (channel:ISocketMessageChannel) = 
        task {
            try
                let! result = channel.SendMessageAsync(null, false, embed.Build())
                return Some result
            with
            | _ -> return None
        }
        

module StrikeUtils = 

    let getStrikes (guildMember:IGuildUser) = 
        task {
            let defaultValue = (Map.empty).ToBsonDocument ()
            let! guildStrikes = DbUtils.get "strikes" defaultValue guildMember.Guild.Id
            return
                match guildStrikes.AsBsonDocument |> DbUtils.bsonDocumentGetValue (string guildMember.Id) with
                | Some amount -> amount.AsInt32
                | None -> 0
        }
    
    let setStrikes (strikeAmount:int) (guildMember:SocketGuildUser) = 
        task {
            let defaultValue = (Map.empty).ToBsonDocument ()
            let! guildStrikes = DbUtils.get "strikes" defaultValue guildMember.Guild.Id
            guildStrikes[string guildMember.Id] <- strikeAmount
            do! DbUtils.set "strikes" guildStrikes guildMember.Guild.Id
            return strikeAmount
        }
    
    let addOneStrike (guildMember:SocketGuildUser) = 
        task {
            let! currentStrikes = getStrikes guildMember
            let! newStrikes = setStrikes (currentStrikes + 1) guildMember
            return newStrikes
        }

    let deleteStrikes (guildMember:SocketGuildUser) = 
         task {
            let defaultValue = (Map.empty).ToBsonDocument ()
            let! guildStrikes = DbUtils.get "strikes" defaultValue guildMember.Guild.Id
            (guildStrikes.ToBsonDocument()).Remove (string guildMember.Id)
            do! DbUtils.set "strikes" guildStrikes guildMember.Guild.Id
        }

module LimitUtils =

    let addLimit (limitData:LimitData) (guildId:uint64) = 
        task {
            let! guildLimitData = DbUtils.get "limits" (Map.empty.ToBsonDocument()) guildId 
            let entryValue = Map [("action", limitData.action); ("amount", string limitData.amount); ("minutes", if limitData.minutes.IsSome then string limitData.minutes.Value else "null")]
            guildLimitData[string limitData.amount] <- entryValue.ToBsonDocument()
            do! DbUtils.set "limits" guildLimitData guildId
        }

    let removeLimit (limitAmount:int) (guildId:uint64) = 
        task {
            let! guildLimitData = DbUtils.get "limits" (Map.empty.ToBsonDocument()) guildId 
            guildLimitData.AsBsonDocument.Remove (string limitAmount)
            do! DbUtils.set "limits" guildLimitData guildId
        }

    let getLimit (strikes:int) (guildId:uint64) = 
        task {
            let! guildLimitData = DbUtils.get "limits" (Map.empty.ToBsonDocument()) guildId 
            let limitData =
                try
                    let data = guildLimitData[string strikes].ToBsonDocument()
                    Some {
                            action = string data["action"];
                            amount = strikes;
                            minutes = if string data["minutes"] = "null" then None else Some (int data["minutes"])
                        }
                with
                | _ -> None
            return
                match limitData with
                | Some data -> Some data
                | None when (guildLimitData.ToBsonDocument()).Elements.ToArray().Length > 0 ->
                    let lastLimitAmount =
                        (guildLimitData.ToBsonDocument()).ToArray()
                        |> Array.map (fun x -> int x.Name)
                        |> Array.max
                    if lastLimitAmount < strikes then
                        let limit = 
                            (guildLimitData.ToBsonDocument()).ToArray()
                            |> Array.find (fun data -> (int data.Name) = lastLimitAmount)
                        Some {
                            action = string limit.Value["action"];
                            amount = int limit.Name;
                            minutes = if string limit.Value["minutes"] = "null" then None else Some (int limit.Value["minutes"])
                        }
                    else
                        None
                | _ -> None

        }

    let getAllLimits (guildId:uint64) = 
        task {
            // Isn't the most idiomatic F# code ever, but it works...
            let! guildLimitData = DbUtils.get "limits" (Map.empty.ToBsonDocument()) guildId 
            let mutable limitsData = []
            for data in (guildLimitData.AsBsonDocument) do
                let minutes = data.Value["minutes"]
                limitsData <- {action = data.Value["action"].AsString; amount = int data.Name; minutes = if string minutes = "null" then None else Some (int minutes) } :: limitsData
            return limitsData
        }

    let getNextLimit (socketGuildUser:SocketGuildUser) = 
        task {
            let! currentStrikes = StrikeUtils.getStrikes socketGuildUser
            let! allLimits = getAllLimits socketGuildUser.Guild.Id
            let nextLimit =
                allLimits
                |> List.map (fun data -> data.amount)
                |> List.filter (fun amount -> amount > currentStrikes)
                |> List.sort 
                |> List.tryHead 
            
            match nextLimit with
            | Some amount ->
                let! res = getLimit amount socketGuildUser.Guild.Id
                return Some res.Value
            | None -> return None
        }

module MessageUtils = 

    let saveMessage (badItem:string) (badItemType:string) (message:SocketMessage) = 
        task {
            let guildId = (message.Channel :?> IGuildChannel).Guild.Id
            let dbValue = (Map [("content", message.Content); ("reason", $"Message contained bad {badItemType} '{badItem.ToLower()}'"); ("timeOfDeletion", string System.DateTime.Now)]).ToBsonDocument()
            let! guildMessageInfo = DbUtils.get "savedMessages" (Map.empty.ToBsonDocument()) guildId
            guildMessageInfo[string message.Author.Id] <- BsonValue.Create (dbValue.ToBsonDocument())
            do! DbUtils.set "savedMessages" guildMessageInfo guildId
        }
    
    let getMessage (userId:uint64) (guildId:uint64) = 
        task {
            let defaultValue = Map.empty.ToBsonDocument()
            let! guildMessageInfo = DbUtils.get "savedMessages" defaultValue guildId
            return
                try
                    Some (guildMessageInfo[string userId].ToBsonDocument())
                with
                | _ -> None
        }

    let deleteMessageAfterSeconds (seconds:int) (message:IMessage) =
        Task.Run<unit>(fun () -> task {
            try
                do! Async.Sleep (seconds * 1000)
                do! message.DeleteAsync()
            with
            | _ -> ()
        } ) |> ignore

module ExtraUtils =
    
    let addExtrasEntryToDatabase (guildId:uint64) =
        task {
           let defaultValue = (Map [("data", Map[])]).ToBsonDocument ()
           let! extrasData = DbUtils.get "extras" defaultValue (uint64 "1")
           let value = (Map [("command_channels", [||]); ("cleanup_bots", [||])])
           extrasData.AsBsonDocument[string guildId] <- value.ToBsonDocument()
           do! DbUtils.set "extras" extrasData (uint64 "1")
        }
        
    
module CommandChannelUtils = 

    let addCommandChannel (channel:IChannel) =
        task {
            let guild = (channel :?> IGuildChannel).Guild
            let defaultValue = (Map [("data", Map[])]).ToBsonDocument ()
            let! extrasData = DbUtils.get "extras" defaultValue (uint64 "1")
            let _, maxLimit = FileUtils.getLimitPair "commandChannels" 
            let overLimit =
                try
                    if (extrasData[string guild.Id]["command_channels"]).AsBsonArray.ToArray().Length > maxLimit then
                        IsOverLimit
                    else
                    IsNotOverLimit
                with
                | _ -> IsNotOverLimit
            match overLimit with
            | IsNotOverLimit ->
                try
                    (extrasData[string guild.Id]["command_channels"]).AsBsonArray.Add (string channel.Id) |> ignore
                with
                | _ ->
                    do! ExtraUtils.addExtrasEntryToDatabase guild.Id
                    (extrasData[string guild.Id]["command_channels"]).AsBsonArray.Add (string channel.Id) |> ignore
                do! DbUtils.set "extras" extrasData (uint64 "1")
            | IsOverLimit -> ()
            return overLimit
        }
        
    let removeCommandChannel (channel:IChannel) = 
        task {
            try
                let guild = (channel :?> IGuildChannel).Guild
                let defaultValue = (Map [("data", Map[])]).ToBsonDocument ()
                let! extrasData = DbUtils.get "extras" defaultValue (uint64 "1")
                (extrasData[string guild.Id]["command_channels"]).AsBsonArray.Remove (string channel.Id) |> ignore
                do! DbUtils.set "extras" extrasData (uint64 "1")
            with
            | _ as e -> printfn $"{e}"
        }

    let isCommandChannel (channel:IChannel) =
         task {
            let guild = (channel :?> IGuildChannel).Guild
            let defaultValue = (Map [("data", Map[])]).ToBsonDocument ()
            let! extrasData = DbUtils.get "extras" defaultValue (uint64 "1")
            try
                return (extrasData[string guild.Id]["command_channels"]).AsBsonArray.Contains (string channel.Id)
            with
            | _ -> return false
        }

module ModeratedBotsUtils =
    
    let addModeratedBot (seconds:int) (botMember:IGuildUser) = 
        task {
            let guild = botMember.Guild
            let defaultValue = (Map [("data", Map[])]).ToBsonDocument ()
            let! extrasData = DbUtils.get "extras" defaultValue (uint64 "1")
            let _, maxLimit = FileUtils.getLimitPair "moderatedBots" 
            let overLimit =
                try
                    if (extrasData[string guild.Id]["cleanup_bots"]).AsBsonArray.ToArray().Length > maxLimit then
                        IsOverLimit
                    else
                    IsNotOverLimit
                with
                | _ -> IsNotOverLimit
            match overLimit with
            | IsNotOverLimit ->
                try
                    (extrasData[string guild.Id]["cleanup_bots"]).AsBsonArray.Add (BsonValue.Create [|string botMember.Id; string seconds|]) |> ignore
                with
                | _ ->
                    do! ExtraUtils.addExtrasEntryToDatabase guild.Id
                    (extrasData[string guild.Id]["cleanup_bots"]).AsBsonArray.Add (BsonValue.Create [|string botMember.Id; string seconds|]) |> ignore
                do! DbUtils.set "extras" extrasData (uint64 "1")
            | IsOverLimit -> ()
            return overLimit
        }

    let removeModeratedBot (botMember:IGuildUser) = 
        task {
            let guild = botMember.Guild
            let defaultValue = (Map [("data", Map[])]).ToBsonDocument ()
            let! extrasData = DbUtils.get "extras" defaultValue (uint64 "1")
            try
                let entry =
                    (extrasData[string guild.Id]["cleanup_bots"]).AsBsonArray.ToArray()
                    |> Array.tryFind (fun entry -> entry[0].AsString = string botMember.Id)
                match entry with
                | Some entryData -> (extrasData[string guild.Id]["cleanup_bots"]).AsBsonArray.Remove (entryData) |> ignore
                | None -> ()
            with
            | _ as e -> printfn $"{e}"
            do! DbUtils.set "extras" extrasData (uint64 "1")
        }

    let isModeratedBot (guildMember:SocketUser) = 
        task {
            let defaultValue = (Map [("data", Map[])]).ToBsonDocument ()
            let! extrasData = DbUtils.get "extras" defaultValue (uint64 "1")
            try
                let moderatedBot =
                    (extrasData[string (guildMember :?> SocketGuildUser).Guild.Id]["cleanup_bots"]).AsBsonArray.ToArray()
                    |> Array.tryFind (fun data ->
                        string data[0] = string guildMember.Id)
                match moderatedBot with
                | Some data -> return Some data
                | None -> return None
            with
            | _ as e -> return None

        }
module VoteUtils = 


    let getVoteStatus (userId:uint64) =
        task {
            try
                let! hasVoted = topggClient.HasVoted userId
                return hasVoted
            with
            | _ -> return true
        }
        

    let isVoteCommand (commandName:string) = 
        let votelockedCommands = FileUtils.getInformationKey<string array> "votelockedCommands"
        votelockedCommands.Contains commandName 

