import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/wrappers/database_dataclasses.dart';
import 'package:fpdart/fpdart.dart';
import 'package:mongo_dart/mongo_dart.dart';
import 'package:nyxx/nyxx.dart';

String getCollectionName(DatabaseCollections collectionType) =>
    switch (collectionType) {
      InexactMatch() => "inwordmatch_words",
      Phrases() => "bad_phrases",
      Links() => "custom_bad_links",
      Bypasses() => "channels_roles_bypasses",
      CustomMessages() => "custom_messages",
      Strikes() => "strikes",
      Limits() => "punishments",
      TimedPunishments() => "timed_punishments",
      Logs() => "logchannels",
      SavedMessages() => "messages",
      PremiumServers() => "premium_servers"
    };

Future<Option<DBResult>> getDbDocument(
    DatabaseCollections collectionType, Snowflake id) async {
  final collectionName = getCollectionName(collectionType);
  final collection = db.collection(collectionName);
  final res =
      Option.fromNullable(await collection.findOne({"_id": id.toString()}));
  return res;
}

Future<WriteResult> setDbDocument(DatabaseCollections collectionType,
    DatabaseWrapper dbWrapper, Snowflake id) async {
  final collectionName = getCollectionName(collectionType);
  final collection = db.collection(collectionName);
  WriteResult res;
  if ((await getDbDocument(collectionType, id)).isNone()) {
    res = await collection.insertOne(dbWrapper.toMap());
  } else {
    res =
        await collection.replaceOne({"_id": id.toString()}, dbWrapper.toMap());
  }
  return res;
}

Future<WriteResult> deleteDbDocument(
    DatabaseCollections collectionType, Snowflake id) async {
  final collectionName = getCollectionName(collectionType);
  final collection = db.collection(collectionName);
  return await collection.deleteOne({"_id": id.toString()});
}
