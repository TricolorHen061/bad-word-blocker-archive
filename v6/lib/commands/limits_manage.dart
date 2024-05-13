import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import 'package:fpdart/fpdart.dart';

Future<void> limitsManageCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  String toMinutesString(Option<int> input) =>
      input.map((t) => "$t minutes").getOrElse(() => "forever");
  String toActionString(String input) =>
      input.startsWith("role") ? "mute role" : input;
  final dropDownOptions = (await getGuildLimits(guild.id))
      .sortBy(Order.from((a1, a2) => a1.amount - a2.amount))
      .map((data) => MultiselectOptionBuilder(
          "${data.amount} strikes, ${toActionString(data.action)}, ${toMinutesString(data.minutes)}",
          data.amount.toString()));
  if (dropDownOptions.isNotEmpty) {
    final componentMessageBuilder = ComponentMessageBuilder()
      ..componentRows = [
        ComponentRowBuilder()
          ..addComponent(MultiselectBuilder("remove_limits", dropDownOptions)
            ..placeholder = "Click here"
            ..maxValues = dropDownOptions.length)
      ]
      ..embeds = [
        EmbedBuilder()
          ..title = "Limits"
          ..description =
              """Please press the box below to view current limits for this server.
To remove limits, select them and then select the box again."""
          ..color = blueEmbedColor
      ];
    await event.respond(componentMessageBuilder, hidden: true);
  } else {
    final embedBuilder = EmbedBuilder()
      ..title = "No Limits"
      ..description =
          "This server currently has no limits. Use `/limits add` to create one."
      ..color = blueEmbedColor;
    await event.respond(MessageBuilder.embed(embedBuilder), hidden: true);
  }
}
