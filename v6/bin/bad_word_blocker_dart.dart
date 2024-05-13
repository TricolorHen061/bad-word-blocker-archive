import 'package:bad_word_blocker_dart/command_data.dart';
import 'package:bad_word_blocker_dart/events/automoderation_action_execution.dart';
import 'package:bad_word_blocker_dart/events/button_interaction.dart';
import 'package:bad_word_blocker_dart/events/guild_create.dart';
import 'package:bad_word_blocker_dart/events/guild_delete.dart';
import 'package:bad_word_blocker_dart/events/guild_member_add.dart';
import 'package:bad_word_blocker_dart/events/guild_member_remove.dart';
import 'package:bad_word_blocker_dart/events/message_create.dart';
import 'package:bad_word_blocker_dart/events/message_edit.dart';
import 'package:bad_word_blocker_dart/events/modal_interaction.dart';
import 'package:bad_word_blocker_dart/events/multi_select_menu_interaction.dart';
import 'package:bad_word_blocker_dart/events/ready.dart';
import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_filter/english_filter.dart';
import 'package:nyxx/nyxx.dart';

void main(List<String> arguments) async {
  await db.open();
  // await startWebserver();
  initializeFilter(englishWords, bypassCharacters, alternativeCharacters);
  client
    ..registerPlugin(Logging())
    ..registerPlugin(CliIntegration())
    ..registerPlugin(IgnoreExceptions());
  client.connect();

  client.eventsWs.onReady.listen(onReady);
  client.eventsWs.onGuildCreate.listen(onGuildCreate);

  client.eventsWs.onMessageReceived.listen(onMessageReceived);
  client.eventsWs.onMessageUpdate.listen(onMessageUpdate);
  client.eventsWs.onGuildDelete.listen(onGuildDelete);
  client.eventsWs.onGuildMemberAdd.listen(onGuildMemberAdd);
  client.eventsWs.onGuildMemberRemove.listen(onGuildMemberRemove);
  client.eventsWs.onAutoModerationActionExecution
      .listen(onAutoModerationActionExecution);
  client.eventsWs.onRateLimited.listen((event) {
    wait = true;
  });

  interactions.events.onModalEvent.listen(onModalEvent);
  interactions.events.onButtonEvent.listen(onButtonInteractionEvent);
  interactions.events.onMultiselectEvent.listen(onSelectMenuInteraction);

  registerCommands(client, interactions,
      true); // Should be "false" because I don't want to upload every time the bot starts.
  // However, I if I set it to "false", it doesn't register the command handlers.
  // Planning on asking about it
}
