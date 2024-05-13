import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/handlers/message.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';

void onMessageReceived(IMessageReceivedEvent event) async {
  if (!botIsReady || event.message.author.bot) return;
  final dataNeeded = (
    Option.fromNullable(event.message.guild),
    Option.fromNullable(event.message.member)
  );
  if (dataNeeded case (Some(value: final guild), Some(value: final member))) {
    await handleGuildMessage(event.message, guild.id, member);
  }
}
