import { readFileSync, writeFileSync } from "fs";

import path from "path";
import protobufjs from "protobufjs";

const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  };
  

  const PROTO_PATH = path.join(__dirname, "/client.proto");
  const root = protobufjs.parse(readFileSync(PROTO_PATH, "utf8"), options).root;
  writeFileSync("client.proto.json", JSON.stringify(root.toJSON(), null, 2));