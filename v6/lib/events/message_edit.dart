import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/handlers/message.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';

Future<void> onMessageUpdate(IMessageUpdateEvent event) async {
  if (!botIsReady) return;
  final newMessageOpt = Option.fromNullable(event.updatedMessage);
  if (newMessageOpt case Some(value: final newMessage)) {
    if (newMessage.author.bot) return;
    final dataNeeded = (
      Option.fromNullable(newMessage.member?.guild),
      Option.fromNullable(newMessage.member)
    );
    if (dataNeeded case (Some(value: final guild), Some(value: final member))) {
      await handleGuildMessage(newMessage, guild.id, member);
    }
  }
}
