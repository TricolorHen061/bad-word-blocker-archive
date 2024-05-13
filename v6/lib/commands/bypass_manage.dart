import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> bypassManageCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final messageBuilder = ComponentMessageBuilder()
    ..embeds = [
      EmbedBuilder()
        ..title = "Manage Bypasses"
        ..description =
            "Would you like to manage bypass roles or bypass channels?"
        ..color = blueEmbedColor
    ]
    ..componentRows = [
      ComponentRowBuilder()
        ..addComponent(
            ButtonBuilder("Roles", "manage_bypass_roles", ButtonStyle.primary))
        ..addComponent(ButtonBuilder(
            "Channels", "manage_bypass_channels", ButtonStyle.primary))
    ];
  await event.respond(messageBuilder, hidden: true);
}
