module Utils

open System
open Types
open Discord.WebSocket
open System.Linq
open System.Threading.Tasks
open System.Collections.Generic
open GlobalVariables
open Unidecode.NET

let nullableToOption<'T> (value: 'T) =
    if Object.ReferenceEquals(null, value) then
        None
    else
        Some value


(* let getValue<'T> (record: 'T) (valueName: string) =
    typeof<'T>.GetProperties ()
    |> Array.find (fun x -> x.Name = valueName)
    |> (fun x -> x.GetValue(record))
    |> (fun x -> x :?> 'T) *)

let printAndPipe value =
    printfn $"{value}"
    value

let printStringAndPipe inputString value =
    printfn $"{inputString}"
    value

let toNullable (value: 'a option) =
    if value.IsSome then value.Value else null

let split (seperator: string) (str: string) = str.Split(seperator)
let toWords = split " " >> Array.map (fun x -> x.Trim())
let mergeWords = toWords >> String.concat ""
let startsWith (testStr: string) (str: string) = str.StartsWith(testStr)
let length (arr: 'T array) = arr.Length
let toLower (str: string) = str.ToLower()
let substring (startIndex: int) (str: string) = str.Substring(startIndex)
let isLength (len: int) = length >> (=) len
let flatten array = Array.collect id array

let printFnAndPipe f value =
    printfn $"{f value}"
    value

let removeExtraSpaces = toWords >> String.concat " "

let toLetters (str: string) =
    str.ToCharArray() |> Array.map (fun x -> x.ToString())

let difference (array1: 'T array) (array2: 'T array) =
    let (set1, set2) = (set array1, set array2)
    Set.difference set1 set2 |> Set.toArray

let trim (str: string) = str.Trim()


let mapTask (transformer) (wrappedTask) =
    task {
        let! result = wrappedTask
        let newResult = result |> transformer
        return newResult
    }

let toResult (inputTask: Task) =
    task {
        try
            do! inputTask
            return Ok()
        with e ->
            return Error e
    }


let partitionBlacklistInput (input: BlacklistModal) =
    let isOneWord = toWords >> isLength 1
    let isLink = fun (x: string) -> x.Contains(".")
    let isPhrase = not << isOneWord

    let passed =
        { Words = Array.filter (fun x -> isOneWord x && not (isLink x)) input.Words
          Phrases = Array.filter isPhrase input.Phrases
          Links = Array.filter (fun x -> isLink x && not (isPhrase x)) input.Links }

    let failed =
        { Words = difference input.Words passed.Words
          Phrases = difference input.Phrases passed.Phrases
          Links = difference input.Links passed.Links }

    (passed, failed)


let taskDefaultValue (value: 'a) (task: Task<'a option>) =
    task |> mapTask (Option.defaultValue value)

let getDictionaryValue (dictionary: Dictionary<string, 'b>) (keyName: string) =
    let isInDictionary = dictionary.TryGetValue(keyName) |> fst

    if isInDictionary then
        Some <| dictionary.Item(keyName)
    else
        None

let addToArray (item: 'a) (arr: 'a array) =
    arr |> Array.toList |> (fun x -> item :: x) |> List.toArray

let rec permutations =
    function
    | [] -> seq [ List.empty ]
    | x :: xs -> Seq.collect (insertions x) (permutations xs)

and insertions x =
    function
    | [] -> [ [ x ] ]
    | (y :: ys) as xs -> (x :: xs) :: (List.map (fun x -> y :: x) (insertions x ys))

let getOrDefault (map: Map<'a, 'a>) (key: 'a) (defaultValue: 'a) =
    if map.Keys.Contains(key) then
        map.Item(key)
    else
        defaultValue

let removeWordsDuplicateLetters = toLetters >> Array.distinct >> String.concat ""

let replaceAllInString (oldString: string) (newString: string) (inputString: string) =
    inputString.Replace(oldString, newString)

let stringIncludes (searchString: string) (inputString: string) = inputString.Contains(searchString)

let getStringPermutations (altChars: Map<string, string>) (bypChars: string array) (inputString: string) =
    let removeBypChars =
        toLetters >> Array.filter (not << bypChars.Contains) >> String.concat ""

    let toAlternativeCharacters =
        toLetters >> Array.map (fun x -> getOrDefault altChars x x) >> String.concat ""

    let removeDuplicateWordCharacters =
        toWords >> Array.map removeWordsDuplicateLetters >> String.concat " "

    let decode = fun (x: string) -> x.Unidecode()


    [ removeBypChars
      toAlternativeCharacters
      removeDuplicateWordCharacters
      decode ]
    |> permutations
    |> Seq.map (fun funcSet ->
        let mutable original = inputString

        for func in funcSet do
            original <- func original

        original)
    |> Seq.toArray
    // Finally, add regular ones
    |> addToArray inputString
    |> addToArray (removeBypChars inputString)
    |> addToArray (toAlternativeCharacters inputString)
    |> addToArray (removeDuplicateWordCharacters inputString)
    |> Array.distinct


let getConstructingWords (targetWord: string) (inputString: string) =
    inputString
    |> toWords
    |> Array.map (fun x -> x + " ")
    |> Array.reduce (fun prev curr ->
        if mergeWords prev |> stringIncludes targetWord then
            prev
        else
            prev + curr)
    // Here
    |> toWords
    // Now we must reverse it and do the same thing
    |> Array.rev
    |> Array.map (fun x -> x + " ")
    |> Array.reduce (fun prev curr ->
        if mergeWords prev |> stringIncludes targetWord then
            prev
        else
            curr + prev)
    |> toWords
    |> Array.filter ((<>) "")

let getFragmentInWord (targetWord: string) (isFirstConWord: bool) (fullWord: string) =

    let mutable builtString = ""
    let mutable permutedStrings = []

    if isFirstConWord then
        for letter in targetWord.ToCharArray() do
            builtString <- builtString + (letter |> string)
            permutedStrings <- builtString :: permutedStrings
    else
        let mutable index = 0

        for permutation in targetWord.ToCharArray() |> Array.map (fun _ -> targetWord) do
            let value =
                permutation.ToCharArray()
                |> Array.map string
                |> Array.skip index
                |> String.concat ""

            permutedStrings <- value :: permutedStrings
            index <- index + 1


    let fragment =
        if isFirstConWord then
            List.find (fun (str: string) -> fullWord.EndsWith(str)) permutedStrings
        else
            List.find
                (fun (str: string) -> fullWord.StartsWith(str))
                (permutedStrings
                 |> List.append (fullWord.ToCharArray() |> Array.map string |> Array.toList))


    fragment


let findItems (itemType: BlacklistItemType) (items: string array) (permutation: string) =
    items
    |> Array.map (fun item ->
        let modifiedItem =
            match itemType with
            | Word -> item |> fun x -> if x |> startsWith "_" then x |> substring 1 else x
            | Phrase -> mergeWords item
            | Link -> item

        let merged = permutation |> mergeWords
        let itemFound = if item.StartsWith("_") then item |> substring 1 else item
        let isFound = merged |> stringIncludes modifiedItem

        if isFound then
            let constructingWords = getConstructingWords item permutation

            let constructingWordsIndexes =
                try
                    constructingWords
                    |> Array.map (fun conWord -> Array.findIndex ((=) conWord) (toWords permutation))
                with e ->
                    printfn $"{e}"

                    constructingWords
                    |> Array.map (fun conWord -> Array.findIndex ((=) conWord) (toWords merged))

            Some
                { ItemFound = itemFound
                  BlacklistItem = item
                  ConstructingWords = constructingWords
                  ItemType = itemType
                  Permutation = permutation
                  ConstructingWordsIndexes = constructingWordsIndexes }
        else
            None)
    |> Array.filter (fun x -> x.IsSome)
    |> Array.map (fun x -> x.Value)




let subtractArrays (array2: 'a array) (array1: 'a array) = set array1 - set array2 |> Set.toArray


let toColorCode =
    function
    | Blue -> 3447003
    | Green -> 3066993
    | Red -> 15158332
    | Yellow -> 16776960
    | Custom intCode -> intCode
    >> uint



// The second function is in case something needs to be done to the builder



let getPastTenseAction =
    function
    | "ban" -> "banned"
    | "kick" -> "kicked"
    | "timeout" -> "timed out"
    | action when action |> startsWith "role" -> "given a mute role to"
    | _ -> raise <| Exception("Invalid limit given")


let formatError (exc: Exception) =
    exc |> string |> split "\n" |> Array.item 0

let isOk =
    function
    | Ok _ -> true
    | Error _ -> false



let isThreadChannel (channel: SocketChannel) =
    try
        channel :?> SocketThreadChannel |> ignore
        true
    with _ ->
        false




let getGuildCount (shardedClient: DiscordShardedClient) =

    let mutable allGuildsNumber = 0

    for x in client.Shards do
        allGuildsNumber <- allGuildsNumber + x.Guilds.Count

    allGuildsNumber

let postStats (shardedClient: DiscordShardedClient) =
    task {
        try
            let topggApi =
                DiscordBotsList.Api.AuthDiscordBotListApi(client.CurrentUser.Id, jsonInfo.topggToken)

            let guildCount = getGuildCount shardedClient
            do! topggApi.UpdateStats(guildCount, shardedClient.Shards.Count)
        with e ->
            printfn $"Failed to post stats: {e}"
    }

let hasVoted (userId: uint64) =
    task {
        if environmentVariables.isProduction then
            try
                let topggApi =
                    DiscordBotsList.Api.AuthDiscordBotListApi(client.CurrentUser.Id, jsonInfo.topggToken)

                return! topggApi.HasVoted(userId)
            with e ->
                printfn $"Can't check if someone has voted: {e}"
                return! task { return true }
        else
            return! task { return true }
    }


let isUnknownUser (value: SocketUser) =
    try
        value :?> SocketGuildUser |> ignore
        true
    with _ ->
        false


let isLink (inputString: string) =
    length (toWords inputString) = 1
    && (inputString.StartsWith("http://") || inputString.StartsWith("https://"))
    && inputString.Contains(".")

let containsAnyOf (items: string array) (inputString: string) =
    Array.exists (fun (item: string) -> inputString.Contains(item)) items

let isAllChars (input: string) =
    input.ToCharArray() |> Array.forall (fun x -> System.Char.IsLetter(x))

let skipAfterLimit (limit: int) (inputString: string) =
    try
        inputString.ToCharArray()
        |> Array.splitAt (limit)
        |> fst
        |> Array.map string
        |> String.concat ""
    with _ ->
        inputString

let firstLetter = skipAfterLimit 1

let hasMutualLetters (stringOne: string) (stringTwo: string) =
    let stringOneLetters = stringOne.ToCharArray()
    let stringTwoLetters = stringTwo.ToCharArray()
    (stringOneLetters |> subtractArrays stringTwoLetters).Length = 0


let isFalsePositive (langWords: string array) (itemData: ItemData) (ogPermutation: string) =
    // This function assumes that the word has already been found in the string permutation

    let shouldBlock =
        if itemData.BlacklistItem.StartsWith("_") then
            true
        else if length itemData.ConstructingWords = 1 then
            if not environmentVariables.isProduction then
                printfn "a"

            let conWord = itemData.ConstructingWords |> Array.head

            let ogConWord =
                try
                    ogPermutation
                    |> toWords
                    |> Array.item (Array.head itemData.ConstructingWordsIndexes)
                with _ ->
                    // Only gets here sometimes in different languages. Just use the conWord, I guess
                    conWord

            if itemData.ItemFound.Length <= 2 then // Things like "tf", etc
                // Only block if the letters are found back-to-back, not in a word
                // First, check if any of the words in ogPerm. are equal to it
                // If not, check if you add all the single letters up, it is included in there
                (ogPermutation |> toWords |> Array.exists ((=) itemData.ItemFound))
                || (ogPermutation
                    |> toWords
                    |> Array.filter (fun ogWord -> ogWord.Length = 1)
                    |> String.concat ""
                    |> fun res -> res.Contains(itemData.ItemFound))


            else
                ((langWords
                  |> Array.filter (hasMutualLetters itemData.ItemFound)
                  |> Array.exists (fun langWord -> ogConWord.Contains(langWord)))
                 |> not)
                || itemData.ItemFound = conWord

        else
        // This means the multiple words make up the bad word found.

        // First, check if attempted bypass

        if
            (let shortWordsCheck = // false = don't block because of this; true = do block
                // Checks that:
                // - All conWords are less than 3 chars
                // - All chars in conWord are letters
                // - At least 1 of the conWords that are 2 chars are existing words
                let allAreLessThan3 =
                    Array.forall
                        (fun (conWord: string) -> conWord.Length < 3 && isAllChars conWord)
                        itemData.ConstructingWords

                if allAreLessThan3 then
                    if
                        ((Array.exists
                            (fun (conWord: string) -> conWord.Length = 2 && (Array.exists ((=) conWord) langWords))
                            itemData.ConstructingWords))
                    then
                        false
                    else
                        true
                else
                    false


             shortWordsCheck)
        then
            // Means it's like this: w o r d
            if not environmentVariables.isProduction then
                printfn "b"

            true
        else
            // Could be legit. Check if there are any language words in it
            if not environmentVariables.isProduction then
                printfn "c"

            (

             let firstFragment =
                 getFragmentInWord itemData.ItemFound true (Array.head itemData.ConstructingWords)

             let otherFragments =
                 itemData.ConstructingWords
                 |> Array.skip 1 // We already got that
                 |> Array.map (getFragmentInWord itemData.ItemFound false)
                 |> Array.toList

             let fragments = (List.rev >> List.toArray) (firstFragment :: otherFragments)

             if not environmentVariables.isProduction then
                 printfn "Fragments:"
                 fragments |> Array.iter (fun x -> printfn $"{x}")

             let ogConWords =
                 itemData.ConstructingWordsIndexes
                 |> Array.map (fun conWordIndex -> ogPermutation |> toWords |> Array.item conWordIndex)

             let lowestFragmentLength = // Purely for performance improvements
                 fragments |> Array.map (fun x -> x.Length) |> Array.sort |> Array.head

             langWords
             |> Array.filter (fun langWord ->
                 langWord.Length >= lowestFragmentLength && containsAnyOf fragments langWord)
             //|> Array.map (getStringPermutations jsonInfo.alternativeCharacters jsonInfo.bypassCharacters)
             // |> flatten
             |> Array.exists (fun langWord ->
                 ogConWords
                 |> Array.exists (fun ogConWord -> ogConWord.Contains(langWord)

                 )))
            |> not


    not shouldBlock


let removeNewLines = replaceAllInString "\n" ""


(* let isFalsePositive (langWords: string array) (itemData: ItemData) (ogPermutation: string) =
    // This function assumes that the word has already been found in the string permutation
    // printfn "-------Function being called----------"

    let ogConWords =
        itemData.ConstructingWords
        //|> printFnAndPipe (fun _ -> printfn "Permuting 2")
        |> Array.map (fun conWord ->
            let indexInPermutation =
                itemData.Permutation |> toWords |> Array.findIndex ((=) conWord)

            let ogPermutationWord = Array.get (toWords ogPermutation) indexInPermutation
            printfn "WOW"
            printfn $"{ogPermutationWord}"
            ogPermutationWord)
    (* let permutedLangWords =

        langWords
        //|> printFnAndPipe (fun _ -> printfn "Permuting 1")
        |> Array.filter (fun langWord ->
            (* (
             //printfn "Permuting 3"
             Array.exists
                 (fun (ogConWord: string) -> langWord.Contains(ogConWord))
                 ogConWords) *)
                 Array.exists (fun x )
                 ) *)

    //|> printFnAndPipe (fun x -> printfn $"Amount of items: {x.Length}.")
    (* |> Array.map (getStringPermutations jsonInfo.alternativeCharacters jsonInfo.bypassCharacters)
        //|> printFnAndPipe (fun _ -> "Wow 1")
        |> flatten
        |> fun x ->
            printfn $"START: {x.Length}"
            x |> Array.iter (fun m -> printfn $"{m}")
            printfn "END"
            x *)


    let shouldBlock =
        if itemData.BlacklistItem.StartsWith("_") then
            true
        else if length itemData.ConstructingWords = 1 then
            if not environmentVariables.isProduction then
                printfn "a"
            //printfn "Wow 3"
            let conWord = itemData.ConstructingWords |> Array.head

            if conWord.Length = 2 then // Things like "tf", etc
                // Only block if the letters are found back-to-back, not in a word
                // First, check if any of the words in ogPerm. are equal to it
                // If not, check if you add all the single letters up, it is included in there
                (ogPermutation |> toWords |> Array.exists ((=) itemData.ItemFound))
                || (ogPermutation
                    |> toWords
                    |> Array.filter (fun ogWord -> ogWord.Length = 1)
                    |> String.concat ""
                    |> fun res -> res.Contains(itemData.ItemFound))


            //printfn "Wow 4"
            else
                ((langWords
                  |> Array.filter (fun langWord -> langWord.Contains(itemData.ItemFound))
                  |> Array.map (getStringPermutations jsonInfo.alternativeCharacters jsonInfo.bypassCharacters)
                  |> flatten
                  |> printFnAndPipe (fun x -> x |> Array.iter (fun m -> printfn $"{m}"))
                  //|> printFnAndPipe (fun _ -> printfn "Wow 5")
                  |> Array.exists (fun langWord -> conWord.Contains(langWord)))
                 //|> printFnAndPipe (fun _ -> printfn "Wow 6")
                 |> not)
                || itemData.ItemFound = conWord

        else
        // This means the multiple words make up the bad word found.

        // First, check if attempted bypass

        if
            (let shortWordsCheck = // false = don't block because of this; true = do block
                // Checks that:
                // - All conWords are less than 3 chars
                // - All chars in conWord are letters
                // - At least 1 of the conWords that are 2 chars are existing words
                let allAreLessThan3 =
                    Array.forall
                        (fun (conWord: string) -> conWord.Length < 3 && isAllChars conWord)
                        itemData.ConstructingWords

                if allAreLessThan3 then
                    if
                        ((Array.exists
                            (fun (conWord: string) -> conWord.Length = 2 && (Array.exists ((=) conWord) langWords))
                            itemData.ConstructingWords))
                    then
                        false
                    else
                        true
                else
                    false


             shortWordsCheck)
        then
            // Means it's like this: w o r d
            if not environmentVariables.isProduction then
                printfn "b"

            true
        else
            // Could be legit. Check if there are any language words in it
            if not environmentVariables.isProduction then
                printfn "c"

            (

             let firstFragment =
                 getFragmentInWord itemData.ItemFound true (Array.head itemData.ConstructingWords)

             let otherFragments =
                 itemData.ConstructingWords
                 |> Array.skip 1 // We already got that
                 |> Array.map (getFragmentInWord itemData.ItemFound false)
                 |> Array.toList

             let fragments = (List.rev >> List.toArray) (firstFragment :: otherFragments)

             if not environmentVariables.isProduction then
                 printfn "Fragments:"
                 fragments |> Array.iter (fun x -> printfn $"{x}")

             langWords
             |> Array.filter (fun langWord -> langWord |> containsAnyOf fragments)
             |> Array.map (getStringPermutations jsonInfo.alternativeCharacters jsonInfo.bypassCharacters)
             |> flatten
             |> Array.exists (fun langWord ->
                 itemData.ConstructingWords
                 |> Array.exists (fun conWord ->
                     let res = conWord.Contains(langWord)

                     if res && not environmentVariables.isProduction then
                         printfn $"The stopping langWord: {langWord}"

                     res)))
            |> not


    not shouldBlock

 *)
