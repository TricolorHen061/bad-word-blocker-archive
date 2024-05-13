import 'package:bad_word_blocker_dart/globals.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import 'package:fpdart/fpdart.dart';

Future<void> blacklistUndoButtonHandler(
    IButtonInteractionEvent event, Cacheable<Snowflake, IGuild> guild) async {
  final isInRecord = previousBlacklists.lookup(guild.id).isSome();
  if (isInRecord) {
    final messageBuilder = ComponentMessageBuilder()
      ..embeds = [
        EmbedBuilder()
          ..title = "Are you sure?"
          ..description =
              """Are you sure you want to revert the blacklist to it's previous state?
              If you continue, you will not be able to undo this change."""
          ..color = yellowEmbedColor
      ]
      ..componentRows = [
        ComponentRowBuilder()
          ..addComponent(ButtonBuilder(
              "Continue", "blacklist_undo_continue", ButtonStyle.danger))
          ..addComponent(
              ButtonBuilder("Cancel", "cancel", ButtonStyle.secondary))
      ];
    await event.respond(messageBuilder, hidden: true);
  } else {
    final messageBuilder = ComponentMessageBuilder()
      ..embeds = [
        EmbedBuilder()
          ..title = "Expired"
          ..description = "Sorry, you are no longer able to retry this."
          ..color = greyEmbedColor
      ]
      ..componentRows = [];
    await event.respond(messageBuilder, hidden: true);
  }
}
