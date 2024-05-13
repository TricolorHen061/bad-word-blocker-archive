//import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import 'package:bad_word_blocker_filter/utils.dart';
import 'package:bad_word_blocker_filter/types.dart';

List<String> splitAndTrim(String inputString) =>
    inputString.split(",").map((item) => item.trim()).toList();

Future<void> blacklistModalHandler(
    IModalInteractionEvent event, Guild guild) async {
  final interaction = event.interaction;

  final previousBlacklist = await getBlacklist(guild.id);
  previousBlacklists[guild.id] = previousBlacklist;

  final isPremium = await isPremiumGuild(guild.id);

  final [rawWords, rawPhrases, rawLinks] = [
    (interaction.components[0].first as IMessageTextInput).value,
    (interaction.components[1].first as IMessageTextInput).value,
    (interaction.components[2].first as IMessageTextInput).value
  ];

  Blacklist formattedBlacklist = formatBlacklist((
    words: splitAndTrim(rawWords),
    phrases: splitAndTrim(rawPhrases),
    links: splitAndTrim(rawLinks)
  ));

  final validBlacklist = getValidBlacklist(formattedBlacklist);
  final invalidBlacklist =
      subtractBlacklists(formattedBlacklist, validBlacklist);

  final totalValidItems = validBlacklist.words.length +
      validBlacklist.phrases.length +
      validBlacklist.links.length;
  final isAnyInvalidItems = (invalidBlacklist.words.length +
          invalidBlacklist.phrases.length +
          invalidBlacklist.links.length) !=
      0;

  final baseDescription = """**__Total $totalValidItems Items__**
**Words:** ${validBlacklist.words.length} item(s)
**Phrases:** ${validBlacklist.phrases.length} item(s)
**Links:** ${validBlacklist.links.length} item(s)${!isPremium ? "\n\nTip: Upgrade to [premium]($patreonPremiumLink) to add more items" : ""}""";

  final errorDescription = [
    """\n**__NOTE__**
    The following items were not saved because:\n""",
    if (invalidBlacklist.words.isNotEmpty)
      invalidBlacklist.words.map((e) => "- \"$e\" is not a word").join("\n"),
    if (invalidBlacklist.phrases.isNotEmpty)
      invalidBlacklist.phrases
          .map((e) => "- \"$e\" is not a phrase")
          .join("\n"),
    if (invalidBlacklist.links.isNotEmpty)
      invalidBlacklist.links.map((e) => "- \"$e\" is not a link").join("\n")
  ].join("\n");

  final embed = EmbedBuilder()
    ..title = ":white_check_mark: Blacklist Updated"
    ..description =
        [baseDescription, if (isAnyInvalidItems) errorDescription].join("\n")
    ..color = isAnyInvalidItems ? blueEmbedColor : greenEmbedColor
    ..author = isPremium ? premiumAuthorBuilder : null;

  if (invalidBlacklist.links.isNotEmpty) {
    embed.footer = EmbedFooterBuilder(
        text: "Links must start with \"http://\" or \"https://\"");
  }

  final retryButton =
      ButtonBuilder("Retry", "retry_blacklist", ButtonStyle.secondary);
  final undoButton =
      ButtonBuilder("Undo", "undo_blacklist", ButtonStyle.secondary);

  final componentRow = ComponentRowBuilder();
  final componentMessageBuilder = ComponentMessageBuilder()
    ..componentRows = [componentRow..addComponent(undoButton)]
    ..embeds = [embed];

  if (isAnyInvalidItems) {
    previousInvalidBlacklistAttempts[guild.id] = formattedBlacklist;
    componentRow.addComponent(retryButton);
  }

  await saveBlacklist(validBlacklist.words, validBlacklist.phrases,
      validBlacklist.links, guild.id);

  await event.respond(componentMessageBuilder, hidden: true);
}
