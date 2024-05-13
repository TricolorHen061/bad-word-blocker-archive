module Types

open Discord
open Discord.WebSocket
open System.Collections.Generic

type DbCollections =
    | ExactMatch
    | InexactMatch
    | Links
    | Phrases
    | Bypasses
    | Strikes
    | Limits
    | TimedPunishments
    | CustomMessages
    | Logs
    | MessageSave
    | Extras
    | CustomEmbedWord

type DbType<'T> =
    | DbArray of 'T array
    | DbString of string

type DbCollectionInfo =
    { CollectionName: string
      KeyName: string }

type Colors =
    | Blue
    | Green
    | Red
    | Yellow
    | Custom of int

type ExactMatchData =
    { _id: string
      badwordlist: string array }

type InexactMatchData = { _id: string; words: string array }

type PhrasesData = { _id: string; phrases: string array }

type LinksData = { _id: string; Links: string array }

type BypassKeyData =
    { channels: string array
      roles: string array }

type BypassData =
    { _id: string; bypasses: BypassKeyData }

type StrikeKeyData = Dictionary<string, int>

type StrikesData = { _id: string; strikes: StrikeKeyData }

type LimitKeyData = { action: string; minutes: int }

type LimitData =
    { _id: string
      punishments: Dictionary<string, LimitKeyData> }

type PunishmentData =
    { Action: string
      Amount: int
      Minutes: int }

type TimedPunishmentEntry = // Update DB to work with this
    { undoAt: string
      guildId: string
      memberId: string
      action: string }

type TimedPunishmentsData =
    { _id: string
      entries: TimedPunishmentEntry array }

type CustomMessagesKeyData = // Update DB to work with this
    { content: string
      color: int
      title: string
      cleanup: int }

type CustomMessagesData =
    { _id: string
      info: CustomMessagesKeyData }

type LogsData = { _id: string; Channel: string }

type MessageSaveValueData = // Update DB to work with this
    { content: string
      time: string
      blacklistedItem: string }

type MessageSaveData =
    { _id: string
      message_info: Dictionary<string, MessageSaveValueData> }

type ExtrasDataValueData = // Update DB to work with this
    { command_channels: string array
      cleanup_bots: string array array }

type ExtrasData =
    { _id: string
      data: Dictionary<string, ExtrasDataValueData> }

type JsonInfoData =
    { wordExceptions: string array
      bypassCharacters: string array
      alternativeCharacters: Map<string, string>
      timeoutLimit: int
      banLimit: int
      roleLimit: int
      topggToken: string
      defaultBlacklist: {| en: {| inexactmatch: string array |} |}
      specialFeaturesServerIds: {| moderateBots: string array |} }

type EnvironmentVariablesData =
    { token: string
      isProduction: bool
      dbAddress: string }

type SlashCommandOptionType =
    | SubCommand
    | Channel of ChannelType list
    | Role
    | User
    | Number of (double * double) option
    | String of (string * string) array option

type SlashCommandOptionData =
    { OptionType: SlashCommandOptionType
      Name: string
      Description: string
      Required: bool
      Options: SlashCommandOptionData array }

type DiscordSlashCommandData =
    { Name: string
      Description: string
      Options: SlashCommandOptionData array
      DefaultPermission: GuildPermission option }

type SelectMenuOptionData =
    { CustomId: string
      Label: string
      Description: string }

type SelectMenuData =
    { CustomId: string
      Placeholder: string
      MinValues: int
      MaxValues: int
      Options: SelectMenuOptionData array }

type ButtonData =
    { Label: string
      CustomId: string option
      Style: ButtonStyle
      Url: string option }

type EmbedData =
    { Title: string
      Description: string
      Footer: string Option
      Color: Colors }

type TextInputStyle =
    | Short
    | Paragraph

type TextInput =
    { Label: string
      CustomId: string
      Required: bool
      Placeholder: string option
      Style: TextInputStyle
      Value: string option
      MaxLength: int option
      MinLength: int option }

type ModalData =
    { Title: string
      CustomId: string
      TextInputs: TextInput array }

type MessageType =
    | Text of string
    | Embed of EmbedData
    | Modal of ModalData

type ComponentData =
    { Buttons: ButtonData array option
      SelectMenu: SelectMenuData option }

type ResponseType =
    | Interaction of SocketInteraction * bool option // Bool is if it's ephemeral, option because it doesn't always apply
    | Channel of ISocketMessageChannel

type MessageData =
    { MessageType: MessageType
      Components: ComponentData option }

type BlacklistModal =
    { Words: string array
      Links: string array
      Phrases: string array }

type FilterData =
    { BypassChars: string array
      AltChars: Map<string, string>
      BadWords: string array
      LanguageWords: string array
      BadPhrases: string array
      BadLinks: string array }

type BlacklistItemType =
    | Word
    | Link
    | Phrase

type ItemData =
    { ItemFound: string
      BlacklistItem: string
      ConstructingWords: string array
      ItemType: BlacklistItemType
      Permutation: string
      ConstructingWordsIndexes: int array }

type StringAnalysisData =
    { Original: string
      ItemsFound: ItemData }


// For custom requests by people

type CustomEmbedWordData = { _id: string; word: string }
