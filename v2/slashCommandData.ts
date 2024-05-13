import * as functions from "./functions"
import * as variables from "./variables"

export function getSlashCommandData() { 
    return [
    functions.createSlashCommandData(
        "ping",
        "Pings the bot"
    ),
    functions.createSlashCommandData(
        "log",
        "Manages the log channel for this server",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "set",
                "Sets a log channel",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["channel"],
                        "channel",
                        "Channel that will receive logs",
                        true,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "remove",
                "Removes the existing log channel",
                null,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "cleanup",
        "Manages whether Bad Word Blocker will delete it's own messages when it blocks a bad word",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "set",
                "Makes Bad Word Blocker delete its own message when it blocks a word",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["number"],
                        "seconds",
                        "Amount of seconds Bad Word Blocker should wait before deleting its message",
                        true,
                        null,
                        null
                    ),
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "remove",
                "Removes the existing cleanup setting",
                null,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "muterole",
        "Manages the role Bad Word Blocker uses to mute someone",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "set",
                "Sets the role Bad Word Blocker will use for mutes",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["role"],
                        "role",
                        "Role you want Bad Word Blocker to use when muting",
                        true,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "remove",
                "Remove the existing role Bad Word Blocker uses to mute members",
                null,
                null,
                null,
            )
        ]
    ),
    functions.createSlashCommandData(
        "verification",
        "Manages Bad Word Blocker's verification system",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "set",
                "Sets up the verification system",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["channel"],
                        "channel",
                        "Channel where you want Bad Word Blocker to send a prompt in when a user joins",
                        true,
                        null,
                        null
                    ),
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["role"],
                        "role",
                        "Role you want Bad Word Blocker to use when verifing a member",
                        true,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "undo",
                "Undoes the verification system, if already set up",
                null,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "bypass",
        "Allows a role to bypass Bad Word Blocker's filter",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "add",
                "Adds a role to the bypass list for this server",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["role"],
                        "role",
                        "Role you want to add to the bypass list",
                        true,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "remove",
                "Removes a role from the bypass list for this server",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["role"],
                        "role",
                        "Role you want to remove from the bypass list",
                        true,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "view",
                "View roles that are bypassing by the bot", 
                null,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "ignore",
        "Allows a channel to bypass Bad Word Blocker's filter",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "add",
                "Adds a channel to the ignored list",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["channel"],
                        "channel",
                        "Channel you want to add to the ignored list",
                        true,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "remove",
                "Removes a channel from the ignored list",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["channel"],
                        "channel",
                        "Channel you want to remove from the ignored list",
                        true,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "view",
                "View channels that are being ignored by the bot", 
                null,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "advertise",
        "Creates an invite and sends it in the advertising channel in the Bad Word Blocker server",
        null
    ),
    functions.createSlashCommandData(
        "mute",
        "Mutes a member",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["user"],
                "member",
                "Member you want to mute",
                true,
                null,
                null
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["string"],
                "reason",
                "Reason why you're muting",
                false,
                null,
                null
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["number"],
                "hours",
                "Hours to wait before unmuting the member. Can't be 0 or below 0.",
                false,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "unmute",
        "Unmutes a muted member",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["user"],
                "member",
                "Member you want to unmute",
                true,
                null,
                null
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["string"],
                "reason",
                "Reason why you're unmuting",
                false,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "ban",
        "Bans a member",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["user"],
                "member",
                "Member you want to ban",
                true,
                null,
                null
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["string"],
                "reason",
                "Reason why you're banning",
                false,
                null,
                null
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["number"],
                "minutes",
                "Number of minutes to wait before unbanning the member.",
                false,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "unban",
        "Unbans a banned member",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["string"],
                "username",
                "Username of the banned member",
                true,
                null,
                null
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["string"],
                "tag",
                "Tag of the member",
                true,
                null,
                null
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["string"],
                "reason",
                "Reason why you're unbanning",
                false,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "warn",
        "Warns a member and adds one strike to them",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["user"],
                "member",
                "Member you want to warn",
                true,
                null,
                null
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["string"],
                "reason",
                "Reason why you're warning",
                false,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "kick",
        "Kicks a member",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["user"],
                "member",
                "Member you want to kick",
                true,
                null,
                null
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["string"],
                "reason",
                "Reason why you're kicking",
                false,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "clear",
        "Clears messages from a channel",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["number"],
                "amount",
                "Amount of messages to clear",
                true,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "analytics",
        "Shows analytics for the server",
        null,
        null
    ),
    functions.createSlashCommandData(
        "limits",
        "Sets a new limit on the strikes a member can get",
        [
            functions.createSlashCommandOption(
            variables.slashCommandOptionTypes["subCommand"],
                "add",
                "Adds a strike limit",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["number"],
                        "amount",
                        "Amount of strikes that should trigger the action",
                        true,
                        null,
                        null
                    ),
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["string"],
                        "action",
                        "What Bad Word Blocker should do when the amount of strikes is reached",
                        true,
                        [
                            functions.createSlashCommandChoice(
                                "timeout",
                                "timeout"
                            ),
                            functions.createSlashCommandChoice(
                                "kick",
                                "kick"
                            ),
                            functions.createSlashCommandChoice(
                                "ban",
                                "ban"
                            )
                        ],
                        null
                    ),
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["number"],
                        "minutes",
                        "Amount of minutes before undoing the action. Only applicable with \"timeout\" and \"ban\".",
                        false,
                        null,
                        null,
                        null
                    )
                ]

            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "remove",
                "Removes an existing limit",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["string"],
                        "limit",
                        "The limit you want to remove from limits",
                        true,
                        null,
                        null,
                        true
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "view",
                "View the current limits this server has",
                null,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "change",
        "Changes a member's strikes",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["user"],
                "member",
                "Member's strikes to change",
                true,
                null,
                null
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["number"],
                "amount",
                "Amount of strikes to set their strikes to",
                true,
                [],
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "invite",
        "Sends an invite to invite Bad Word Blocker to a server",
        null,
        null
    ),

    functions.createSlashCommandData(
        "view",
        "View how many strikes a member has",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["user"],
                "member",
                "Member's whose strikes you want to see",
                false,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "vote",
        "Sends a link to vote for Bad Word Blocker",
        null,
        null
    ),
    functions.createSlashCommandData(
        "get",
        "Sends you the last blocked message from a person",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["user"],
                "member",
                "Member whose last blocked message you want to see",
                null,
                null,
                null
            )
        ],
        null
    ),
    functions.createSlashCommandData(
        "servercount",
        "Shows how many servers Bad Word Blocker is in",
        null,
        null
    ),
    functions.createSlashCommandData(
        "suggestion",
        "Sends a suggestion to the Bad Word Blocker team",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["string"],
                "suggestion",
                "The suggestion you want to send to the Bad Word Blocker team",
                true,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "permissions",
        "Shows common permission problems",
        null,
        null
    ),
    functions.createSlashCommandData(
        "joke",
        "Manages jokes on embeds",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "add",
                "Submits a joke",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["string"],
                        "joke",
                        "Joke you want to submit",
                        true,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "remove",
                "Removes a joke that has been submitted and not yet approved or denied",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["string"],
                        "jokes",
                        "Numbers of the jokes, seperated by spaces",
                        true,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "view",
                "Views jokes that have not been submitted and not yet approved or denied",
                null,
                null,
                null
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "pending",
                "Show all pending jokes",
                false,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["number"],
                        "page",
                        "Page you want to view",
                        false,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "approve",
                "Approves a joke",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["number"],
                        "user",
                        "Number of the user",
                        true,
                        null,
                        null
                    ),
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["number"],
                        "joke",
                        "Number of the joke you want to approve",
                        true,
                        null,
                        null
                    )
                ]
            )
        ]
    ),
    functions.createSlashCommandData(
        "custom",
        "Manages custom messages",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "set",
                "Sets a custom message the bot will send when it blocks a word",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                    variables.slashCommandOptionTypes["string"],
                    "content",
                    "What the message will say. Placeholders: {username}, {tag}, {mention}, {deleted_message} {strikes}",
                    true,
                    null,
                    null
                    ),
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["boolean"],
                        "is_embed",
                        "Whether or not the bot should send the message as an embed",
                        false,
                        null,
                        null
                    ),
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["number"],
                        "color",
                        "If embed option chosen, this is the hex code of the color the embed should be",
                        false,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "remove",
                "If a custom embed was already set, removes the it and switches back to default",
                null,
                null,
                null
            )
        ]
    ),
    functions.createSlashCommandData(
        "settings",
        "Adjusts small settings",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["string"],
                "setting",
                "Setting you want to modify",
                true,
                [
                    functions.createSlashCommandChoice(
                        "Admins bypass bot",
                        "admin"
                    ),
                    functions.createSlashCommandChoice(
                        "Send help embed when someone sends message containing \"/\"",
                        "respondToSlash"
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["boolean"],
                "enabled",
                "Whether to enable to disable this setting",
                true,
                null,
                null,
            )
        ]
    ),
    functions.createSlashCommandData(
        "blacklist",
        "Manage all sections",
       [
           functions.createSlashCommandOption(
               variables.slashCommandOptionTypes["subCommand"],
               "add",
               "Add to the server blacklist",
               null,
               null,
               [
                   functions.createSlashCommandOption(
                       variables.slashCommandOptionTypes["string"],
                        "type",
                        "Type of items to add to the server blacklist",
                        true,
                        [
                            functions.createSlashCommandChoice(
                                "words (individual words)",
                                "words",
                            ),
                            functions.createSlashCommandChoice(
                                "phrases (set of words)",
                                "phrase"
                            ),
                            functions.createSlashCommandChoice(
                                "link (website links)",
                                "link"
                            )
                        ]
                   ),
                   functions.createSlashCommandOption(
                    variables.slashCommandOptionTypes["string"],
                    "items",
                    "words, phrases, or links to add, seperated by commas",
                    true,
                    null,
                    null
                )
               ]
           ),
           functions.createSlashCommandOption(
               variables.slashCommandOptionTypes["subCommand"],
               "remove",
               "Remove from the server blacklist",
               null,
               null,
               [
                   functions.createSlashCommandOption(
                       variables.slashCommandOptionTypes["string"],
                       "type",
                       "Types of items to remove from the server blacklist",
                       true,
                        [
                            functions.createSlashCommandChoice(
                                "words (individual words)",
                                "words",
                            ),
                            functions.createSlashCommandChoice(
                                "phrases (set of words)",
                                "phrase"
                            ),
                            functions.createSlashCommandChoice(
                                "link (website links)",
                                "link"
                            )
                        ],
                   ),
                   functions.createSlashCommandOption(
                       variables.slashCommandOptionTypes["string"],
                       "items",
                       "words, phrases, or links to remove from the selected section type, seperated by commas",
                       true,
                       null,
                       null
                    )
               ]
           ),
           functions.createSlashCommandOption(
               variables.slashCommandOptionTypes["subCommand"],
               "view",
               "View the server blacklist",
               null,
               null
           ),
           functions.createSlashCommandOption(
               variables.slashCommandOptionTypes["subCommand"],
               "clear",
               "Remove every item from a section",
               null,
               null,
               [
                functions.createSlashCommandOption(
                    variables.slashCommandOptionTypes["string"],
                    "section",
                    "Section of type of item you want to remove",
                    true,
                    [
                     functions.createSlashCommandChoice(
                         "exact-match words",
                         "exactmatch",
                     ),
                     functions.createSlashCommandChoice(
                         "in-word-match words",
                         "inwordmatch",
                     ),
                     functions.createSlashCommandChoice(
                         "phrases",
                         "phrase"
                     ),
                     functions.createSlashCommandChoice(
                         "links",
                         "link"
                     )
                    ]
                )
               ]
           ),
           functions.createSlashCommandOption(
               variables.slashCommandOptionTypes["subCommand"],
               "reset",
               "Revert back to the default set of items in a section",
               null,
               null,
               [
                   functions.createSlashCommandOption(
                       variables.slashCommandOptionTypes["string"],
                       "section",
                       "Section of type of item you want to reset to defaults",
                       true,
                       [
                        functions.createSlashCommandChoice(
                            "exact-match words",
                            "exactmatch",
                        ),
                        functions.createSlashCommandChoice(
                            "in-word-match words",
                            "inwordmatch",
                        ),
                        functions.createSlashCommandChoice(
                            "phrases",
                            "phrase"
                        ),
                        functions.createSlashCommandChoice(
                            "links",
                            "link"
                        )
                       ]
                   ),
                   functions.createSlashCommandOption(
                       variables.slashCommandOptionTypes["string"],
                       "language",
                       "Language of preset",
                       true,
                       [
                           functions.createSlashCommandChoice(
                               "English",
                               "en"
                           )
                       ],
                       null
                   )
               ]
           )
       ]
    ),
    functions.createSlashCommandData(
        "strikes",
        "Manage strikes",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "view",
                "View a member's strikes",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                    variables.slashCommandOptionTypes["user"],
                    "member",
                    "Member's whose strikes you want to see",
                    false,
                    null,
                    null
                    )
                ]
            ),

            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "change",
                "Change a member's strikes",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["user"],
                        "member",
                        "Member's strikes to change",
                        true,
                        null,
                        null
                    ),
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["number"],
                        "amount",
                        "Amount of strikes to set their strikes to",
                        true,
                        null,
                        null
                    )
                ]
            )
        ]
    ),
    functions.createSlashCommandData(
        "timeout",
        "Timeout a member",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "add",
                "Timeout a member",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["user"],
                        "member",
                        "member to timeout",
                        true,
                        null,
                        null
                    ),
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["integer"],
                        "minutes",
                        "Minutes to wait before undoing the timeout",
                        true,
                        null,
                        null
                    ),
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["string"],
                        "reason",
                        "Reason for the timeout",
                        false,
                        null,
                        null
                    )
                ]
            ),

            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "undo",
                "Undo a timeout",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["user"],
                        "member",
                        "member whose timeout you want to undo",
                        true,
                        null,
                        null
                    ),
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["string"],
                        "reason",
                        "Reason for undoing the timeout",
                        false,
                        null,
                        null
                    )
                ]
            )

        ]
    ),
    functions.createSlashCommandData(
        "help",
        "Get help with the bot",
        null
    ),
    functions.createSlashCommandData(
        "filterbot",
        "Automatically delete a bot's message after 50 seconds",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "add",
                "Add a bot",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["user"],
                        "bot",
                        "Bot whose messages should be deleted after 50 seconds",
                        true,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "remove",
                "Remove a bot",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["user"],
                        "bot",
                        "Bot whose messages should not be deleted after 50 seconds",
                        true,
                        null,
                        null
                    )
                ]
            )            
        ]
    ),
    functions.createSlashCommandData(
        "commandchannel",
        "Tells bot to delete everything in a channel except commands",
        [
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "add",
                "Adds a channel",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["channel"],
                        "channel",
                        "Channel to add",
                        true,
                        null,
                        null
                    )
                ]
            ),
            functions.createSlashCommandOption(
                variables.slashCommandOptionTypes["subCommand"],
                "remove",
                "removes a channel",
                null,
                null,
                [
                    functions.createSlashCommandOption(
                        variables.slashCommandOptionTypes["channel"],
                        "channel",
                        "Channel to remove",
                        true,
                        null,
                        null
                    )
                ]
            )
        ]
    )
]
}