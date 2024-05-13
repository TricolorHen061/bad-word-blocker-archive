import 'package:bad_word_blocker_dart/components/multi_select/remove_channels.dart';
import 'package:bad_word_blocker_dart/components/multi_select/remove_limits.dart';
import 'package:bad_word_blocker_dart/components/multi_select/remove_premium_servers.dart';
import 'package:bad_word_blocker_dart/components/multi_select/remove_roles.dart';
import 'package:bad_word_blocker_dart/globals.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> onSelectMenuInteraction(IMultiselectInteractionEvent event) async {
  if (!botIsReady) return;
  print("------------Multi Select Menu interaction event being run--------");
  if (Option.fromNullable(event.interaction.guild)
      case Some(value: final guild)) {
    switch (event.interaction.customId) {
      case "remove_roles":
        await removeRolesMultiSelectHandler(event, guild);
      case "remove_channels":
        await removeChannelsMultiSelectHandler(event, guild);
      case "remove_limits":
        await removeLimitsMultiselectHandler(event, guild);
      case "remove_premium_servers":
        await removePremiumServersMultiselectHandler(event, guild);
    }
  }
}
