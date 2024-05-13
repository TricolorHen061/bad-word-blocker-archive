import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:bad_word_blocker_dart/utils/wrappers/database.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> removeRolesMultiSelectHandler(
    IMultiselectInteractionEvent event, Guild guild) async {
  final roleIdsToRemove = event.interaction.values;
  final bypasses = await getGuildBypasses(guild.id);
  for (final roleId in roleIdsToRemove) {
    bypasses.roles.remove(roleId);
  }
  await setDbDocument(Bypasses(), bypasses, guild.id);
  final previousDescription =
      event.interaction.message!.embeds.elementAt(0).description!;
  final previousSelectMenu = (event.interaction.message!.components
      .elementAt(0)
      .elementAt(0) as IMessageMultiselect);
  final nextSelectMenuOptions = previousSelectMenu.options
      .filter((t) => roleIdsToRemove.notElem(t.value))
      .map((e) => MultiselectOptionBuilder(e.label, e.value));
  final messageBuilder = ComponentMessageBuilder()
    ..embeds = [
      EmbedBuilder()
        ..title = "Roles Successfully Removed"
        ..description =
            "$previousDescription\n**- ${roleIdsToRemove.length} role(s) removed**"
        ..color = greenEmbedColor
    ]
    ..componentRows = [
      ComponentRowBuilder()
        ..addComponent(MultiselectBuilder("remove_roles", nextSelectMenuOptions)
          ..placeholder = "Click here"
          ..maxValues = nextSelectMenuOptions.length)
    ];
  if (nextSelectMenuOptions.isNotEmpty) {
    await event.respond(messageBuilder, hidden: true);
  } else {
    final messageBuilder = ComponentMessageBuilder()
      ..embeds = [
        EmbedBuilder()
          ..title = "All Bypass Roles Removed"
          ..description = "All bypass roles have been removed."
          ..color = greenEmbedColor
      ]
      ..componentRows = [];
    await event.respond(messageBuilder, hidden: true);
  }
}
