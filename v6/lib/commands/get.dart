import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> getCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final lastDeletedMessageOpt =
      await getSavedMessage(event.interaction.userAuthor!.id, guild.id);
  if (lastDeletedMessageOpt case Some(value: final lastDeletedMessage)) {
    final isBlacklistedItemsExist =
        lastDeletedMessage.blacklistedItems.isNotEmpty;
    final blacklistItemsField =
        "`${lastDeletedMessage.blacklistedItems.join("`, `")}`";
    final embed = EmbedBuilder()
      ..title = "Last Deleted Message"
      ..addField(
          name: "Deleted At", content: lastDeletedMessage.deletedAt.toString())
      ..addField(
          name: "Deleted For:",
          content: isBlacklistedItemsExist
              ? "Containing blacklisted item(s): $blacklistItemsField"
              : "<Deleted by automod, unknown>")
      ..addField(
          name: "Content", content: "```${lastDeletedMessage.content}```")
      ..color = blueEmbedColor;
    //..footer = EmbedFooterBuilder(text: isAutomodRulesPresent ? "Does not reflect built-in automod" : null);
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  } else {
    final embed = EmbedBuilder()
      ..title = "No Message"
      ..description = "You haven't gotten any messages deleted in this server."
      ..color = blueEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  }
}
