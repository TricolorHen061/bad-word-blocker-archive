import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import 'package:fpdart/fpdart.dart';

Future<void> blacklistUndoContinueButtonHandler(
    IButtonInteractionEvent event, Cacheable<Snowflake, IGuild> guild) async {
  final previousBlacklistOpt = previousBlacklists.lookup(guild.id);
  switch (previousBlacklistOpt) {
    case Some(value: final previousBlacklist):
      {
        await saveBlacklist(previousBlacklist.words, previousBlacklist.phrases,
            previousBlacklist.links, guild.id);
        final messageBuilder = ComponentMessageBuilder()
          ..embeds = [
            EmbedBuilder()
              ..title = "Blacklist Reverted"
              ..description =
                  "The blacklist has been reverted to it's previous state."
              ..color = greenEmbedColor
          ]
          ..componentRows = [];
        await event.respond(messageBuilder, hidden: true);
      }
    case None():
      {
        final messageBuilder = ComponentMessageBuilder()
          ..embeds = [
            EmbedBuilder()
              ..title = "Expired"
              ..description = "Unfortunately, you are no longer able to do this"
              ..color = greyEmbedColor
          ]
          ..componentRows = [];
        await event.respond(messageBuilder, hidden: true);
      }
  }
}
