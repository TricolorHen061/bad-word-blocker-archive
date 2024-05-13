import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import 'package:fpdart/fpdart.dart';

Future<void> removeLimitsMultiselectHandler(
    IMultiselectInteractionEvent event, Guild guild) async {
  final limitAmountsToRemove = event.interaction.values;
  for (final limitAmount in limitAmountsToRemove) {
    await removePunishment(int.parse(limitAmount), guild.id);
  }

  final previousDescription =
      event.interaction.message!.embeds.elementAt(0).description!;
  final previousSelectMenu = (event.interaction.message!.components
      .elementAt(0)
      .elementAt(0) as IMessageMultiselect);
  final nextSelectMenuOptions = previousSelectMenu.options
      .filter((t) => limitAmountsToRemove.notElem(t.value))
      .map((e) => MultiselectOptionBuilder(e.label, e.value));
  final messageBuilder = ComponentMessageBuilder()
    ..embeds = [
      EmbedBuilder()
        ..title = "Limits Successfully Removed"
        ..description =
            "$previousDescription\n**- ${limitAmountsToRemove.length} limit(s) removed**"
        ..color = greenEmbedColor
    ]
    ..componentRows = [
      ComponentRowBuilder()
        ..addComponent(
            MultiselectBuilder("remove_limits", nextSelectMenuOptions)
              ..placeholder = "Click here"
              ..maxValues = nextSelectMenuOptions.length)
    ];
  if (nextSelectMenuOptions.isNotEmpty) {
    await event.respond(messageBuilder, hidden: true);
  } else {
    final messageBuilder = ComponentMessageBuilder()
      ..embeds = [
        EmbedBuilder()
          ..title = "All Limits Removed"
          ..description = "All server limits have been removed."
          ..color = greenEmbedColor
      ]
      ..componentRows = [];
    await event.respond(messageBuilder, hidden: true);
  }
}
