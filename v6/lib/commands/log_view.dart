import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> logViewCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final logChannelIdOpt = await getGuildLogChannel(guild.id);
  switch (logChannelIdOpt) {
    case Some(value: final logChannelId):
      {
        await event.respond(
            MessageBuilder.embed(EmbedBuilder()
              ..title = "Log Channel"
              ..description = "The current log channel is <#$logChannelId>"
              ..color = blueEmbedColor),
            hidden: true);
      }
    case None():
      {
        await event.respond(
            MessageBuilder.embed(EmbedBuilder()
              ..title = "Log Channel"
              ..description =
                  "There is currently no log channel set. Use `/log set` to set one."
              ..color = blueEmbedColor),
            hidden: true);
      }
  }
}
