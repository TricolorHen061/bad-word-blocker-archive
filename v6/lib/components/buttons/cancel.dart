import 'package:bad_word_blocker_dart/globals.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> cancelButtonHandler(
    IButtonInteractionEvent event, Cacheable<Snowflake, IGuild> guild) async {
  final embedBuilder = ComponentMessageBuilder()
    ..embeds = [
      EmbedBuilder()
        ..title = "Canceled"
        ..description = "Canceled."
        ..color = greyEmbedColor
    ]
    ..componentRows = [];

  await event.respond(embedBuilder, hidden: true);
}
