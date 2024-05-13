import 'package:bad_word_blocker_dart/components/buttons/add_premium_server.dart';
import 'package:bad_word_blocker_dart/components/buttons/blacklist_retry.dart';
import 'package:bad_word_blocker_dart/components/buttons/blacklist_undo.dart';
import 'package:bad_word_blocker_dart/components/buttons/blacklist_undo_continue.dart';
import 'package:bad_word_blocker_dart/components/buttons/cancel.dart';
import 'package:bad_word_blocker_dart/components/buttons/manage_bypass_channels.dart';
import 'package:bad_word_blocker_dart/components/buttons/manage_bypass_roles.dart';
import 'package:bad_word_blocker_dart/components/buttons/select_servers_to_remove.dart';
import 'package:bad_word_blocker_dart/globals.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

void onButtonInteractionEvent(IButtonInteractionEvent event) async {
  if (!botIsReady) return;
  print("------------Button interaction event being run--------");
  if (Option.fromNullable(event.interaction.guild)
      case Some(value: final guild)) {
    switch (event.interaction.customId) {
      case "retry_blacklist":
        await blacklistRetryButtonHandler(event, guild);
      case "undo_blacklist":
        await blacklistUndoButtonHandler(event, guild);
      case "blacklist_undo_continue":
        await blacklistUndoContinueButtonHandler(event, guild);
      case "cancel":
        await cancelButtonHandler(event, guild);
      case "manage_bypass_roles":
        await manageBypassRolesButtonHandler(event, guild);
      case "manage_bypass_channels":
        await manageBypassChannelsButtonHandler(event, guild);
      case "add_premium_server":
        await addPremiumServerButtonHandler(event, guild);
      case "select_servers_to_remove":
        await event.acknowledge(hidden: true);
        await selectServersToRemoveButtonHandler(event, guild);
    }
  }
}
