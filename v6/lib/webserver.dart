import 'package:bad_word_blocker_dart/globals.dart';
import 'package:shelf_router/shelf_router.dart';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as io;

final _bindIp = isProduction ? "134.209.79.35" : "0.0.0.0";

Future<void> startWebserver() async {
  var app = Router();

  app.get("/patreon", (Request request) async {
    print(await request.readAsString());
  });

  print("Started webserver");

  await io.serve(app, _bindIp, 5000);
}
